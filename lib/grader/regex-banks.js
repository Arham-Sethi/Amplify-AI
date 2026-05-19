// Shared regex banks used across rubric checks.
//
// Ported verbatim (pattern-for-pattern) from apps/backend/lib/grader.js so
// behaviour is identical — when a backend endpoint switches from importing
// the local JS grader to `@amplify/grader`, no rubric check changes its
// pass/fail verdict. This is the contract we have to honour.
//
// The point of these banks is consistency across categories: every rubric
// that asks "is a format directive present?" gets the same answer regardless
// of which category it belongs to. If a future rubric needs a *different*
// notion of "format directive," it should add a category-specific `regex`
// check rather than fork the bank.
//
// Each bank is exported (a) for runtime use and (b) under `regexBanks` for
// tests that want to assert "the bank compiles" without relying on a private
// import.
/**
 * Format directive — output shape constraints. "in bullets", "as a table",
 * "as JSON", "in markdown", etc. The `\b` word-boundary anchors prevent
 * false positives like "thesis" matching "as is".
 */
export const FORMAT_DIRECTIVE_RE = /\b(?:in|as|using|return as|format(?:ted)? as|output(?:ted)? as|reply (?:in|with))\s+(?:a\s+)?(?:bullet(?:s|ed)?|table|list|json|markdown|md|prose|paragraph|paragraphs|sentence|sentences|headings?|sections?|outline|csv|xml|yaml|haiku|tweet|thread|email|memo|chart|diagram)\b|\b(?:numbered list|bulleted list|in plain text|in plaintext|as code|in code|as a table|as bullets|as a list|as json|as markdown)\b/i;
/**
 * Length directive — explicit length constraints. Numeric ("200 words", "3
 * sentences") OR qualitative ("short", "concise", "comprehensive"). The
 * qualitative side trips a few weak matches (e.g., "short on patience"),
 * which is acceptable: the cost of a false positive is one missed weight,
 * not user-visible breakage.
 */
export const LENGTH_DIRECTIVE_RE = /\b(?:\d{1,4}\s*(?:words?|tokens?|characters?|chars?|sentences?|paragraphs?|bullets?|lines?|items?|rows?|tweets?)|under\s+\d+|over\s+\d+|at most\s+\d+|at least\s+\d+|no more than\s+\d+|no fewer than\s+\d+|max(?:imum)?\s+\d+|min(?:imum)?\s+\d+|between\s+\d+\s+and\s+\d+|one paragraph|two paragraphs|three paragraphs|a single sentence|one sentence|two sentences|three sentences|short|brief|concise|terse|long|detailed|comprehensive)\b/i;
/**
 * Audience directive — who the output is for. "for engineers", "aimed at the
 * board", "for a 5-year-old". The leading preposition list (`for|aimed at|
 * targeting|...`) plus optional article (`a|an|my|the`) keeps the bank
 * focused on intent rather than incidental mentions.
 */
export const AUDIENCE_DIRECTIVE_RE = /\b(?:for|aimed at|targeting|to|written for|intended for)\s+(?:a\s+|an\s+|my\s+|the\s+)?(?:5[\- ]year[\- ]old|child|kid|teen|teenager|student|undergrad|engineer|engineers|developer|developers|designer|designers|exec|executive|executives|cto|ceo|cfo|board|investors?|analyst|analysts|customer|customers|user|users|client|clients|team|colleague|manager|recruiter|hiring manager|non[- ]technical|technical|expert|beginner|novice|layperson|general(?:\s+audience)?|public|reader|readers)\b/i;
/**
 * Task verb — concrete action verbs. Used both as a stand-alone check
 * (`has_task_verb`) and inside `task_position_max` to find where in the
 * prompt the first action verb appears (lower index = task stated up front).
 */
export const TASK_VERB_RE = /\b(?:write|draft|summarize|summarise|rewrite|edit|review|critique|analy[sz]e|explain|describe|outline|list|enumerate|brainstorm|generate|produce|create|design|propose|recommend|suggest|translate|convert|refactor|fix|debug|diagnose|optimize|optimise|name|invent|imagine|compare|contrast|evaluate|assess|score|rank|sort|classify|categorize|extract|find|identify|build|implement|plan|forecast|estimate|calculate|compute|derive|prove|simulate|model)\b/i;
/**
 * Frozen catalogue of the four banks. Exported for tests + introspection;
 * runtime code should import the named constants directly.
 */
export const regexBanks = Object.freeze({
    FORMAT_DIRECTIVE_RE,
    LENGTH_DIRECTIVE_RE,
    AUDIENCE_DIRECTIVE_RE,
    TASK_VERB_RE,
});
//# sourceMappingURL=regex-banks.js.map