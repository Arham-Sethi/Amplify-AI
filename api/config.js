// Public runtime config for the browser.
// Returns ONLY values that are safe to expose (Supabase URL + anon key).
// Never include SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, or other secrets here.

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ success: false, error: 'Config unavailable.' });
  }

  // Short cache — long enough to avoid hammering the endpoint,
  // short enough for fast key rotation.
  res.setHeader('Cache-Control', 'public, max-age=300');
  return res.status(200).json({ supabaseUrl, supabaseAnonKey });
}
