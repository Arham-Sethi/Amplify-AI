// Waitlist-confirm decision page — extracted from inline <script> for CSP compliance.

import { getSession, getUser } from '/js/supabase-client.js';

const errorEl = document.getElementById('confirm-error');
const choiceCard = document.getElementById('choice-card');
const alreadyCard = document.getElementById('already-card');
const helloLine = document.getElementById('hello-line');
const joinBtn = document.getElementById('btn-join');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = '';
}

async function init() {
  const session = await getSession();
  if (!session) {
    window.location.href = '/login?next=' + encodeURIComponent('/waitlist-confirm');
    return;
  }

  const user = await getUser();
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
  if (name) helloLine.textContent = `Ready to claim your spot, ${name}?`;
}

joinBtn.addEventListener('click', async () => {
  errorEl.style.display = 'none';
  joinBtn.disabled = true;
  joinBtn.textContent = 'Joining...';

  try {
    const session = await getSession();
    if (!session) {
      window.location.href = '/login?next=' + encodeURIComponent('/waitlist-confirm');
      return;
    }

    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json();

    if (!data.success) {
      showError(data.error || 'Could not join the waitlist. Please try again.');
      joinBtn.disabled = false;
      joinBtn.textContent = 'Join the Waitlist';
      return;
    }

    document.getElementById('already-position').textContent = `#${data.position}`;
    document.getElementById('already-code').textContent = data.code;
    choiceCard.style.display = 'none';
    alreadyCard.style.display = '';
  } catch (err) {
    showError('Network error. Please try again.');
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join the Waitlist';
  }
});

init();
