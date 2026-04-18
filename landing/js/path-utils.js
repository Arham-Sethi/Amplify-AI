// Browser-safe `?next=` validator. Rejects anything that could leave the
// origin — protocol-relative paths (`//evil`, `/\evil`), absolute URLs,
// anything with a colon or backslash, and control characters.
//
// Kept deliberately narrow: only single-slash absolute paths made of
// letters, numbers, dashes, underscores, forward slashes, and a period are
// allowed. The /account fallback mirrors the old inline regex's default.
export function sanitizeNextPath(next, fallback = '/account') {
  if (typeof next !== 'string' || next.length === 0) return fallback;
  if (next.length > 512) return fallback;
  // Must start with a single forward slash — not '//' and not '/\'.
  if (next[0] !== '/') return fallback;
  if (next[1] === '/' || next[1] === '\\') return fallback;
  // Reject anything with a scheme, backslash, or control character.
  // eslint-disable-next-line no-control-regex
  if (/[:\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  // Final positive-match whitelist (letters, numbers, `_ - / .`).
  if (!/^\/[A-Za-z0-9_\-/.]*$/.test(next)) return fallback;
  return next;
}
