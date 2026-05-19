// Single source of truth for the 6 active prompt categories.
//
// Per CLAUDE.md L5 (locked decision): "6 broad categories — fewer = fewer
// misclassifications". The 7th legacy category `open_ended_generation` was
// archived to benchmarks/rubrics/_archive/ — anything classified as that
// would 404 the rubric loader. Keeping the canonical list in one file
// means the 5 places that previously inlined a `KNOWN_CATEGORIES` set can
// import it instead, and the next category change touches one file.

/**
 * The 6 active categories. Order matches CLAUDE.md §6 for readability;
 * downstream code should treat the set as unordered.
 *
 * @type {readonly Category[]}
 */
export const CATEGORIES = Object.freeze([
  'task_only',
  'context_heavy',
  'vague_instruction',
  'multi_step_workflow',
  'role_persona',
  'debug_fix',
])

/**
 * @typedef {'task_only' | 'context_heavy' | 'vague_instruction' | 'multi_step_workflow' | 'role_persona' | 'debug_fix'} Category
 */

/** Frozen Set form for O(1) membership checks in request handlers. */
export const CATEGORY_SET = Object.freeze(new Set(CATEGORIES))

/**
 * Type guard. Returns true iff `value` is one of the 6 active categories.
 *
 * @param {unknown} value
 * @returns {value is Category}
 */
export function isCategory(value) {
  return typeof value === 'string' && CATEGORY_SET.has(value)
}
