// Per-test-type check runners + dispatch.
//
// Each runner takes (prompt, check) narrowed to the discriminated-union
// variant it owns and returns true on pass / false on fail. Dispatch is a
// single switch on `check.test`; adding a 14th test type means adding one
// more case here, one more variant in rubric-schema.ts, and (if shared) a
// new entry in regex-banks.ts.
//
// Behaviour parity with apps/backend/lib/grader.js is the contract — same
// regex flags, same edge-case handling, same fallbacks. Test
// __tests__/grader.test.ts exercises every test type against the real
// rubrics on disk and asserts scores match what the JS grader produced.
//
// Unknown test types (impossible at the type level, but possible if a
// rubric file was hand-edited and slipped past validation) PASS with a
// warning — graceful degradation so a typo doesn't tank a customer's
// score. Same posture as the JS grader.
import { AUDIENCE_DIRECTIVE_RE, FORMAT_DIRECTIVE_RE, LENGTH_DIRECTIVE_RE, TASK_VERB_RE, } from './regex-banks.js';
/**
 * Run a single check against the prompt. Pure function, no side effects
 * (the unknown-test-type warning is a console.warn — see comment there).
 */
export function runCheck(prompt, check) {
    const text = prompt;
    switch (check.test) {
        case 'regex': {
            // `i` flag matches the JS grader's `new RegExp(pattern, 'i')`.
            return new RegExp(check.pattern, 'i').test(text);
        }
        case 'not_regex': {
            return !new RegExp(check.pattern, 'i').test(text);
        }
        case 'regex_count_min': {
            // `gim` — global so .match returns every hit, case-insensitive,
            // multiline so ^/$ work per-line. Matches the JS grader.
            const re = new RegExp(check.pattern, 'gim');
            const count = (text.match(re) ?? []).length;
            return count >= check.value;
        }
        case 'regex_count_max': {
            const re = new RegExp(check.pattern, 'gim');
            const count = (text.match(re) ?? []).length;
            return count <= check.value;
        }
        case 'keyword_any': {
            const lower = text.toLowerCase();
            return check.value.some((kw) => lower.includes(kw.toLowerCase()));
        }
        case 'keyword_all': {
            const lower = text.toLowerCase();
            return check.value.every((kw) => lower.includes(kw.toLowerCase()));
        }
        case 'length_min': {
            return text.length >= check.value;
        }
        case 'length_max': {
            return text.length <= check.value;
        }
        case 'task_position_max': {
            // Where does the first task verb appear, as a fraction of total
            // length? Lower = better (task stated up front). No verb = fail.
            const m = text.match(TASK_VERB_RE);
            if (!m || m.index == null)
                return false;
            const ratio = m.index / Math.max(text.length, 1);
            return ratio <= check.value;
        }
        case 'has_format_directive': {
            return FORMAT_DIRECTIVE_RE.test(text);
        }
        case 'has_length_directive': {
            return LENGTH_DIRECTIVE_RE.test(text);
        }
        case 'has_audience_directive': {
            return AUDIENCE_DIRECTIVE_RE.test(text);
        }
        case 'has_task_verb': {
            return TASK_VERB_RE.test(text);
        }
        default: {
            // The discriminated union makes this `never` at the type level. The
            // runtime guard catches the case where a hand-edited rubric file
            // slipped past validation (or an older deploy reads a newer rubric
            // with a test type we don't yet know about). Pass with a warning so
            // we don't penalise the user for our own deploy lag.
            const exhaustive = check;
            // eslint-disable-next-line no-console -- intentional: surfaces rubric drift in dev logs.
            console.warn(`[grader] Unknown check variant — passing by default.`, exhaustive);
            return true;
        }
    }
}
//# sourceMappingURL=checks.js.map