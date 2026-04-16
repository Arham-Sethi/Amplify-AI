import { supabase } from '../lib/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { count, error } = await supabase
      .from('waitlist')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Count error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch count.' });
    }

    // Cache for 30 seconds to reduce DB load
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');

    return res.status(200).json({
      success: true,
      count: count || 0,
    });
  } catch (err) {
    console.error('Count error:', err);
    return res.status(500).json({ success: false, error: 'Something went wrong.' });
  }
}
