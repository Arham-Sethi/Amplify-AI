// Account-page preferences.
//
// Loads (or creates) the user's row in public.user_settings and renders
// it into a small form. On submit, upserts via the Supabase JS client —
// RLS policies user_settings_upsert_own / user_settings_update_own scope
// the write to the caller's own user_id.
//
// The Amplify backend treats user_settings values as DEFAULTS; the
// extension still passes per-request `target_llm` / `tone` / `intensity`
// in /api/rewrite, and those win when supplied. The settings here only
// kick in when a request omits a field or future code reads them.
//
// The module is loaded as a separate ES module from account.html. It
// runs in parallel with account-page.js and account-history.js. If the
// user is unauthenticated, account-page.js owns the redirect; this
// module hides its own section quietly.

import { getSession, getUser, getSupabase } from '/js/supabase-client.js';

const TARGET_LLMS  = new Set(['claude', 'gpt', 'gemini', 'grok', 'other']);
const TONES        = new Set(['work', 'casual', 'technical', 'warm', 'neutral']);
const INTENSITIES  = new Set(['gentle', 'medium', 'aggressive']);

const TOKEN_MIN = 256;
const TOKEN_MAX = 200000;
const WORK_CONTEXT_MAX = 1000;

const DEFAULTS = Object.freeze({
  target_llm: 'claude',
  tone: 'work',
  default_intensity: 'medium',
  work_context: '',
  token_budget: 4096,
});

const sectionEl = document.getElementById('prefs-section');
const formEl    = document.getElementById('prefs-form');
const statusEl  = document.getElementById('pf-status');
const wcCountEl = document.getElementById('pf-wc-count');
const wcEl      = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('pf-work_context'));
const saveBtn   = /** @type {HTMLButtonElement | null} */ (document.getElementById('pf-save'));

if (sectionEl && formEl) {
  init().catch((err) => {
    console.debug('[Amplify prefs] init failed:', err?.message || err);
    setStatus('Could not load your preferences.', 'error');
  });
}

async function init() {
  const session = await getSession();
  if (!session) { hideSection(); return; }
  const user = await getUser();
  if (!user)    { hideSection(); return; }

  await loadInto(user);

  // Live char counter on the work_context field.
  if (wcEl && wcCountEl) {
    const update = () => { wcCountEl.textContent = String(wcEl.value.length); };
    wcEl.addEventListener('input', update);
    update();
  }

  formEl.addEventListener('submit', (ev) => {
    ev.preventDefault();
    save(user).catch((err) => {
      console.error('[Amplify prefs] save failed:', err);
      setStatus('Save failed. Try again.', 'error');
      if (saveBtn) saveBtn.disabled = false;
    });
  });
}

function hideSection() {
  if (sectionEl) sectionEl.style.display = 'none';
}

async function loadInto(user) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('user_settings')
    .select('target_llm, tone, work_context, token_budget, default_intensity')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    setStatus('Could not load your preferences.', 'error');
    return;
  }

  // If no row yet, keep the HTML defaults (which mirror DEFAULTS above).
  applyToForm(data || DEFAULTS);
}

/**
 * @param {{
 *   target_llm?: string|null,
 *   tone?: string|null,
 *   work_context?: string|null,
 *   token_budget?: number|null,
 *   default_intensity?: string|null,
 * }} s
 */
function applyToForm(s) {
  setSelect('pf-target_llm', s.target_llm, TARGET_LLMS, DEFAULTS.target_llm);
  setSelect('pf-tone',       s.tone,       TONES,       DEFAULTS.tone);
  setRadio('default_intensity', s.default_intensity, INTENSITIES, DEFAULTS.default_intensity);
  setText('pf-work_context', typeof s.work_context === 'string' ? s.work_context : DEFAULTS.work_context);
  setNumber('pf-token_budget', s.token_budget, TOKEN_MIN, TOKEN_MAX, DEFAULTS.token_budget);
}

function setSelect(id, val, allowed, fallback) {
  const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
  if (!el) return;
  el.value = (typeof val === 'string' && allowed.has(val)) ? val : fallback;
}
function setRadio(name, val, allowed, fallback) {
  const target = (typeof val === 'string' && allowed.has(val)) ? val : fallback;
  const radio = /** @type {HTMLInputElement | null} */ (
    document.querySelector(`input[name="${name}"][value="${target}"]`)
  );
  if (radio) radio.checked = true;
}
function setText(id, val) {
  const el = /** @type {HTMLTextAreaElement | null} */ (document.getElementById(id));
  if (el) el.value = String(val).slice(0, WORK_CONTEXT_MAX);
}
function setNumber(id, val, min, max, fallback) {
  const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
  if (!el) return;
  const n = typeof val === 'number' ? val : Number(val);
  el.value = String(Number.isFinite(n) && n >= min && n <= max ? n : fallback);
}

async function save(user) {
  if (saveBtn) saveBtn.disabled = true;
  setStatus('Saving\u2026', 'pending');

  const payload = {
    user_id: user.id,
    target_llm:        getSelectVal('pf-target_llm', TARGET_LLMS, DEFAULTS.target_llm),
    tone:              getSelectVal('pf-tone',       TONES,       DEFAULTS.tone),
    default_intensity: getRadioVal('default_intensity', INTENSITIES, DEFAULTS.default_intensity),
    work_context:      (wcEl ? wcEl.value : '').slice(0, WORK_CONTEXT_MAX),
    token_budget:      clamp(intVal('pf-token_budget', DEFAULTS.token_budget), TOKEN_MIN, TOKEN_MAX),
  };

  const supabase = getSupabase();
  const { error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' });

  if (saveBtn) saveBtn.disabled = false;

  if (error) {
    setStatus('Save failed. Try again.', 'error');
    return;
  }
  setStatus('Saved.', 'success');
  // Fade the status after a beat — but only if it's still saying "Saved".
  setTimeout(() => {
    if (statusEl && statusEl.dataset.kind === 'success') setStatus('', '');
  }, 2400);
}

function getSelectVal(id, allowed, fallback) {
  const el = /** @type {HTMLSelectElement | null} */ (document.getElementById(id));
  const v = el && typeof el.value === 'string' ? el.value : '';
  return allowed.has(v) ? v : fallback;
}
function getRadioVal(name, allowed, fallback) {
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  for (const r of radios) {
    const input = /** @type {HTMLInputElement} */ (r);
    if (input.checked && allowed.has(input.value)) return input.value;
  }
  return fallback;
}
function intVal(id, fallback) {
  const el = /** @type {HTMLInputElement | null} */ (document.getElementById(id));
  if (!el) return fallback;
  const n = parseInt(el.value, 10);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setStatus(text, kind) {
  if (!statusEl) return;
  statusEl.textContent = text;
  statusEl.dataset.kind = kind || '';
  statusEl.className = `prefs-status${kind ? ` prefs-status-${kind}` : ''}`;
}
