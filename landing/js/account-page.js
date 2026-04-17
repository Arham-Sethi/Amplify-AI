// Account page controller — extracted from inline <script> for CSP compliance.

import { getSession, getUser, getSupabase, signOut } from '/js/supabase-client.js';

const errorEl = document.getElementById('acc-error');
const notJoined = document.getElementById('not-joined-card');
const joined = document.getElementById('joined-card');
const emailLine = document.getElementById('account-email');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = '';
}

document.getElementById('btn-signout').addEventListener('click', async () => {
  await signOut();
  window.location.href = '/';
});

async function init() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login?next=' + encodeURIComponent('/account');
    return;
  }

  const user = await getUser();
  emailLine.textContent = user?.email || 'Signed in';

  // RLS policy lets the user read their own waitlist row (if any).
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('waitlist')
    .select('position, access_code')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    showError('Could not load your waitlist status.');
    notJoined.style.display = '';
    return;
  }

  if (data) {
    document.getElementById('acc-position').textContent = `#${data.position}`;
    document.getElementById('acc-code').textContent = data.access_code;
    joined.style.display = '';
  } else {
    notJoined.style.display = '';
  }
}

init();
