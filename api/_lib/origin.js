// Shared Origin allowlist for state-changing POST endpoints.
//
// Browsers always send the Origin header on CORS and cross-site POSTs.
// Checking it is a cheap CSRF mitigation on top of Bearer auth: even if a
// user's token is somehow exposed to page JS on another origin (e.g. via a
// supply-chain XSS), the browser still stamps the real origin on the
// outbound request, and we reject anything that isn't us.
//
// We also allow missing Origin on same-origin POSTs from old browsers /
// curl used in ops — callers still need a valid Bearer token, so a null
// Origin alone doesn't grant access.

const ALLOWED_ORIGINS = new Set([
  'https://www.amplifyai.cc',
  'https://amplifyai.cc',
  'http://localhost:3456',
  'http://localhost:3000',
]);

// Returns true if the request's Origin is allowed (or absent).
// Returns false if the Origin is present but not in the allowlist.
export function isAllowedOrigin(req) {
  const origin = req.headers['origin'] || req.headers['Origin'];
  if (!origin) return true; // Same-origin fetch / curl — let Bearer gate it.
  return ALLOWED_ORIGINS.has(origin);
}

// Convenience wrapper: writes 403 to `res` and returns false on mismatch,
// returns true on pass so the handler can just `if (!assertAllowedOrigin(...)) return;`.
export function assertAllowedOrigin(req, res) {
  if (isAllowedOrigin(req)) return true;
  res.status(403).json({ success: false, error: 'Forbidden origin.' });
  return false;
}
