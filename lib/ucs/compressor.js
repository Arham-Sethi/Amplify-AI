// Adaptive context compression with a priority queue and token budgets.
//
// Port of kangaroo/backend/app/core/engine/compressor.py. Behaviour is held
// constant — same priority weights, same protection rules, same artifact
// truncation policy — so the verification suite (CLAUDE.md §15 #1) can run
// the Python and TS implementations on the same inputs and compare token
// counts within ±5%.
//
// Drop order, lowest priority first:
//   1. Message-level summaries (granular, recoverable).
//   2. Topic-level summaries (medium granularity).
//   3. Low-importance entities.
//   4. Artifacts — TRUNCATED, not dropped (keep first N chars then "[truncated]").
//   5. Decisions / Tasks / Global summaries — NEVER dropped (last line of defence).
//
// Why not pull in a heap library: the queue is small (typically <500 items),
// the inline binary heap below is ~30 lines, and avoiding the dep keeps the
// package zero-runtime-dependencies aside from Zod.
import { estimateArtifactTokens, estimateEntityTokens, estimateTokens, } from './tokens.js';
const BASE_WEIGHTS = {
    message_summary: 1.0, // dropped first
    topic_summary: 3.0, // dropped second
    entity: 2.0, // importance-weighted
    artifact: 2.5, // truncated rather than dropped
    global_summary: 10.0, // almost never dropped
    task: 10.0, // never dropped
    decision: 10.0, // never dropped
};
const PROTECTED_CATEGORIES = new Set([
    'decision',
    'task',
    'global_summary',
]);
/**
 * Tiebreaker: lower priority first; on ties, HIGHER index first (newer items
 * are dropped before older ones — matches the Python `self.index > other.index`
 * comparator).
 */
