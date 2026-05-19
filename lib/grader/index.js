// @amplify/grader — rule-based prompt grader.
//
// Drop-in replacement for apps/backend/lib/grader.js (the JS prototype).
// Same public function names, same return shape, same on-disk rubric format
// — once the backend imports from `@amplify/grader`, the local JS file can
// be deleted without any /api/grade behaviour change.
//
// Public surface:
//   - gradePrompt(prompt, category) — load rubric + grade
//   - gradeWithRubric(prompt, rubric) — grade with already-loaded rubric
//   - loadRubric(category) — disk read + Zod validate + cache
//   - setRubric(category, rubric | null) — test-only override
//   - rubricDir() — diagnostics: where we read rubrics from
//   - regexBanks — the 4 shared regex banks, frozen
//   - RubricSchema / RubricCheckSchema — Zod schemas for the wire format
//   - Types: Rubric, RubricCheck, GradeResult, GradeIssue, CheckTest
export { gradePrompt, gradeWithRubric } from './grader.js';
export { loadRubric, setRubric, rubricDir, _resetRubricCacheForTests, } from './rubric-loader.js';
export { runCheck } from './checks.js';
export { RubricSchema, RubricCheckSchema, } from './rubric-schema.js';
export { regexBanks, FORMAT_DIRECTIVE_RE, LENGTH_DIRECTIVE_RE, AUDIENCE_DIRECTIVE_RE, TASK_VERB_RE, } from './regex-banks.js';
//# sourceMappingURL=index.js.map