// Onboarding state machine.
//
// 3-step single-page flow that writes the user's preferences to
// public.user_settings via Supabase. Schema columns are exactly what the
// migration in apps/backend/supabase/migrations/2026_04_28_amplify_product.sql
// defines:
//
//   target_llm        text, one of: 'claude' | 'gpt' | 'gemini' | 'grok' | 'other'
//   tone              text, one of: 'work' | 'casual' | 'technical' | 'warm' | 'neutral'
//   work_context      text, ≤ 1000 chars
//   token_budget      integer, 256 .. 200000 (we leave at default 4096)
//   default_intensity text, one of: 'gentle' | 'medium' | 'aggressive'
//
// RLS allows the user to upsert/update their own row (policies
// `user_settings_upsert_own` and `user_settings_update_own`). The
// migration also auto-creates a default row on auth.users insert, so
// this flow is always an UPDATE in practice — but the upsert below
// handles either case.
//
// Why per-page JS instead of a framework: the entire build is plain
// HTML + ES modules to keep the landing site tiny, CSP strict
// (`script-src 'self'`), and merge-back-to-live-site frictionless.

import { getSession, getUser, getSupabase, onAuthChanged } from '/js/supabase-client.js'

// ── Schema constants ─────────────────────────────────────────────────────────
// Mirrors the CHECK constraints in the migration. Defence-in-depth: even
// if a malicious DOM tweak swaps a button's data-attribute, the upsert
// validates the value before sending. RLS then re-validates server-side.

const TARGET_LLMS = new Set(['claude', 'gpt', 'gemini', 'grok', 'other'])
const TONES = new Set(['work', 'casual', 'technical', 'warm', 'neutral'])
const INTENSITIES = new Set(['gentle', 'medium', 'aggressive'])
const WORK_CONTEXT_MAX = 1000

const INTENSITY_DESCRIPTIONS = {
  gentle:
    'Gentle — minimum touch. Fix only the worst issues, keep your voice intact.',
  medium:
    'Medium — balanced. The default. Tighten what\'s broken, leave what\'s working.',
  aggressive:
    'Aggressive — full restructure. Best for prompts that need to be rewritten from scratch.',
}

// ── State ────────────────────────────────────────────────────────────────────

const state = {
  step: 1,
  /** @type {'claude'|'gpt'|'gemini'|'grok'|'other'} */
  target_llm: 'claude',
  /** @type {'work'|'casual'|'technical'|'warm'|'neutral'} */
  tone: 'work',
  /** @type {'gentle'|'medium'|'aggressive'} */
  default_intensity: 'medium',
  work_context: '',
  /** @type {string|null} */
  userId: null,
  saving: false,
}

// ── DOM lookup ──────────────────────────────────────────────────────────────
// All queries done up front. If any required element is missing, we fail
// loud rather than silently dropping events.

const dom = {
  authNeeded: requireEl('#auth-needed'),
  progress: requireEl('#progress'),
  steps: {
    1: requireEl('#step-1'),
    2: requireEl('#step-2'),
    3: requireEl('#step-3'),
  },
  allDone: requireEl('#all-done'),
  actions: requireEl('#actions'),
  back: /** @type {HTMLButtonElement} */ (requireEl('#back-btn')),
  next: /** @type {HTMLButtonElement} */ (requireEl('#next-btn')),
  status: requireEl('#status'),
  targetGrid: requireEl('#target-llm-grid'),
  intensitySeg: requireEl('#intensity-seg'),
  toneSeg: requireEl('#tone-seg'),
  intensityDesc: requireEl('#intensity-desc'),
  workContext: /** @type {HTMLTextAreaElement} */ (requireEl('#work-context')),
  workContextCount: requireEl('#work-context-count'),
}

function requireEl(selector) {
  const el = document.querySelector(selector)
  if (!el) throw new Error(`onboarding: required element ${selector} missing`)
  return el
}

// ── Boot ─────────────────────────────────────────────────────────────────────

void boot()

async function boot() {
  // Hide the full UI until we've confirmed auth state — avoids a flash
  // of the form for unauthenticated users.
  hideAll()

  const session = await getSession()
  if (!session) {
    showAuthGate()
    // Watch for sign-in via another tab (Supabase emits storage events
    // that propagate the session). When auth flips to signed-in, swap
    // out the gate and proceed normally.
    onAuthChanged((user) => {
      if (user) {
        state.userId = user.id
        showFlow()
        loadExistingSettings(user.id)
      }
    })
    return
  }

  const user = await getUser()
  if (!user) {
    showAuthGate()
    return
  }

  state.userId = user.id
  showFlow()
  await loadExistingSettings(user.id)
}

// ── View toggles ─────────────────────────────────────────────────────────────

function hideAll() {
  dom.authNeeded.classList.remove('active')
  dom.allDone.classList.remove('active')
  for (const el of Object.values(dom.steps)) el.classList.remove('active')
  dom.progress.style.display = 'none'
  dom.actions.style.display = 'none'
}

function showAuthGate() {
  hideAll()
  dom.authNeeded.classList.add('active')
}

function showFlow() {
  hideAll()
  dom.progress.style.display = ''
  dom.actions.style.display = ''
  renderStep()
  bindEvents()
}

function showDone() {
  hideAll()
  dom.allDone.classList.add('active')
}

