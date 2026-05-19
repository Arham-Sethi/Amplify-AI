// lib/log-prompt.js
//
// Fire-and-forget telemetry writer for prompt events. Every API endpoint
// (classify, grade, rewrite, compress) calls this once it knows the
// outcome.
//
// Two principles:
//
//  1. NEVER block the user. The insert runs in the background; if it
//     fails, we log to console and move on. The endpoint already sent
//     its response by then.
//
//  2. NEVER log raw prompt text. Both the input and the rewritten output
//     are run through scrub() before being persisted. The scrub_counts
//     field is the only place we record whether secrets were present —
//     we keep the count, not the value.

import { supabase } from './supabase.js';
import { scrub } from './scrub.js';

/**
 * @typedef {Object} PromptEvent
 * @property {string}  user_id
 * @property {string}  request_id
 * @property {'classify'|'grade'|'rewrite'|'compress'} kind
 * @property {string=} category
 * @property {boolean=} is_vague
 * @property {number=}  score_before
 * @property {number=}  score_after
 * @property {string=}  intensity
 * @property {string=}  target_llm
 * @property {string=}  model
 * @property {number}   latency_ms
 * @property {string=}  prompt          Raw prompt — will be scrubbed before insert.
 * @property {string=}  rewritten       Raw rewrite — will be scrubbed before insert.
 * @property {string=}  error           If the request failed; brief message only.
 */

/**
 * Synchronously returns; the actual insert runs in the background. Caller
 * can ignore the return value.
 *
 * @param {PromptEvent} event
 */
export function logPromptEvent(event) {
  // Kick the work to the next tick so the response can flush first.
  // Caller can also `void logPromptEvent(...)` to be explicit about
  // not awaiting it.
  doLog(event).catch((err) => {
    // Never throw; never page the user. Log so we can fix it.
    // eslint-disable-next-line no-console
    console.error('[log-prompt] insert failed:', err?.message || err);
  });
}

/**
 * @param {PromptEvent} event
 */
async function doLog(event) {
  const promptScrub = event.prompt ? scrub(event.prompt) : null;
  const rewriteScrub = event.rewritten ? scrub(event.rewritten) : null;

  /** @type {Record<string, number>} */
  const counts = {};
  if (promptScrub) {
    for (const [k, v] of Object.entries(promptScrub.counts)) {
      counts[k] = (counts[k] ?? 0) + v;
    }
  }
  if (rewriteScrub) {
    for (const [k, v] of Object.entries(rewriteScrub.counts)) {
      counts[k] = (counts[k] ?? 0) + v;
    }
  }

  const row = {
    user_id: event.user_id,
    request_id: event.request_id,
    kind: event.kind,
    category: event.category ?? null,
    is_vague: event.is_vague ?? null,
    score_before: event.score_before ?? null,
    score_after: event.score_after ?? null,
    intensity: event.intensity ?? null,
    target_llm: event.target_llm ?? null,
    model: event.model ?? null,
    latency_ms: event.latency_ms,
    prompt_scrubbed: promptScrub ? promptScrub.text : null,
    rewritten_scrubbed: rewriteScrub ? rewriteScrub.text : null,
    scrub_counts: Object.keys(counts).length > 0 ? counts : null,
    error: event.error ?? null,
  };

  const { error } = await supabase.from('prompt_logs').insert(row);
  if (error) throw error;
}
