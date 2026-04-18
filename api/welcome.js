import { supabase } from '../lib/supabase.js';
import { sendWelcomeEmail } from '../lib/email.js';
import { sanitizeName, normalizeEmail, checkRateLimitByKey } from '../lib/validate.js';
import { assertAllowedOrigin } from './_lib/origin.js';

// Verify the Bearer token against Supabase. Returns the user or null.
async function getAuthedUser(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const token = match[1].trim();
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user;
  } catch (err) {
    console.error('Token verification failed:', err);
    return null;
  }
}

// POST /api/welcome
//
// Called from the OAuth callback page after a successful sign-in. Sends the
// one-time welcome email the first time we ever see this auth user, and
// records the send in auth.users.app_metadata.welcome_email_sent so we
// never duplicate it on subsequent logins.
//
// Idempotency flag is in app_metadata (admin-write-only) NOT user_metadata,
// so a signed-in user can't flip it back to re-trigger the welcome email.
//
// Returns 200 for the normal outcomes — the user signing in must never see
// an error on the callback page because of this.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // CSRF defence-in-depth. Callback page posts same-origin so this passes
  // in the normal flow; cross-site forgers get 403 before any Supabase call.
  if (!assertAllowedOrigin(req, res)) return;

  try {
    const authed = await getAuthedUser(req);
    if (!authed) {
      return res.status(401).json({ success: false, error: 'Not signed in.' });
    }

    // Rate limit per-user so an attacker with a valid token can't burn our
    // Supabase/Resend quota in a tight loop.
    if (!checkRateLimitByKey(`welcome:${authed.id}`, 5, 60 * 60 * 1000)) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    }

    // Idempotency: skip if we've already sent this user the welcome email.
    // Read from app_metadata (admin-managed) rather than user_metadata
    // (user-writable via supabase.auth.updateUser).
    if (authed.app_metadata?.welcome_email_sent) {
      return res.status(200).json({ success: true, sent: false, reason: 'already_sent' });
    }

    const email = authed.email;
    if (!email) {
      return res.status(200).json({ success: true, sent: false, reason: 'no_email' });
    }

    const rawName = authed.user_metadata?.full_name
      || authed.user_metadata?.name
      || '';
    const normalizedEmail = normalizeEmail(email);
    const sanitizedName = sanitizeName(rawName);
    const displayName = sanitizedName || normalizedEmail.split('@')[0];

    try {
      await sendWelcomeEmail({ email: normalizedEmail, name: displayName });
    } catch (emailErr) {
      console.error('Welcome email send failed:', emailErr);
      return res.status(200).json({ success: true, sent: false, reason: 'send_failed' });
    }

    // Mark as sent so the next /api/welcome call for this user is a no-op.
    // Uses the service-role client (configured in lib/supabase.js) since
    // updating app_metadata via admin API requires elevated privileges.
    // Spreading existing app_metadata preserves any other flags Supabase
    // or we have written (e.g. provider, providers, roles).
    try {
      await supabase.auth.admin.updateUserById(authed.id, {
        app_metadata: {
          ...(authed.app_metadata || {}),
          welcome_email_sent: true,
          welcome_email_sent_at: new Date().toISOString(),
        },
      });
    } catch (metaErr) {
      // If we fail to mark it, we'd rather risk a duplicate email on the
      // next login than silently drop the success — log and move on.
      console.error('Failed to flag welcome_email_sent:', metaErr);
    }

    return res.status(200).json({ success: true, sent: true });
  } catch (err) {
    console.error('Welcome handler error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
}
