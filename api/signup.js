import { supabase } from '../lib/supabase.js';
import {
  validateEmail, sanitizeName, normalizeEmail,
  generateAccessCode, generateVerificationToken,
  checkRateLimit,
} from '../lib/validate.js';
import { sendVerificationEmail } from '../lib/email.js';

// If an Authorization: Bearer <token> header is present, verify it with the
// Supabase service-role client and return the authenticated user (or null
// if the token is invalid). Called before falling back to email-in-body.
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
    // Prefer authenticated identity from Supabase OAuth session; fall back
    // to email+name in the body for the legacy unauthenticated path.
    const authed = await getAuthedUser(req);

    let email;
    let rawName;
    let userId = null;
    let emailPreVerified = false;

    if (authed) {
      // OAuth path — trust the token, ignore any spoofed body fields.
      email = authed.email;
      rawName = authed.user_metadata?.full_name || authed.user_metadata?.name || '';
      userId = authed.id;
      emailPreVerified = true;
    } else {
      const body = req.body || {};
      email = body.email;
      rawName = body.name;
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const sanitizedName = sanitizeName(rawName || '');

    // Name is required for anonymous signups. OAuth signups may arrive
    // without a name (GitHub often omits full_name) — in that case we fall
    // back to the local-part of the email so the row still has a label.
    if (!authed && !sanitizedName) {
      return res.status(400).json({ success: false, error: 'Please enter your name.' });
    }
    const finalName = sanitizedName || (authed ? normalizedEmail.split('@')[0] : '');

    // Check for existing user
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, email, name, access_code, position, email_verified, user_id')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      // Backfill user_id if this email was previously on the waitlist as
      // anonymous and is now being claimed by an OAuth sign-in.
      if (authed && !existing.user_id) {
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

    // Get next position
    const { count } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    const position = (count || 0) + 1;
    const accessCode = generateAccessCode();
    const verificationToken = emailPreVerified ? null : generateVerificationToken();
    const verificationExpiresAt = emailPreVerified
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // Insert new user
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        name: finalName,
        access_code: accessCode,
        position,
        user_id: userId,
        email_verified: emailPreVerified,
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt,
      });

    if (insertError) {
      // Handle race condition (duplicate email)
      if (insertError.code === '23505') {
        return res.status(409).json({ success: false, error: 'This email is already on the waitlist.' });
      }
      console.error('Insert error:', insertError);
      return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
    }

    // Send verification email for anonymous signups only.
    // OAuth signups skip this — the provider already verified the email.
    if (!emailPreVerified) {
      try {
        await sendVerificationEmail({
          email: normalizedEmail,
          name: finalName,
          token: verificationToken,
          code: accessCode,
          position,
        });
      } catch (emailErr) {
        console.error('Email send error:', emailErr);
        // Signup still succeeds even if email fails
      }
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
