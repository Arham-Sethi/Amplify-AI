// Zod schemas for the rubric file format.
//
// A rubric is a JSON file under benchmarks/rubrics/<category>.json with a
// pinned shape:
//
//   {
//     "version": "v1",
//     "category": "task_only",
//     "description": "...",
//     "pass_threshold": 70,
//     "checks": [ { id, weight, test, ...params }, ... ]
//   }
//
// The 13 supported test types are split into 4 shapes by what params they
// consume. Modelling each as its own Zod object schema and unioning by
// `test` gives us:
//   - parse-time errors when a check is malformed (e.g. regex_count_min
//     without a `value`),
//   - type-narrowing in the dispatcher (./checks.ts) so each runner only
//     sees the params it needs,
//   - an obvious extension point: adding a 14th test type means adding one
//     more variant + one more dispatcher branch.
//
// The schemas accept strict-extra-fields (`.strict()`) — a typo in a rubric
// like `"weigth": 15` should fail loudly, not silently default the weight
// to 0. The cost of a false positive at parse time is a clear error
// message; the cost of silent acceptance is a customer's score drifting
// without anyone noticing.
import { z } from 'zod';
// ── Common fields every check carries ────────────────────────────────────────
const CheckCommon = {
    id: z.string().min(1),
    /** Points deducted on failure. 0-weight is allowed for advisory checks. */
    weight: z.number().int().min(0),
    description: z.string().optional(),
};
// ── Test-type variants ───────────────────────────────────────────────────────
// Each variant carves out exactly the params its runner consumes.
/** Pattern-only checks: regex / not_regex. */
const RegexCheck = z
    .object({
    ...CheckCommon,
    test: z.enum(['regex', 'not_regex']),
    pattern: z.string().min(1),
})
    .strict();
/** Pattern + numeric threshold: regex_count_min / regex_count_max. */
const RegexCountCheck = z
    .object({
    ...CheckCommon,
    test: z.enum(['regex_count_min', 'regex_count_max']),
    pattern: z.string().min(1),
    /** Match-count threshold. */
    value: z.number().int().min(0),
})
    .strict();
/** Keyword list checks: keyword_any / keyword_all. */
const KeywordCheck = z
    .object({
    ...CheckCommon,
    test: z.enum(['keyword_any', 'keyword_all']),
    /** Non-empty list of keywords; case-insensitive substring match. */
    value: z.array(z.string().min(1)).min(1),
})
    .strict();
/** Length checks: length_min / length_max (chars). */
const LengthCheck = z
    .object({
    ...CheckCommon,
    test: z.enum(['length_min', 'length_max']),
    value: z.number().int().min(0),
})
    .strict();
/**
 * Task-position check — fraction (0..1) of total length within which the
 * first task verb must appear. Lower = better (task stated up front).
 */
const TaskPositionCheck = z
    .object({
    ...CheckCommon,
    test: z.literal('task_position_max'),
    value: z.number().min(0).max(1),
})
    .strict();
/** Param-less directive checks — backed by the shared regex banks. */
const DirectiveCheck = z
    .object({
    ...CheckCommon,
    test: z.enum([
        'has_format_directive',
        'has_length_directive',
        'has_audience_directive',
        'has_task_verb',
    ]),
})
    .strict();
// ── Discriminated union ──────────────────────────────────────────────────────
export const RubricCheckSchema = z.discriminatedUnion('test', [
    RegexCheck,
    RegexCountCheck,
    KeywordCheck,
    LengthCheck,
    TaskPositionCheck,
    DirectiveCheck,
]);
// ── Rubric (top-level) ───────────────────────────────────────────────────────
export const RubricSchema = z
    .object({
    version: z.string().min(1),
    /** Category slug — must match a value the classifier emits (CLAUDE.md §6). */
    category: z.string().min(1),
    description: z.string().optional(),
    /** Pass threshold; defaults to 70 if a rubric omits it (matches JS grader). */
    pass_threshold: z.number().min(0).max(100).default(70),
    checks: z.array(RubricCheckSchema),
})
    .strict();
//# sourceMappingURL=rubric-schema.js.map