// Account-page prompt history.
//
// Renders the signed-in user's last N prompt_logs rows in the "Recent
// activity" card. Reads directly from the browser using the anon Supabase
// client — RLS scopes results to the user's own rows
// (policy `prompt_logs_read_own` in supabase/migrations/2026_04_28_amplify_product.sql).
//
// We only ever display scrubbed text (`prompt_scrubbed`,
// `rewritten_scrubbed`). The retention job in pg_cron nulls those columns
// after 7 days, so older rows render as a chip-only summary — that's
// intentional, not a bug.
//
// The module is loaded as a separate <script type="module"> from
// account.html. It runs in parallel with `account-page.js`; if the user
// isn't signed in, account-page.js handles the redirect and this module
// simply no-ops.

import { getSession, getUser, getSupabase } from '/js/supabase-client.js';

const MAX_ROWS = 20;
const PROMPT_PREVIEW_CHARS = 160;

const sectionEl = document.getElementById('prompt-history-section');
const listEl    = document.getElementById('ph-list');
const emptyEl   = document.getElementById('ph-empty');
const loadingEl = document.getElementById('ph-loading');
const errorEl   = document.getElementById('ph-error');

if (sectionEl && listEl) {
  init().catch((err) => {
    // Never throw past the module boundary — degrade silently with a
    // status line. The waitlist card above us must still work.
    console.debug('[Amplify history] init failed:', err?.message || err);
    showError('Could not load your activity.');
  });
}

async function init() {
  const session = await getSession();
  if (!session) {
    // account-page.js owns the redirect to /login. Hide our section so
    // the redirect doesn't leave a broken card flashed on screen.
    if (sectionEl) sectionEl.style.display = 'none';
    return;
  }

  const user = await getUser();
  if (!user) {
    if (sectionEl) sectionEl.style.display = 'none';
    return;
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('prompt_logs')
    .select(
      'id, kind, category, is_vague, score_before, score_after, ' +
      'intensity, prompt_scrubbed, rewritten_scrubbed, created_at'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS);

  hide(loadingEl);

  if (error) {
    showError('Could not load your activity.');
    return;
  }

  if (!data || data.length === 0) {
    show(emptyEl);
    return;
  }

  // Wipe any prior render (e.g. from a previous auth state) before
  // appending. Defensive — under normal flow this is empty.
  while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
  for (const row of data) {
    listEl.appendChild(renderRow(row));
  }
}

function show(el) { if (el) el.style.display = ''; }
function hide(el) { if (el) el.style.display = 'none'; }
function showError(text) {
  hide(loadingEl);
  if (errorEl) {
    errorEl.textContent = text;
    show(errorEl);
  }
}

/**
 * Build one row's <li>. textContent only — never innerHTML — because the
 * scrubbed prompt is still user-controlled text and we don't want HTML
 * rendering inside the card.
 *
 * @param {{
 *   id: string,
 *   kind: 'classify' | 'grade' | 'rewrite' | 'compress',
 *   category: string | null,
 *   is_vague: boolean | null,
 *   score_before: number | null,
 *   score_after: number | null,
 *   intensity: string | null,
 *   prompt_scrubbed: string | null,
 *   rewritten_scrubbed: string | null,
 *   created_at: string,
 * }} row
 * @returns {HTMLLIElement}
 */
function renderRow(row) {
  const li = document.createElement('li');
  li.className = 'ph-item';

  const meta = document.createElement('div');
  meta.className = 'ph-meta';

  const time = document.createElement('span');
  time.className = 'ph-time';
  time.textContent = relTime(row.created_at);
  time.setAttribute('title', new Date(row.created_at).toLocaleString());
  meta.appendChild(time);

  meta.appendChild(chip(`ph-chip ph-chip-${row.kind}`, humanKind(row.kind)));

  if (row.category) {
    meta.appendChild(chip('ph-chip ph-chip-cat', humanCategory(row.category)));
  }
  if (row.is_vague) {
    meta.appendChild(chip('ph-chip ph-chip-vague', 'vague'));
  }
  if (row.intensity && row.kind === 'rewrite') {
    meta.appendChild(chip('ph-chip ph-chip-intensity', row.intensity));
  }

  const score = scoreLabel(row);
  if (score) {
    meta.appendChild(chip('ph-chip ph-chip-score', score));
  }

  li.appendChild(meta);

  // Prompt preview — null after the 7-day text retention job runs.
  if (row.prompt_scrubbed) {
    const promptP = document.createElement('p');
    promptP.className = 'ph-prompt';
    promptP.textContent = truncate(row.prompt_scrubbed, PROMPT_PREVIEW_CHARS);
    li.appendChild(promptP);
  } else {
    const placeholder = document.createElement('p');
    placeholder.className = 'ph-prompt ph-prompt-placeholder';
    placeholder.textContent = 'Prompt text retained 7 days; this entry is older.';
    li.appendChild(placeholder);
  }

  return li;
}

/**
 * @param {string} className
 * @param {string} text
 * @returns {HTMLSpanElement}
 */
function chip(className, text) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function scoreLabel(row) {
  const before = typeof row.score_before === 'number' ? row.score_before : null;
  const after  = typeof row.score_after  === 'number' ? row.score_after  : null;
  if (before !== null && after !== null) return `${before} \u2192 ${after}`;
  if (before !== null) return `score ${before}/100`;
  if (after  !== null) return `score ${after}/100`;
  return '';
}

function humanKind(k) {
  switch (k) {
    case 'classify': return 'classify';
    case 'grade':    return 'grade';
    case 'rewrite':  return 'rewrite';
    case 'compress': return 'compress';
    default:         return String(k || '');
  }
}

function humanCategory(c) {
  switch (c) {
    case 'task_only':              return 'Single task';
    case 'context_heavy':          return 'Context-heavy';
    case 'multi_step_workflow':    return 'Multi-step';
    case 'role_persona':           return 'Role / persona';
    case 'debug_fix':              return 'Debug / fix';
    case 'open_ended_generation':  return 'Open-ended';
    default:                       return c;
  }
}

function truncate(s, n) {
  if (typeof s !== 'string') return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + '\u2026';
}

function relTime(iso) {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const sec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (sec < 60)        return `${sec}s ago`;
  const min = Math.round(sec / 60);
  if (min < 60)        return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24)         return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30)        return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
