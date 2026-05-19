// Non-fatal UCS quality checks. Port of `UCSValidator` from
// kangaroo/backend/app/core/models/ucs.py.
//
// Anything raised here is a warning, NOT an error: the document is
// well-formed (passes UniversalContextSchema), but something about it is
// suspicious enough to surface in logs/dashboards. Examples:
//   - No global summary on a multi-message conversation (degraded recall).
//   - Importance scores referencing entities that no longer exist.
//   - Circular task-dependency chain.
//   - Duplicate entity names (probably needed deduplication upstream).
//   - Topic-cluster message indices outside the session range.
//
// Validation is read-only and side-effect-free: callers can run it on
// every parse without worrying about cost. Returns an empty array when
// the document is clean.
export function validateUCS(ucs) {
    const warnings = [];
    // 1. Global summary present when conversation has messages.
    const hasGlobal = ucs.summaries.some((s) => s.level === 'global');
    if (!hasGlobal && ucs.session_meta.message_count > 0) {
        warnings.push('UCS has no global summary — context quality may be degraded');
    }
    // 2. Compression ratio sanity. Schema already constrains [0, 1] so the
    //    only invalid value left is exactly 0 (no content survived).
    if (ucs.session_meta.compression_ratio <= 0) {
        warnings.push('Compression ratio is zero or negative — likely a bug');
    }
    // 3. Orphaned importance scores (entity has been removed but score remains).
    const entityIdSet = new Set(ucs.entities.map((e) => e.id));
    for (const scoreId of Object.keys(ucs.importance_scores)) {
        if (!entityIdSet.has(scoreId)) {
            warnings.push(`Importance score for entity ${scoreId} but no matching entity exists`);
        }
    }
    // 4. Circular task-dependency detection. We walk the first-dep chain from
    //    each task and bail when we revisit an id. This mirrors the Python
    //    implementation, which only checks the leftmost dependency edge —
    //    catches the common case (A→B→A) without exploding on dense graphs.
    const taskMap = new Map(ucs.tasks.map((t) => [t.id, t]));
    for (const task of ucs.tasks) {
        const visited = new Set();
        let current = task;
        while (current.dependencies.length > 0) {
            if (visited.has(current.id)) {
                warnings.push(`Circular dependency detected involving task '${task.description.slice(0, 50)}'`);
                break;
            }
            visited.add(current.id);
            // We just checked `dependencies.length > 0` at the top of the loop, so
            // index 0 is non-undefined; the explicit guard keeps strict-mode happy.
            const firstDep = current.dependencies[0];
            if (firstDep === undefined)
                break;
            const next = taskMap.get(firstDep);
            if (!next)
                break; // dangling dep (already caught as parse error upstream)
            current = next;
        }
    }
    // 5. Duplicate entity names (case-insensitive).
    const lowerNames = ucs.entities.map((e) => e.name.toLowerCase());
    if (lowerNames.length !== new Set(lowerNames).size) {
        warnings.push('Duplicate entity names detected — consider deduplication');
    }
    // 6. Topic-cluster indices must be within session message range.
    const msgCount = ucs.session_meta.message_count;
    if (msgCount > 0) {
        for (const cluster of ucs.topic_clusters) {
            for (const idx of cluster.message_indices) {
                if (idx >= msgCount) {
                    warnings.push(`Topic cluster '${cluster.label}' references message index ${idx} but only ${msgCount} messages exist`);
                    break;
                }
            }
        }
    }
    return warnings;
}
/** Quick boolean check — returns true when the UCS has zero warnings. */
export function isUCSValid(ucs) {
    return validateUCS(ucs).length === 0;
}
//# sourceMappingURL=validator.js.map