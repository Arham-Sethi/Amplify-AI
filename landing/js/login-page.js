// Login / signup page controller.
// Moved out of an inline <script> so it passes the site's CSP
// (which only allows scripts from 'self' and https://esm.sh).

import {
  signInWithProvider,
  signInWithEmail,
  signUpWithEmail,
} from '/js/supabase-client.js';

const params = new URLSearchParams(window.location.search);
const next = params.get('next') || '/account';
// Whitelist the next path to prevent open-redirect abuse.
const safeNext = /^\/[A-Za-z0-9_\-/]*$/.test(next) ? next : '/account';

const errorEl = document.getElementById('login-error');
const successEl = document.getElementById('login-success');
const submitBtn = document.getElementById('email-submit');
const passwordInput = document.getElementById('login-password');
const modePrompt = document.getElementById('mode-prompt');
const modeToggle = document.getElementById('mode-toggle');
const heading = document.getElementById('page-heading');
const sub = document.getElementById('page-sub');

let mode = 'signin'; // or 'signup'

function clearMessages() {
  errorEl.style.display = 'none';
  successEl.style.display = 'none';
}
function showError(msg) {
  clearMessages();
  errorEl.textContent = msg;
  errorEl.style.display = '';
}
function showSuccess(msg) {
  clearMessages();
  successEl.textContent = msg;
  successEl.style.display = '';
}

function applyMode() {
  if (mode === 'signin') {
    heading.innerHTML = 'Sign in to <span class="accent gradient-text">Amplify</span>';
    sub.textContent = 'Welcome back — enter your details below.';
    submitBtn.textContent = 'Sign in';
    passwordInput.autocomplete = 'current-password';
    modePrompt.textContent = 'New to Amplify?';
    modeToggle.textContent = 'Create an account';
  } else {
    heading.innerHTML = 'Create your <span class="accent gradient-text">Amplify</span> account';
    sub.textContent = 'Sign up with email to join the waitlist.';
    submitBtn.textContent = 'Create account';
    passwordInput.autocomplete = 'new-password';
    modePrompt.textContent = 'Already have an account?';
    modeToggle.textContent = 'Sign in';
  }
  clearMessages();
}

modeToggle.addEventListener('click', () => {
  mode = mode === 'signin' ? 'signup' : 'signin';
  applyMode();
});

async function handleOAuth(provider) {
  clearMessages();
  try {
    const { error } = await signInWithProvider(provider, safeNext);
    if (error) showError(error.message || 'Sign-in failed. Please try again.');
  } catch (err) {
    showError('Could not reach the sign-in service. Please try again.');
  }
}

document.getElementById('btn-google').addEventListener('click', () => handleOAuth('google'));
document.getElementById('btn-github').addEventListener('click', () => handleOAuth('github'));

document.getElementById('email-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessages();

  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please enter your email and password.');
    return;
  }

  const origLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = mode === 'signin' ? 'Signing in...' : 'Creating account...';

  try {
    if (mode === 'signin') {
      const { data, error } = await signInWithEmail(email, password);
      if (error) {
        showError(error.message || 'Invalid email or password.');
        return;
      }
      if (data?.session) window.location.replace(safeNext);
      else showError('Sign-in succeeded but no session was created. Please try again.');
    } else {
      const { data, error } = await signUpWithEmail(email, password, safeNext);
      if (error) {
        showError(error.message || 'Could not create account.');
        return;
      }
      if (data?.session) {
        // Email confirmation disabled — go straight in.
        window.location.replace(safeNext);
      } else {
        // Email confirmation required — user must click the link.
        showSuccess('Check your email to confirm your account, then sign in.');
        mode = 'signin';
        applyMode();
      }
    }
  } catch (err) {
    showError('Network error. Please check your connection and try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = origLabel;
  }
});
