import { supabase } from '../lib/supabase.js';
import {
  validateEmail, validateCode, normalizeEmail,
  jsonError, checkRateLimit,
} from '../lib/validate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // Rate limit by IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip, 10)) {
    return res.status(429).json({ success: false, error: 'Too many requests. Please try again later.' });
  }

  try {
    const { email, code } = req.body || {};

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    if (!code || !validateCode(code)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid access code (AMP-XXXXXX).' });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedCode = code.trim().toUpperCase();

    // Look up user by email
    const { data: user } = await supabase
      .from('waitlist')
      .select('id, email, name, access_code, position')
      .eq('email', normalizedEmail)
      .single();

    // Use generic error to prevent email enumeration
    if (!user || user.access_code !== normalizedCode) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or access code. Please check and try again.',
      });
    }

    return res.status(200).json({
      success: true,
      name: user.name,
      position: user.position,
      code: user.access_code,
    });
  } catch (err) {
    console.error('Check error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong. Please try again.' });
  }
}
