// lib/scrub.js
//
// Secret and PII redactor. Runs on every prompt before we log it, so we
// never persist a user's API keys, tokens, or personal data even if
// classify/rewrite/grade returns successfully.
//
// Design principles:
//  - Defence in depth: pattern ordering AND negative lookaheads, so a
//    refactor that re-orders the patterns cannot accidentally cause one
//    rule to swallow another rule's matches.
//  - Returns counts by kind so we can monitor false-positive rates without
//    exposing the underlying data.
//  - Replacement tokens are stable strings, not random — easier to test
//    and grep for in logs.
//  - Pure function: no I/O, no globals, no module-level state.
//
// Adding a new pattern:
//  1. Append to PATTERNS (or define separately if it needs Luhn / extra
//     validation, like CC).
//  2. If it shares a prefix with an existing pattern, add a negative
//     lookahead to whichever rule should *lose* the collision, and place
//     the more-specific rule first.
//  3. Add a test in scripts/test-scrub.js with both a positive and an
//     adjacent negative case.

/**
 * @typedef {Object} ScrubPattern
 * @property {string}  kind     short label used in counts and the replacement token
 * @property {RegExp}  re       global regex matching the secret
 */

/**
 * Order matters when patterns could plausibly overlap. The negative
 * lookahead on OPENAI_KEY is the primary defence — the ordering is the
 * secondary one. Both together make it impossible for the OpenAI rule to
 * eat an Anthropic key even if a future edit reorders the array.
 *
 * @type {ReadonlyArray<ScrubPattern>}
 */
const PATTERNS = Object.freeze([
  // Cloud-provider API keys.
  { kind: 'AWS_KEY',       re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: 'STRIPE_KEY',    re: /\b(?:sk|pk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g },
  { kind: 'GITHUB_TOKEN',  re: /\bghp_[A-Za-z0-9]{30,}\b/g },

  // ANTHROPIC must come BEFORE OpenAI — both start with `sk-`. Listing it
  // first means it grabs `sk-ant-...` before the OpenAI rule even runs.
  { kind: 'ANTHROPIC_KEY', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },

  // Negative lookahead `(?!ant-)` so this rule cannot eat an Anthropic key
  // even if patterns are reordered later. Matches `sk-...`, `sk-proj-...`.
  { kind: 'OPENAI_KEY',    re: /\bsk-(?!ant-)(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },

  { kind: 'GOOGLE_KEY',    re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: 'SLACK_TOKEN',   re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },

  // Generic JWT (header.payload.signature, base64url-ish).
  { kind: 'JWT',           re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },

  // Bearer tokens in Authorization headers, anywhere in text.
  { kind: 'BEARER_TOKEN',  re: /\bBearer\s+[A-Za-z0-9._~+/-]{20,}=*\b/g },

  // PEM private-key blocks (catches RSA, EC, OPENSSH, etc.).
  {
    kind: 'PRIVATE_KEY',
    re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----/g,
  },

  // Personal data.
  { kind: 'EMAIL', re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },

  // US-style phone numbers, loose enough to catch +CC formats.
  {
    kind: 'PHONE',
    re: /\b(?:\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
  },

  // US SSN.
  { kind: 'SSN', re: /\b\d{3}-\d{2}-\d{4}\b/g },

  // IBAN. Loose but bounded — 15-32 alphanumerics after a country prefix.
  { kind: 'IBAN', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g },
]);

/**
 * Credit-card matcher. Kept separate because we need a Luhn validation
 * pass — the regex would otherwise eat ISBNs, order numbers, etc.
 */
const CC_RE = /\b(?:\d[ -]?){12,18}\d\b/g;

/**
 * Luhn algorithm. Returns true iff `digits` is a valid checksum.
 *
 * @param {string} digits  Numeric string with no separators.
 * @returns {boolean}
 */
export function isLuhnValid(digits) {
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < 12 || digits.length > 19) return false;

  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48; // '0' = 48
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * @typedef {Object} ScrubResult
 * @property {string}                     text    Redacted text.
 * @property {Record<string, number>}     counts  Map from kind → number of replacements.
 */

/**
 * Replace secrets and PII in `input` with stable `[REDACTED:KIND]` tokens.
 *
 * @param {unknown} input
 * @returns {ScrubResult}
 */
export function scrub(input) {
  /** @type {Record<string, number>} */
  const counts = {};

  if (input == null) return { text: '', counts };
  const original = typeof input === 'string' ? input : String(input);
  if (original.length === 0) return { text: '', counts };

  let text = original;

  for (const { kind, re } of PATTERNS) {
    // Reset lastIndex defensively — these regexes are global and shared.
    re.lastIndex = 0;
    let count = 0;
    text = text.replace(re, () => {
      count += 1;
      return `[REDACTED:${kind}]`;
    });
    if (count > 0) counts[kind] = (counts[kind] ?? 0) + count;
  }

  // Credit cards last, so we don't redact characters that other patterns
  // might still need to match. Validate via Luhn so ISBNs and order
  // numbers pass through.
  CC_RE.lastIndex = 0;
  let ccCount = 0;
  text = text.replace(CC_RE, (match) => {
    const digits = match.replace(/[\s-]/g, '');
    if (!isLuhnValid(digits)) return match;
    ccCount += 1;
    return '[REDACTED:CC]';
  });
  if (ccCount > 0) counts.CC = (counts.CC ?? 0) + ccCount;

  return { text, counts };
}

/**
 * Convenience wrapper when callers only care about the redacted text.
 *
 * @param {unknown} input
 * @returns {string}
 */
export function scrubText(input) {
  return scrub(input).text;
}

// Internals exposed for tests only — do not import from production code.
export const _internals = Object.freeze({ PATTERNS, CC_RE });
