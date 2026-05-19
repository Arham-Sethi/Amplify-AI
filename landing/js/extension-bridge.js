// Extension hand-off controller.
//
// Activates when the page is loaded with `?from=extension`. The user got
// here by clicking "Sign in to Amplify" in the extension popup. We need
// to:
//
//   1. Wait for the page's auth state to settle (the user might still be
//      finishing OAuth at this point).
//   2. Read the Supabase access token from the active session.
//   3. Post it via `window.postMessage` to our extension's content script
//      (amplify-bridge.js) which forwards it to the extension's
//      background worker, which persists it.
//   4. Show inline status feedback in #ext-bridge-status. We never echo
//      the token to the DOM.
//
// If the extension is not installed, the postMessage no-ops and the
// banner falls back to "Install the Amplify extension first." — we
// detect this via the absence of an `amplify-extension-installed`
// announcement message (the extension fires one on load).

import { onAuthChanged, getSession } from '/js/supabase-client.js';

const QUERY_KEY = 'from';
const QUERY_VALUE = 'extension';

const params = new URLSearchParams(window.location.search);
if (params.get(QUERY_KEY) !== QUERY_VALUE) {
  // Not an extension hand-off — exit silently. The rest of the account
  // page renders normally.
} else {
  runHandoff();
}

function runHandoff() {
  const banner = ensureBanner();
  setBannerStatus(banner, 'pending', 'Connecting to extension…');

  let extensionDetected = false;
  let ackReceived = false;

  // Listen for both the extension's installed announcement and its ack.
  // Both arrive via window.postMessage from the same origin.
  const onMessage = (event) => {
    if (event.source !== window) return;
    if (event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'amplify-extension-installed') {
      extensionDetected = true;
      return;
    }

    if (data.type === 'amplify-token-handoff-ack') {
      ackReceived = true;
      if (data.ok) {
        setBannerStatus(
          banner,
          'success',
          'Connected. You can close this tab and return to ChatGPT.'
        );
        // Strip ?from=extension from the URL so a refresh doesn't retry.
        const url = new URL(window.location.href);
        url.searchParams.delete(QUERY_KEY);
        window.history.replaceState({}, '', url.toString());
      } else {
        setBannerStatus(
          banner,
          'error',
          `Extension rejected the token (${data.error || 'unknown'}). Try signing in again.`
        );
      }
      window.removeEventListener('message', onMessage);
    }
  };
  window.addEventListener('message', onMessage);

  // Once auth settles, send the token. onAuthChanged fires with the
  // current user immediately and again on any auth change.
  onAuthChanged(async (user) => {
    if (!user) return; // wait for sign-in to complete
    const session = await getSession();
    const token = session?.access_token;
    if (!token) {
      setBannerStatus(banner, 'error', 'Could not read your session. Please refresh.');
      return;
    }
    window.postMessage(
      { type: 'amplify-token-handoff', token },
      window.location.origin
    );
  });

  // Fallback: if the extension didn't announce itself within 1500ms and
  // we never got an ack, assume it isn't installed.
  setTimeout(() => {
    if (!extensionDetected && !ackReceived) {
      setBannerStatus(
        banner,
        'error',
        'Amplify extension not detected. Install the extension, then refresh this page.'
      );
    }
  }, 1500);
}

/**
 * Build (or reuse) the status banner element. Inserted at the top of
 * <main> so it's the first thing the user sees.
 *
 * @returns {HTMLElement}
 */
function ensureBanner() {
  let el = document.getElementById('ext-bridge-status');
  if (el) return el;

  el = document.createElement('div');
  el.id = 'ext-bridge-status';
  el.setAttribute('role', 'status');
  el.style.cssText = [
    'margin: 16px auto',
    'max-width: 560px',
    'padding: 12px 16px',
    'border-radius: 12px',
    'font-size: 14px',
    'font-weight: 500',
    'text-align: center',
    'border: 1px solid transparent',
  ].join(';');

  const main = document.querySelector('main') || document.body;
  main.insertBefore(el, main.firstChild);
  return el;
}

/**
 * @param {HTMLElement} el
 * @param {'pending' | 'success' | 'error'} kind
 * @param {string} text
 */
function setBannerStatus(el, kind, text) {
  el.textContent = text;
  // Inline styles only — no class names, so we don't depend on style.css.
  if (kind === 'pending') {
    el.style.background = 'rgba(139, 92, 246, 0.08)';
    el.style.borderColor = 'rgba(139, 92, 246, 0.25)';
    el.style.color = '#5a4790';
  } else if (kind === 'success') {
    el.style.background = 'rgba(34, 197, 94, 0.08)';
    el.style.borderColor = 'rgba(34, 197, 94, 0.3)';
    el.style.color = '#1e7a3e';
  } else {
    el.style.background = 'rgba(239, 68, 68, 0.08)';
    el.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    el.style.color = '#a82828';
  }
}
