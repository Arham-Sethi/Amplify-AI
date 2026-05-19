/**
 * Format directive — output shape constraints. "in bullets", "as a table",
 * "as JSON", "in markdown", etc. The `\b` word-boundary anchors prevent
 * false positives like "thesis" matching "as is".
 */
export declare const FORMAT_DIRECTIVE_RE: RegExp;
/**
 * Length directive — explicit length constraints. Numeric ("200 words", "3
 * sentences") OR qualitative ("short", "concise", "comprehensive"). The
 * qualitative side trips a few weak matches (e.g., "short on patience"),
 * which is acceptable: the cost of a false positive is one missed weight,
 * not user-visible breakage.
 */
export declare const LENGTH_DIRECTIVE_RE: RegExp;
/**
 * Audience directive — who the output is for. "for engineers", "aimed at the
 * board", "for a 5-year-old". The leading preposition list (`for|aimed at|
 * targeting|...`) plus optional article (`a|an|my|the`) keeps the bank
 * focused on intent rather than incidental mentions.
 */
export declare const AUDIENCE_DIRECTIVE_RE: RegExp;
/**
 * Task verb — concrete action verbs. Used both as a stand-alone check
 * (`has_task_verb`) and inside `task_position_max` to find where in the
 * prompt the first action verb appears (lower index = task stated up front).
 */
export declare const TASK_VERB_RE: RegExp;
/**
 * Frozen catalogue of the four banks. Exported for tests + introspection;
 * runtime code should import the named constants directly.
 */
export declare const regexBanks: Readonly<{
    FORMAT_DIRECTIVE_RE: RegExp;
    LENGTH_DIRECTIVE_RE: RegExp;
    AUDIENCE_DIRECTIVE_RE: RegExp;
    TASK_VERB_RE: RegExp;
}>;
export type RegexBankName = keyof typeof regexBanks;
//# sourceMappingURL=regex-banks.d.ts.map