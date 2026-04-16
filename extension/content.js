// ============================================
// Amplify AI — Hardcoded Demo Content Script
// Works on ChatGPT (chatgpt.com / chat.openai.com)
// Supports 2 trigger prompts for demo recording
// ============================================

(() => {
  'use strict';

  // --- HARDCODED DEMO PROMPTS ---
  // Each entry: { trigger, transformed, techniques }

  const DEMO_PROMPTS = [
    {
      // PROMPT 1: Meal plan (general/health)
      trigger: 'write me a meal plan for losing weight',
      techniques: ['Role Assignment', 'Specificity Injection', 'Chain-of-Thought', 'Output Format', 'Negative Constraints'],
      transformed: `You are an expert registered dietitian with 15 years of clinical experience in evidence-based weight management. [Role Assignment]

Create a detailed 7-day meal plan for a 35-year-old sedentary adult (5'10", 185 lbs), targeting sustainable fat loss of 1-2 lbs/week while maintaining muscle mass and energy levels. [Specificity Injection]

First, calculate the target daily calorie intake using the Mifflin-St Jeor equation with a 500-calorie deficit. Then design meals around that target. [Chain-of-Thought]

Requirements:
- Target ~1,600-1,800 kcal/day with a 40/30/30 macro split (protein/carbs/fat)
- Include 3 meals + 2 snacks per day
- Use widely available, budget-friendly ingredients (under $75/week grocery cost)
- Incorporate meal prep efficiency — flag which meals can be batch-cooked on Sunday
- Ensure variety across the week to prevent diet fatigue

Output format: Present as a structured table (Day | Meal | Dish | Calories | Protein). End with a consolidated grocery list grouped by store section (produce, protein, dairy, pantry). [Output Format]

Constraints: No supplements, juice cleanses, extreme restriction diets, or non-food-based recommendations. All meals should be satisfying and sustainable long-term. Flag any common allergen ingredients with [A]. [Negative Constraints]

I will evaluate this on: nutritional accuracy, practical feasibility for a busy professional, and grocery cost efficiency. [Evaluation Criteria]`,
    },
    {
      // PROMPT 2: Professional project (presentation for board meeting)
      trigger: 'make me a presentation about our q3 sales results for the board meeting',
      techniques: ['Role Assignment', 'Context Framing', 'Task Decomposition', 'Output Format', 'Chain-of-Thought', 'Negative Constraints'],
      transformed: `You are a senior strategy consultant who prepares executive presentations for Fortune 500 boards. You specialize in translating operational data into strategic narratives that drive board-level decisions. [Role Assignment]

Create a comprehensive 12-slide outline for a Q3 Sales Results presentation to our board of directors. The audience consists of non-operational executives — they care about trends, risks, competitive positioning, and strategic implications, not granular operational data. [Context Framing]

Structure the narrative using this proven executive presentation framework: [Task Decomposition]
1. Executive Summary (1 slide) — headline metrics, one-sentence performance verdict
2. Q3 KPIs vs Targets (2 slides) — revenue, margin, customer acquisition, retention
3. Segment Performance Breakdown (2 slides) — top-performing and underperforming segments with root cause analysis
4. Competitive Landscape (1 slide) — market share shifts, competitor moves
5. Pipeline & Leading Indicators (1 slide) — what Q3 data tells us about Q4 trajectory
6. Risks & Headwinds (1 slide) — macroeconomic, operational, competitive risks ranked by impact
7. Strategic Recommendations (2 slides) — data-backed actions with expected ROI
8. Appendix (2 slides) — detailed data tables for reference during Q&A

For each slide, provide: slide title, 3-4 bullet points of content, speaker notes (what the presenter should say), and recommended visual (specific chart type with axis labels). [Output Format]

Think step by step about what a board member would likely ask after each slide, and preemptively address those questions in the speaker notes. [Chain-of-Thought]

Do not include: individual sales rep performance, internal team dynamics, jargon requiring sales operations context, or data without comparative benchmarks (always show vs. target, vs. prior quarter, vs. prior year). Keep language at C-suite level. [Negative Constraints]

Quality bar: this should match the standard of a McKinsey or Bain board presentation. [Evaluation Criteria]`,
    },
  ];

  const TYPING_SPEED_MS = 12;
  const POPUP_DELAY_MS = 800;

  // --- STATE ---
  let popupShown = false;
  let popupEl = null;
  let isTransforming = false;

  // --- TEXTAREA DETECTION ---
  const TEXTAREA_SELECTORS = [
    '#prompt-textarea',
    'div[contenteditable="true"][data-placeholder]',
    'div[contenteditable="true"].ProseMirror',
    'textarea[data-id="root"]',
  ];

  function findTextarea() {
    for (const sel of TEXTAREA_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  // --- UNDERLINE EFFECT ---
  function addUnderline(textarea) {
    const wrapper = textarea.closest('div[class]') || textarea.parentElement;
    if (wrapper) wrapper.classList.add('amplify-underline-active');
  }

  function removeUnderline(textarea) {
    const wrapper = textarea.closest('div[class]') || textarea.parentElement;
    if (wrapper) wrapper.classList.remove('amplify-underline-active');
  }

  // --- FIND MATCHING PROMPT ---
  function findMatchingPrompt(text) {
    const normalized = text.trim().toLowerCase();
    return DEMO_PROMPTS.find(p => normalized === p.trigger);
  }

  // --- POPUP ---
  function createPopup(textarea, promptData) {
    const popup = document.createElement('div');
    popup.className = 'amplify-popup amplify-popup-enter';

    // Safe DOM construction — no innerHTML with dynamic data
    const closeBtn = document.createElement('button');
    closeBtn.className = 'amplify-popup-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00D7';
    popup.appendChild(closeBtn);

    const header = document.createElement('div');
    header.className = 'amplify-popup-header';
    const logo = document.createElement('div');
    logo.className = 'amplify-popup-logo';
    logo.textContent = '[.o|.o]';
    const brand = document.createElement('span');
    brand.className = 'amplify-popup-brand';
    brand.textContent = 'Amplify';
    header.appendChild(logo);
    header.appendChild(brand);
    popup.appendChild(header);

    const msg = document.createElement('p');
    msg.className = 'amplify-popup-message';
    const msgStrong = document.createElement('strong');
    msgStrong.textContent = 'Get 5x better responses';
    msg.appendChild(msgStrong);
    msg.appendChild(document.createTextNode(' \u2014 Amplify can optimize this prompt using advanced prompt engineering.'));
    popup.appendChild(msg);

    const techDiv = document.createElement('div');
    techDiv.className = 'amplify-techniques';
    promptData.techniques.forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'amplify-technique-tag';
      tag.textContent = t;
      techDiv.appendChild(tag);
    });
    popup.appendChild(techDiv);

    const metric = document.createElement('div');
    metric.className = 'amplify-metric';
    const metricSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    metricSvg.setAttribute('width', '12');
    metricSvg.setAttribute('height', '12');
    metricSvg.setAttribute('viewBox', '0 0 24 24');
    metricSvg.setAttribute('fill', 'none');
    metricSvg.setAttribute('stroke', 'currentColor');
    metricSvg.setAttribute('stroke-width', '2.5');
    metricSvg.setAttribute('stroke-linecap', 'round');
    metricSvg.setAttribute('stroke-linejoin', 'round');
    const poly1 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly1.setAttribute('points', '23 6 13.5 15.5 8.5 10.5 1 18');
    const poly2 = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly2.setAttribute('points', '17 6 23 6 23 12');
    metricSvg.appendChild(poly1);
    metricSvg.appendChild(poly2);
    metric.appendChild(metricSvg);
    metric.appendChild(document.createTextNode(' Estimated 5x response quality improvement'));
    popup.appendChild(metric);

    const transformBtn = document.createElement('button');
    transformBtn.className = 'amplify-popup-btn';
    const btnSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    btnSvg.setAttribute('viewBox', '0 0 24 24');
    btnSvg.setAttribute('fill', 'none');
    btnSvg.setAttribute('stroke', 'currentColor');
    btnSvg.setAttribute('stroke-width', '2');
    btnSvg.setAttribute('stroke-linecap', 'round');
    btnSvg.setAttribute('stroke-linejoin', 'round');
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '13 2 3 14 12 14 11 22 21 10 12 10 13 2');
    btnSvg.appendChild(polygon);
    transformBtn.appendChild(btnSvg);
    transformBtn.appendChild(document.createTextNode(' Transform Prompt'));
    popup.appendChild(transformBtn);

    positionPopup(popup, textarea);
    document.body.appendChild(popup);
    popupEl = popup;

    transformBtn.addEventListener('click', () =>
      transformPrompt(textarea, promptData.transformed)
    );
    closeBtn.addEventListener('click', dismissPopup);

    const reposition = () => positionPopup(popup, textarea);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    popup._cleanup = () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }

  function positionPopup(popup, textarea) {
    const rect = textarea.getBoundingClientRect();
    const w = 420;
    let left = rect.left + (rect.width / 2) - (w / 2);
    left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
    popup.style.left = `${left}px`;
    popup.style.bottom = `${window.innerHeight - rect.top + 12}px`;
    popup.style.top = 'auto';
  }

  function dismissPopup() {
    if (!popupEl) return;
    popupEl._cleanup?.();
    popupEl.classList.remove('amplify-popup-enter');
    popupEl.classList.add('amplify-popup-exit');
    const el = popupEl;
    setTimeout(() => el.remove(), 250);
    popupEl = null;
  }

  // --- TRANSFORM ---
  async function transformPrompt(textarea, transformedText) {
    if (isTransforming) return;
    isTransforming = true;

    dismissPopup();
    removeUnderline(textarea);

    textarea.focus();
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(300);

    // Strip technique annotations [Role Assignment] etc from the displayed text
    const cleanText = transformedText.replace(/\s*\[[\w\s\-]+\]/g, '');

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      document.execCommand('insertText', false, char);

      let delay = TYPING_SPEED_MS;
      if (char === '\n') delay = 60;
      else if (char === ' ') delay = 5;
      else if ('*:-'.includes(char)) delay = 6;

      await sleep(delay);
    }

    const wrapper = textarea.closest('div[class]') || textarea.parentElement;
    if (wrapper) {
      wrapper.classList.add('amplify-sparkle');
      setTimeout(() => wrapper.classList.remove('amplify-sparkle'), 800);
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    isTransforming = false;
  }

  // --- INPUT MONITORING ---
  function checkForTrigger(textarea) {
    if (popupShown || isTransforming) return;

    const text = (textarea.innerText || textarea.textContent || textarea.value || '').trim().toLowerCase();
    const match = findMatchingPrompt(text);

    if (match) {
      popupShown = true;
      addUnderline(textarea);
      setTimeout(() => createPopup(textarea, match), POPUP_DELAY_MS);
    }
  }

  // --- INIT ---
  function init() {
    const observer = new MutationObserver(() => {
      const textarea = findTextarea();
      if (!textarea || textarea._amplifyBound) return;
      textarea._amplifyBound = true;

      textarea.addEventListener('input', () => checkForTrigger(textarea));
      textarea.addEventListener('keyup', () => {
        setTimeout(() => checkForTrigger(textarea), 100);
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const textarea = findTextarea();
    if (textarea && !textarea._amplifyBound) {
      textarea._amplifyBound = true;
      textarea.addEventListener('input', () => checkForTrigger(textarea));
      textarea.addEventListener('keyup', () => {
        setTimeout(() => checkForTrigger(textarea), 100);
      });
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
