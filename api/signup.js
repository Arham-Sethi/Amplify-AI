import { supabase } from '../lib/supabase.js';
import {
  validateEmail, sanitizeName, normalizeEmail,
  generateAccessCode, generateVerificationToken,
  jsonOk, jsonError, checkRateLimit,
} from '../lib/validate.js';
import { sendVerificationEmail } from '../lib/email.js';

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
    const { email, name } = req.body || {};

    // Validate email
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const sanitizedName = sanitizeName(name || '');

    // Check for existing user
    const { data: existing } = await supabase
      .from('waitlist')
      .select('id, email, name, access_code, position, email_verified')
      .eq('email', normalizedEmail)
      .single();

    if (existing) {
      // Return existing user info (don't reveal if verified or not for security)
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
    const verificationToken = generateVerificationToken();
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    // Insert new user
    const { error: insertError } = await supabase
      .from('waitlist')
      .insert({
        email: normalizedEmail,
        name: sanitizedName || null,
        access_code: accessCode,
        position,
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

    // Send verification email (non-blocking — don't fail signup if email fails)
    try {
      await sendVerificationEmail({
        email: normalizedEmail,
        name: sanitizedName,
        token: verificationToken,
        code: accessCode,
        position,
      });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Signup still succeeds even if email fails
    }

    return res.status(201).json({
      success: true,
      existing: false,
      position,
      code: accessCode,
      name: sanitizedName,
    });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
}
