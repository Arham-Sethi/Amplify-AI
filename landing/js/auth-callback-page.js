// OAuth callback handler — extracted from inline <script> for CSP compliance.

import { getSupabase } from '/js/supabase-client.js';

const params = new URLSearchParams(window.location.search);
const next = params.get('next') || '/account';
// Same whitelist as login — prevent open-redirect abuse.
const safeNext = /^\/[A-Za-z0-9_\-/]*$/.test(next) ? next : '/account';
const statusEl = document.getElementById('status');

async function finish() {
  try {
    const supabase = getSupabase();
    // detectSessionInUrl: true (in client config) consumes the hash fragment
    // automatically. Wait briefly so the session is persisted.
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      statusEl.textContent = 'Could not complete sign-in. Redirecting you home…';
      setTimeout(() => { window.location.replace('/login'); }, 1500);
      return;
    }
    window.location.replace(safeNext);
  } catch (err) {
    statusEl.textContent = 'Something went wrong. Redirecting…';
    setTimeout(() => { window.location.replace('/login'); }, 1500);
  }
}

finish();
