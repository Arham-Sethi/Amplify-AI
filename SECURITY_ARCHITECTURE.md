# Amplify AI — Security Architecture

## Current State (Pre-Launch Demo)

The waitlist system uses `localStorage` for data storage. This is acceptable for local
demo/recording purposes **only**. Before deploying with real user signups, the backend
described below **must** be implemented.

### What the frontend already handles:

**Input Validation & Sanitization:**
- [x] Email validated with RFC-compliant regex, max 254 chars
- [x] Name sanitized (HTML stripped, special chars removed, max 100 chars)
- [x] Access code format validated (`AMP-[A-Z2-9]{6}`)

**Bot & Abuse Protection:**
- [x] Honeypot fields (invisible inputs that bots auto-fill)
- [x] Submission speed detection (rejects forms submitted under 1.5s)
- [x] Human interaction tracking (mouse movements, keystrokes, scrolls, touches)
- [x] WebDriver / headless browser detection (`navigator.webdriver`)
- [x] Multi-signal bot scoring (requires 2+ bot signals to block)
- [x] Silent rejection for bots (no detection feedback)

**Rate Limiting:**
- [x] Progressive rate limiting with exponential backoff
- [x] 5 signups/hour, 10 checks/hour per session
- [x] Submit button disabled with countdown timer when rate-limited
- [x] Backoff escalation: 1min, 2min, 4min, 8min... up to 30min

**Session & Auth:**
- [x] Cryptographically secure code generation (`crypto.getRandomValues`)
- [x] Session expiry (7-day TTL with automatic cleanup)
- [x] Session uses opaque UUID (not plaintext email)
- [x] Constant-time string comparison for access codes
- [x] Generic error messages (prevent email enumeration)

**Security Headers & XSS Prevention:**
- [x] Content Security Policy meta tags (all pages)
- [x] Clickjacking protection (`X-Frame-Options: DENY`)
- [x] MIME sniffing protection (`X-Content-Type-Options: nosniff`)
- [x] Referrer policy (`strict-origin-when-cross-origin`)
- [x] No `innerHTML` with user data — safe DOM construction only
- [x] Extension manifest has explicit `content_security_policy`

**Monitoring & Logging:**
- [x] All auth events logged to sessionStorage (signup, check, bot blocks, rate limits)
- [x] Structured log entries with timestamps and action types
- [x] Log rotation (keeps last 100 entries)
- [x] Form error messages (no `alert()`)

**Repository Protection:**
- [x] `.gitignore` excludes `.env`, secrets, credentials, keys, certs

---

## Required Backend for Production

### 1. Database (PostgreSQL)

```sql
CREATE TABLE waitlist_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT DEFAULT '',
  access_code   TEXT NOT NULL,       -- bcrypt hash, NOT plaintext
  position      INTEGER NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  verify_token  TEXT,                -- hash of verification token
  verify_expires TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist_users(email);
```

### 2. API Endpoints (Node.js / Express or Vercel Serverless)

| Method | Path                      | Auth    | Rate Limit     | Purpose                    |
|--------|---------------------------|---------|----------------|----------------------------|
| POST   | `/api/waitlist/signup`     | none    | 5/hr per IP    | Join waitlist               |
| POST   | `/api/waitlist/check`      | none    | 10/hr per IP   | Check position              |
| GET    | `/api/waitlist/verify/:token` | none | 3/hr per IP    | Email verification          |
| POST   | `/api/waitlist/logout`     | session | none           | Clear session               |
| GET    | `/api/waitlist/count`      | none    | 60/hr per IP   | Get total waitlist count    |

### 3. Authentication Flow

