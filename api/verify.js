import { supabase } from '../lib/supabase.js';

const appUrl = process.env.APP_URL || 'https://amplifyai.com';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { token } = req.query;

  if (!token || typeof token !== 'string' || token.length !== 64) {
    return res.redirect(302, `${appUrl}/?verified=invalid`);
  }

  try {
    // Find user by verification token
    const { data: user } = await supabase
      .from('waitlist')
      .select('id, email_verified, verification_expires_at')
      .eq('verification_token', token)
      .single();

    if (!user) {
      return res.redirect(302, `${appUrl}/?verified=invalid`);
    }

    // Check if already verified
    if (user.email_verified) {
      return res.redirect(302, `${appUrl}/?verified=already`);
    }

    // Check token expiration
    if (new Date(user.verification_expires_at) < new Date()) {
      return res.redirect(302, `${appUrl}/?verified=expired`);
    }

    // Mark as verified and clear the token
    const { error: updateError } = await supabase
      .from('waitlist')
      .update({
        email_verified: true,
        verification_token: null,
        verification_expires_at: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Verify update error:', updateError);
      return res.redirect(302, `${appUrl}/?verified=error`);
    }

    return res.redirect(302, `${appUrl}/?verified=success`);
  } catch (err) {
    console.error('Verify error:', err);
    return res.redirect(302, `${appUrl}/?verified=error`);
  }
}
