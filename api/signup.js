import { supabase } from '../lib/supabase.js';
import {
  validateEmail, sanitizeName, normalizeEmail,
  generateAccessCode, checkRateLimitByKey,
} from '../lib/validate.js';
import { sendWaitlistEmail } from '../lib/email.js';
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

// Prefer x-real-ip (set by Vercel edge, not caller-influenced) over
// x-forwarded-for (which a client can spoof on the first hop).
function getClientIp(req) {
  const real = req.headers['x-real-ip'];
  if (typeof real === 'string' && real.length > 0) return real;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0].trim();
  return 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // CSRF defence-in-depth on top of Bearer auth.
  if (!assertAllowedOrigin(req, res)) return;

  try {
    // Authentication is required. The only way to join the waitlist is to
    // sign in first (Google, GitHub, or email/password). The client then
    // sends its Supabase access token in the Authorization header.
    const authed = await getAuthedUser(req);
    if (!authed) {
      return res.status(401).json({
        success: false,
        error: 'You must be signed in to join the waitlist.',
      });
    }

    // Rate limit by composite key (userId + IP). Punishes both a single
    // account spamming signup AND a single IP cycling tokens, without
    // letting X-Forwarded-For spoofing bypass either dimension.
    const ip = getClientIp(req);
    if (!checkRateLimitByKey(`signup:${authed.id}:${ip}`, 5)) {
      return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
    }

    const email = authed.email;
    const rawName = req.body?.name
      || authed.user_metadata?.full_name
      || authed.user_metadata?.name
      || '';
    const userId = authed.id;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Your account email is invalid.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const sanitizedName = sanitizeName(rawName);
    // Fall back to the email local-part when OAuth provider omits a name
    // (GitHub without a public name, for example) — never block signup on this.
    const finalName = sanitizedName || normalizedEmail.split('@')[0];

    // Already on the list? Gate the reply by ownership so we never leak
    // another user's position/code via an email-only lookup (IDOR fix).
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, name, access_code, position, user_id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      // Case A: row already belongs to this user — return it.
      if (existing.user_id === userId) {
        return res.status(200).json({
          success: true,
          existing: true,
          position: existing.position,
          code: existing.access_code,
          name: existing.name,
        });
      }

      // Case B: legacy row with no owner AND email matches the authed
      // user's verified OAuth email — backfill user_id to claim it. The
      // email equality check prevents someone from claiming a row just
      // because the stored email collides with their Supabase email.
      if (existing.user_id === null && existing.email === normalizedEmail) {
        const { error: backfillError } = await supabase
          .from('waitlist')
          .update({ user_id: userId, email_verified: true })
          .eq('id', existing.id)
          .is('user_id', null); // concurrency guard: only update if still unclaimed
        if (backfillError) {
          console.error('Backfill error:', backfillError);
          return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
        }
        return res.status(200).json({
          success: true,
          existing: true,
          position: existing.position,
          code: existing.access_code,
          name: existing.name,
        });
      }

      // Case C: someone else owns the row. Do NOT disclose their code or
      // position — just tell the caller the email is taken.
      return res.status(409).json({
        success: false,
        error: 'This email is already claimed by another account.',
      });
    }

    // Try the atomic RPC first (fixes the count+insert race). If the
    // migration hasn't been applied yet the RPC won't exist — fall back to
    // the legacy path so signups don't hard-fail during rollout.
    let position;
    let accessCode;

    const rpcResult = await supabase.rpc('claim_waitlist_spot', {
      p_user_id: userId,
      p_email: normalizedEmail,
      p_name: finalName,
      p_access_code: generateAccessCode(),
    });

    if (!rpcResult.error && rpcResult.data) {
      // RPC returns a JSON object { position, access_code }. We return JSON
      // from the function instead of RETURNS TABLE to avoid reserved-word
      // and variable-vs-column name-resolution pitfalls in plpgsql.
      const row = typeof rpcResult.data === 'string'
        ? JSON.parse(rpcResult.data)
        : rpcResult.data;
      position = row.position;
      accessCode = row.access_code;
    } else {
      // Legacy fallback: count + insert. Small race window where two
      // concurrent signups may collide on position — acceptable until the
      // RPC migration is live.
      if (rpcResult.error && rpcResult.error.code !== '42883') {
        // 42883 = undefined_function. Anything else is a real error worth logging.
        console.error('claim_waitlist_spot RPC error:', rpcResult.error);
      }

      const { count } = await supabase
        .from('waitlist')
        .select('*', { count: 'exact', head: true });

      position = (count || 0) + 1;
      accessCode = generateAccessCode();

      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({
          email: normalizedEmail,
          name: finalName,
          access_code: accessCode,
          position,
          user_id: userId,
          email_verified: true, // OAuth/email-confirmed — provider guarantees it
          verification_token: null,
          verification_expires_at: null,
        });

      if (insertError) {
        if (insertError.code === '23505') {
          // Race: another request from the same user landed first.
          return res.status(409).json({ success: false, error: 'You are already on the waitlist.' });
        }
        console.error('Insert error:', insertError);
        return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
      }
    }

    // Fire the waitlist confirmation email. Failure here must not fail the
    // signup — the row is already safely persisted.
    try {
      await sendWaitlistEmail({
        email: normalizedEmail,
        name: finalName,
        position,
        code: accessCode,
      });
    } catch (emailErr) {
      console.error('Waitlist email send failed:', emailErr);
    }

    return res.status(201).json({
      success: true,
      existing: false,
      position,
      code: accessCode,
      name: finalName,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
}
