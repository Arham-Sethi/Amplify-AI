const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const CODE_REGEX = /^AMP-[A-Z2-9]{6}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 100;

export function validateEmail(email) {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(trimmed);
}

export function validateCode(code) {
  if (typeof code !== 'string') return false;
  return CODE_REGEX.test(code.trim().toUpperCase());
}

export function sanitizeName(name) {
  if (typeof name !== 'string') return '';
  return name
    // Strip CR/LF/unicode line separators first — they'd otherwise pass
    // through `\s` in the next pass and enable header/subject injection
    // when the sanitized name is interpolated into email subject lines.
    .replace(/[\r\n\u2028\u2029]/g, ' ')
    // Drop any HTML-ish tags before the unicode filter.
    .replace(/<[^>]*>/g, '')
    // Whitelist letters, numbers, spaces, apostrophe, period, comma, hyphen.
    .replace(/[^\p{L}\p{N}\s'.,-]/gu, '')
    // Collapse any remaining runs of whitespace to a single space so a name
    // like "Bob\t\t Smith" doesn't render with giant gaps.
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME_LENGTH);
}

export function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateAccessCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let code = 'AMP-';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[bytes[i] % CODE_CHARS.length];
  }
  return code;
}

export function generateVerificationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Standard JSON response helpers */
export function jsonOk(data) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Rate-limit check by IP (simple in-memory, resets per cold start) */
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateBuckets = new Map();

// Generic keyed rate limit. Use for any identifier (IP, userId, compound key).
export function checkRateLimitByKey(key, limit = 10, windowMs = DEFAULT_WINDOW_MS) {
  if (!key) return true; // Don't punish callers we couldn't identify.
  const now = Date.now();
  const entry = rateBuckets.get(key);

  if (!entry || now - entry.start > windowMs) {
    rateBuckets.set(key, { start: now, count: 1 });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}

// Backward-compatible IP-only wrapper.
export function checkRateLimit(ip, limit = 10) {
  return checkRateLimitByKey(`ip:${ip}`, limit, DEFAULT_WINDOW_MS);
}
