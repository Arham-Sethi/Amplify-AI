import { supabase } from '../lib/supabase.js';
import {
  validateEmail, sanitizeName, normalizeEmail,
  generateAccessCode, checkRateLimit,
} from '../lib/validate.js';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip, 5)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  }

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

    // Already on the list? Return the existing row.
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, name, access_code, position, user_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      // Backfill user_id if row pre-dates the auth requirement.
      if (!existing.user_id) {
        await supabase
          .from('waitlist')
          .update({ user_id: userId, email_verified: true })
          .eq('id', existing.id);
      }
      return res.status(200).json({
        success: true,
        existing: true,
        position: existing.position,
        code: existing.access_code,
        name: existing.name,
      });
    }

    // Compute next position from current row count.
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    const position = (count || 0) + 1;
    const accessCode = generateAccessCode();

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