function comparePriority(a, b) {
    if (a.priority !== b.priority)
        return a.priority - b.priority;
    return b.index - a.index;
}
// ── Tiny binary min-heap ──────────────────────────────────────────────────────
// Operations are O(log n). Order is determined by `comparePriority` above.
class MinHeap {
    items = [];
    get size() {
        return this.items.length;
    }
    push(item) {
        this.items.push(item);
        this.siftUp(this.items.length - 1);
    }
    pop() {
        const head = this.items[0];
        const tail = this.items.pop();
        if (this.items.length > 0 && tail !== undefined) {
            this.items[0] = tail;
            this.siftDown(0);
        }
        return head;
    }
    /** Snapshot of heap contents (unordered). */
    toArray() {
        return this.items;
    }
    // Heap internals: every index we touch is one we just verified is in
    // bounds via `i > 0`, `left < n`, `right < n`, etc. The `!` assertions
    // are safe — TS just can't follow our bounds reasoning under
    // `noUncheckedIndexedAccess`. Promoting these to runtime checks would
    // double the heap's instruction count.
    siftUp(i) {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (comparePriority(this.items[i], this.items[parent]) >= 0)
                break;
            [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
            i = parent;
        }
    }
    siftDown(i) {
        const n = this.items.length;
        while (true) {
            const left = 2 * i + 1;
            const right = 2 * i + 2;
            let smallest = i;
            if (left < n && comparePriority(this.items[left], this.items[smallest]) < 0) {
                smallest = left;
            }
            if (right < n && comparePriority(this.items[right], this.items[smallest]) < 0) {
                smallest = right;
            }
            if (smallest === i)
                break;
            [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
            i = smallest;
        }
    }
}
// ── Artifact truncation ───────────────────────────────────────────────────────
/**
 * Truncate an artifact's content to fit within a token budget. Keeps the
 * first N chars and trims back to the most recent newline if at least half
 * the budget has been consumed (preserves whole lines, which matters for
 * code artifacts). Appends a "[truncated]" marker so downstream consumers
 * know there's missing content.
 */
export function truncateArtifact(artifact, maxTokens) {
    const currentTokens = estimateArtifactTokens(artifact);
    if (currentTokens <= maxTokens)
        return artifact;
    const maxChars = maxTokens * 4;
    let truncated = artifact.content.slice(0, maxChars);
    // Trim to the last full line if we kept enough characters to make it
    // worthwhile — otherwise we'd discard half the budget chasing a newline.
    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxChars / 2) {
        truncated = truncated.slice(0, lastNewline);
    }
    // Immutable update — never mutate the input artifact.
    return {
        ...artifact,
        content: `${truncated}\n... [truncated]`,
    };
}
export class CompressionPipeline {
    target_tokens;
    artifact_max_tokens;
    constructor(options = {}) {
        this.target_tokens = options.target_tokens ?? 4000;
        this.artifact_max_tokens = options.artifact_max_tokens ?? 500;
    }
    compress(input = {}) {
        const summaries = input.summaries ?? [];
        const entities = input.entities ?? [];
        const decisions = input.decisions ?? [];
        const tasks = input.tasks ?? [];
        const artifacts = input.artifacts ?? [];
        const scores = input.importance_scores ?? {};
        // Step 1: estimate original total.
        const originalTokens = estimateTotal(summaries, entities, decisions, tasks, artifacts);
        // Step 2: under budget? Return unchanged.
        if (originalTokens <= this.target_tokens) {
            return {
                summaries,
                entities,
                decisions,
                tasks,
                artifacts,
                total_tokens: originalTokens,
                original_tokens: originalTokens,
                compression_ratio: 1.0,
                items_dropped: 0,
            };
        }
        // Step 3: build priority queue with droppable items.
        const heap = new MinHeap();
        let counter = 0;
        for (const summary of summaries) {
            const category = summary.level === 'global'
                ? 'global_summary'
                : summary.level === 'message'
                    ? 'message_summary'
                    : 'topic_summary';
            heap.push({
                priority: BASE_WEIGHTS[category],
                category,
                // Honour the document's own token count when present; otherwise
                // estimate. The `|| estimate` mirrors Python's `or`-fallback for 0.
                token_count: summary.token_count || estimateTokens(summary.content),
                index: counter++,
                data: summary,
            });
        }
        for (const entity of entities) {
            const importance = scores[entity.id] ?? entity.importance;
            // Importance multiplier: 0.5 floor so a 0-importance entity still
            // outranks the cheapest message summary on ties (matches Python).
            heap.push({
                priority: BASE_WEIGHTS.entity * (0.5 + importance),
                category: 'entity',
                token_count: estimateEntityTokens(entity),
                index: counter++,
                data: entity,
            });
        }
        for (const artifact of artifacts) {
            heap.push({
                priority: BASE_WEIGHTS.artifact,
                category: 'artifact',
                token_count: estimateArtifactTokens(artifact),
                index: counter++,
                data: artifact,
            });
        }
        // Step 4: drop lowest-priority items until within budget. Decisions and
        // tasks are NEVER pushed to the heap — their tokens are accounted for
        // in `originalTokens` but they're invisible to the dropper.
        let currentTokens = originalTokens;
        let itemsDropped = 0;
        const droppedIndices = new Set();
        while (currentTokens > this.target_tokens && heap.size > 0) {
            const item = heap.pop();
            if (!item)
                break;
            // Protected? Re-push with bumped priority so we don't loop.
            if (PROTECTED_CATEGORIES.has(item.category)) {
                heap.push({
                    ...item,
                    priority: item.priority + 100,
                });
                // If the entire heap is now protected, we're done — can't shrink further.
                if (heap.toArray().every((i) => PROTECTED_CATEGORIES.has(i.category))) {
                    break;
                }
                continue;
            }
            // Artifacts get truncated before being dropped wholesale.
            if (item.category === 'artifact') {
                const truncated = truncateArtifact(item.data, this.artifact_max_tokens);
                const newTokens = estimateArtifactTokens(truncated);
                const saved = item.token_count - newTokens;
                if (saved > 0) {
                    currentTokens -= saved;
                    // Re-push with bumped priority so we don't re-truncate the same item.
                    heap.push({
                        priority: item.priority + 50,
                        category: 'artifact',
                        token_count: newTokens,
                        index: item.index,
                        data: truncated,
                    });
                    continue;
                }
            }
            // Drop it.
            droppedIndices.add(item.index);
            currentTokens -= item.token_count;
            itemsDropped++;
        }
        // Step 5: collect survivors from the heap, skipping dropped indices.
        const survivingSummaries = [];
        const survivingEntities = [];
        const survivingArtifacts = [];
        for (const item of heap.toArray()) {
            if (droppedIndices.has(item.index))
                continue;
            switch (item.category) {
                case 'message_summary':
                case 'topic_summary':
                case 'global_summary':
                    survivingSummaries.push(item.data);
                    break;
                case 'entity':
                    survivingEntities.push(item.data);
                    break;
                case 'artifact':
                    survivingArtifacts.push(item.data);
                    break;
                // decisions/tasks were never in the heap.
            }
        }
        // Step 6: recalculate the actual surviving total — drops + truncations
        // mean the running `currentTokens` is approximate.
        const finalTokens = estimateTotal(survivingSummaries, survivingEntities, decisions, tasks, survivingArtifacts);
        const ratio = originalTokens > 0 ? finalTokens / originalTokens : 1.0;
        return {
            summaries: survivingSummaries,
            entities: survivingEntities,
            decisions,
            tasks,
            artifacts: survivingArtifacts,
            total_tokens: finalTokens,
            original_tokens: originalTokens,
            compression_ratio: round4(ratio),
            items_dropped: itemsDropped,
        };
    }
}
// ── Helpers ───────────────────────────────────────────────────────────────────
function estimateTotal(summaries, entities, decisions, tasks, artifacts) {
    let total = 0;
    for (const s of summaries)
        total += s.token_count || estimateTokens(s.content);
    for (const e of entities)
        total += estimateEntityTokens(e);
    for (const d of decisions)
        total += estimateTokens(d.description + d.rationale);
    for (const t of tasks)
        total += estimateTokens(t.description);
    for (const a of artifacts)
        total += estimateArtifactTokens(a);
    return total;
}
function round4(n) {
    return Math.round(n * 10_000) / 10_000;
}
//# sourceMappingURL=compressor.js.map