```
Signup:
  1. Validate email (RFC 5322 regex + MX record check)
  2. Sanitize name (strip HTML, max 100 chars)
  3. Generate access code with crypto.randomBytes(32)
  4. Hash access code with bcrypt (cost factor 12)
  5. Generate email verification token with crypto.randomBytes(32)
  6. Hash verification token, store in DB
  7. Send verification email with unhashed token in link
  8. Create server-side session (express-session + Redis)
  9. Set HttpOnly, Secure, SameSite=Strict cookie
  10. Return: { position, accessCode } (plaintext, shown ONCE)
  11. Access code is NEVER stored in plaintext after this response

Check Position:
  1. Validate email format
  2. Look up user by email
  3. bcrypt.compare(submittedCode, storedHash)
  4. Return IDENTICAL error for wrong email OR wrong code
  5. Create session on success
```

### 4. Security Middleware

```javascript
// Required npm packages:
// helmet, express-rate-limit, express-session, connect-redis, bcrypt, cors

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

app.use(cors({ origin: process.env.ALLOWED_ORIGIN, credentials: true }));
```

### 5. Server-Side Bot & Abuse Protection

```javascript
// Required: express-rate-limit, rate-limit-redis

// Per-IP rate limiting on all endpoints
const signupLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // 5 signups per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLog.warn('rate_limited', { ip: req.ip, endpoint: 'signup' });
    res.status(429).json({ error: 'Too many attempts. Try again later.' });
  },
});

const checkLimiter = rateLimit({
  store: new RedisStore({ client: redisClient }),
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    auditLog.warn('rate_limited', { ip: req.ip, endpoint: 'check' });
    res.status(429).json({ error: 'Too many attempts. Try again later.' });
  },
});

app.post('/api/waitlist/signup', signupLimiter, signupHandler);
app.post('/api/waitlist/check', checkLimiter, checkHandler);

// Server-side honeypot validation middleware
function honeypotCheck(req, res, next) {
  if (req.body.website || req.body.phone) {
    auditLog.warn('honeypot_triggered', { ip: req.ip });
    // Return fake success to bots
    return res.json({ success: true, position: 999 });
  }
  next();
}

// Request fingerprinting for abuse detection
function fingerprintMiddleware(req, res, next) {
  req.fingerprint = {
    ip: req.ip,
    ua: req.headers['user-agent'] || '',
    acceptLang: req.headers['accept-language'] || '',
  };
  next();
}
```

### 6. Audit Logging

```javascript
// Structured logging for security events
const auditLog = {
  info(action, data) {
    console.log(JSON.stringify({
      level: 'info', timestamp: new Date().toISOString(),
      action, ...data,
    }));
  },
  warn(action, data) {
    console.warn(JSON.stringify({
      level: 'warn', timestamp: new Date().toISOString(),
      action, ...data,
    }));
  },
};

// Log all auth events (never log email/code values)
// signup_attempt, signup_success, check_attempt, check_success,
// check_failed, rate_limited, bot_blocked, session_created,
// session_expired, honeypot_triggered
```

### 7. Environment Variables (Never in Source Code)

```env
DATABASE_URL=postgresql://...
SESSION_SECRET=<64+ random hex chars>
REDIS_URL=redis://...
SMTP_HOST=...
SMTP_USER=...
SMTP_PASS=...
ALLOWED_ORIGIN=https://amplify-ai.com
NODE_ENV=production
```

### 8. Deployment Checklist

- [ ] HTTPS enforced (redirect all HTTP)
- [ ] Database not publicly accessible (VPC/private network)
- [ ] Environment variables set (not in source code)
- [ ] `.env` excluded from version control via `.gitignore`
- [ ] No API keys or secrets in frontend JavaScript
- [ ] Rate limiting enabled on all endpoints (Redis-backed)
- [ ] Honeypot validation on all form endpoints
- [ ] Bot detection (WebDriver, headless) on server side
- [ ] Logging enabled (auth events, errors, unusual patterns)
- [ ] Session cookie: HttpOnly + Secure + SameSite=Strict
- [ ] CORS restricted to production domain only
- [ ] CSP headers served by web server (not just meta tags)
- [ ] No sensitive data in error responses
- [ ] bcrypt cost factor >= 12
- [ ] Email verification required before counting in waitlist
- [ ] Rotate any previously exposed API keys (OpenAI, Anthropic, xAI, DeepSeek)