function renderStep() {
  for (const [n, el] of Object.entries(dom.steps)) {
    el.classList.toggle('active', Number(n) === state.step)
  }
  for (const node of dom.progress.querySelectorAll('.progress-step')) {
    const s = Number(node.getAttribute('data-step'))
    node.classList.remove('active', 'done')
    if (s < state.step) node.classList.add('done')
    else if (s === state.step) node.classList.add('active')
  }
  dom.back.disabled = state.step === 1 || state.saving
  dom.next.textContent = state.step === 3 ? 'Save and finish' : 'Continue'
  dom.next.disabled = state.saving
  dom.progress.setAttribute('aria-valuenow', String(state.step))
}

// ── Existing-settings prefill ────────────────────────────────────────────────

async function loadExistingSettings(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('user_settings')
    .select('target_llm, tone, work_context, default_intensity')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    setStatus('Could not load your existing preferences. Defaults shown.', 'error')
    return
  }
  if (!data) return // brand new user, defaults already in `state`

  if (typeof data.target_llm === 'string' && TARGET_LLMS.has(data.target_llm)) {
    state.target_llm = data.target_llm
  }
  if (typeof data.tone === 'string' && TONES.has(data.tone)) {
    state.tone = data.tone
  }
  if (
    typeof data.default_intensity === 'string' &&
    INTENSITIES.has(data.default_intensity)
  ) {
    state.default_intensity = data.default_intensity
  }
  if (typeof data.work_context === 'string') {
    state.work_context = data.work_context.slice(0, WORK_CONTEXT_MAX)
  }

  syncDomFromState()
}

function syncDomFromState() {
  syncRadioGroup(dom.targetGrid, 'target-llm', state.target_llm)
  syncRadioGroup(dom.intensitySeg, 'intensity', state.default_intensity)
  syncRadioGroup(dom.toneSeg, 'tone', state.tone)
  dom.intensityDesc.textContent = INTENSITY_DESCRIPTIONS[state.default_intensity]
  dom.workContext.value = state.work_context
  dom.workContextCount.textContent = String(state.work_context.length)
}

function syncRadioGroup(container, dataKey, current) {
  for (const btn of container.querySelectorAll(`[data-${dataKey}]`)) {
    const value = btn.getAttribute(`data-${dataKey}`)
    btn.setAttribute('aria-pressed', value === current ? 'true' : 'false')
  }
}

// ── Event wiring ─────────────────────────────────────────────────────────────

function bindEvents() {
  // Single-select radio-group click handlers via event delegation.
  bindRadioGroup(dom.targetGrid, 'target-llm', TARGET_LLMS, (val) => {
    state.target_llm = /** @type {typeof state.target_llm} */ (val)
  })
  bindRadioGroup(dom.intensitySeg, 'intensity', INTENSITIES, (val) => {
    state.default_intensity = /** @type {typeof state.default_intensity} */ (val)
    dom.intensityDesc.textContent = INTENSITY_DESCRIPTIONS[state.default_intensity]
  })
  bindRadioGroup(dom.toneSeg, 'tone', TONES, (val) => {
    state.tone = /** @type {typeof state.tone} */ (val)
  })

  dom.workContext.addEventListener('input', () => {
    const v = dom.workContext.value.slice(0, WORK_CONTEXT_MAX)
    if (v !== dom.workContext.value) dom.workContext.value = v
    state.work_context = v
    dom.workContextCount.textContent = String(v.length)
  })

  dom.back.addEventListener('click', () => {
    if (state.step > 1 && !state.saving) {
      state.step -= 1
      setStatus('', '')
      renderStep()
    }
  })
  dom.next.addEventListener('click', () => {
    if (state.saving) return
    if (state.step < 3) {
      state.step += 1
      setStatus('', '')
      renderStep()
    } else {
      void save()
    }
  })

  // Initial render reflects the loaded state.
  syncDomFromState()
}

function bindRadioGroup(container, dataKey, allowed, onPick) {
  container.addEventListener('click', (ev) => {
    const target = /** @type {Element} */ (ev.target)
    const btn = target.closest(`[data-${dataKey}]`)
    if (!btn || !container.contains(btn)) return
    const value = btn.getAttribute(`data-${dataKey}`)
    if (!value || !allowed.has(value)) return
    onPick(value)
    syncRadioGroup(container, dataKey, value)
  })
}

// ── Save ─────────────────────────────────────────────────────────────────────

async function save() {
  if (!state.userId) {
    setStatus('Please sign in first.', 'error')
    return
  }

  // Last-mile validation. If anything looks off, refuse to send.
  const payload = {
    user_id: state.userId,
    target_llm: TARGET_LLMS.has(state.target_llm) ? state.target_llm : 'claude',
    tone: TONES.has(state.tone) ? state.tone : 'work',
    default_intensity: INTENSITIES.has(state.default_intensity)
      ? state.default_intensity
      : 'medium',
    work_context: state.work_context.slice(0, WORK_CONTEXT_MAX),
  }

  state.saving = true
  renderStep()
  setStatus('Saving…', 'pending')

  const supabase = getSupabase()
  const { error } = await supabase
    .from('user_settings')
    .upsert(payload, { onConflict: 'user_id' })

  state.saving = false

  if (error) {
    renderStep()
    setStatus(`Save failed: ${error.message}`, 'error')
    return
  }

  setStatus('Saved.', 'success')
  showDone()
}

function setStatus(text, kind) {
  dom.status.textContent = text
  dom.status.className = kind ? `status ${kind}` : 'status'
}

// ── Test seam ────────────────────────────────────────────────────────────────
// Exporting state + helpers via window so a future Playwright test can
// drive the flow without round-tripping the DOM. Not an open API for
// callers — the underscore prefix marks it private.
if (typeof window !== 'undefined') {
  /** @type {any} */ (window).__amplify_onboarding = {
    state,
    save,
    TARGET_LLMS,
    TONES,
    INTENSITIES,
  }
}
