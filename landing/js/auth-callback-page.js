// OAuth callback handler — extracted from inline <script> for CSP compliance.

import { getSupabase } from '/js/supabase-client.js';

const params = new URLSearchParams(window.location.search);
const next = params.get('next') || '/account';
// Same whitelist as login — prevent open-redirect abuse.
const safeNext = /^\/[A-Za-z0-9_\-/]*$/.test(next) ? next : '/account';
const statusEl = document.getElementById('status');

// Fire-and-forget welcome email. /api/welcome is idempotent server-side
// (keyed off user_metadata.welcome_email_sent), so calling it on every
// sign-in is safe — only the first call actually sends mail.
async function triggerWelcomeEmail(accessToken) {
  try {
    await fetch('/api/welcome', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    // Email failures must not block the redirect — swallow silently.
  }
}

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

    // Kick off the welcome email in the background — don't await it, we
    // don't want to delay the redirect on email latency.
    triggerWelcomeEmail(data.session.access_token);

    window.location.replace(safeNext);
  } catch (err) {
    statusEl.textContent = 'Something went wrong. Redirecting…';
    setTimeout(() => { window.location.replace('/login'); }, 1500);
  }
}

finish();
