// ============================================
// Amplify AI Landing Page — JavaScript
// Quiz-based personalized demo, Tabs, Waitlist
// ============================================

(() => {
  'use strict';

  // --- DEMO CONTENT WITH QUIZ QUESTIONS ---
  const DEMO_PROMPTS = [
    {
      trigger: 'write me a meal plan for losing weight',
      qualityBefore: '2/10',
      qualityAfter: '9.4/10',
      questions: [
        {
          q: 'Who is this meal plan for?',
          options: ['Adult male, 25-40', 'Adult female, 25-40', 'Teen / young adult', 'Senior (60+)'],
        },
        {
          q: "What's your activity level?",
          options: ['Sedentary (desk job)', 'Light (1-2x/week)', 'Moderate (3-4x/week)', 'Very active (daily)'],
        },
        {
          q: 'Any dietary restrictions?',
          options: ['No restrictions', 'Vegetarian', 'Gluten-free', 'Dairy-free'],
        },
        {
          q: 'Weekly grocery budget?',
          options: ['Under $50', '$50 - $100', '$100 - $150', 'No budget limit'],
        },
        {
          q: 'What output format works best?',
          options: ['Daily table with macros', 'Weekly plan + grocery list', 'Meal prep guide + recipes', 'Simple list, no tracking'],
        },
      ],
      buildPrompt(answers) {
        return `You are an expert registered dietitian with 15 years of clinical experience in evidence-based weight management.

Create a detailed 7-day meal plan for ${answers[0]}, who is ${answers[1].toLowerCase()}, targeting sustainable fat loss of 1-2 lbs/week.

First, calculate the target daily calorie intake using the Mifflin-St Jeor equation with a 500-calorie deficit. Then design meals around that target.

Requirements:
- Dietary: ${answers[2]}
- Budget: ${answers[3]}/week
- 3 meals + 2 snacks per day
- Flag batch-preppable meals

Output format: ${answers[4]}.

No supplements, juice cleanses, or extreme diets. Prioritize whole foods and sustainable habits.`;
      },
      techniques: ['Role Assignment', 'Specificity', 'Chain-of-Thought', 'Output Format', 'Constraints'],
    },
    {
      trigger: 'make me a presentation about our q3 sales results for the board meeting',
      qualityBefore: '1.5/10',
      qualityAfter: '9.7/10',
      questions: [
        {
          q: "Who's the audience?",
          options: ['Board of Directors', 'C-Suite / VP level', 'Department team', 'All-hands company'],
        },
        {
          q: 'How was Q3 performance?',
          options: ['Strong growth (+15%+)', 'Steady / on target', 'Mixed results', 'Below expectations'],
        },
        {
          q: 'Presentation length?',
          options: ['5-8 slides (brief)', '10-12 slides (standard)', '15+ slides (detailed)', '3-5 slides (exec summary)'],
        },
        {
          q: 'What matters most to highlight?',
          options: ['Revenue & bottom line', 'Customer growth & retention', 'Market share & competition', 'Team performance & ops'],
        },
        {
          q: 'Desired tone?',
          options: ['Data-driven & analytical', 'Strategic & forward-looking', 'Celebratory & motivating', 'Transparent & actionable'],
        },
      ],
      buildPrompt(answers) {
        return `You are a senior strategy consultant who prepares executive presentations for Fortune 500 boards.

Create a ${answers[2].split(' ')[0]} slide outline for a Q3 Sales Results presentation. The audience is ${answers[0]} who need a ${answers[4].toLowerCase()} narrative.

Q3 context: Performance was ${answers[1].toLowerCase()}. Focus on ${answers[3].toLowerCase()}.

Structure each slide with:
- Slide title
- 3-4 key bullet points
- Speaker notes (2-3 sentences)
- Recommended visual (chart type, graphic)

Include: Executive Summary, KPIs vs Targets, Segment Deep-Dive, Competitive Context, Risks & Headwinds, Strategic Recommendations, and Next Steps.

No individual rep data, no jargon. Use C-suite language. Every data point needs a "so what" insight.`;
      },
      techniques: ['Role Assignment', 'Context Framing', 'Task Decomposition', 'Output Format', 'Chain-of-Thought'],
    },
  ];

  let currentPromptIndex = 0;
  let demoRunning = false;
  let demoPhase = 'idle';

  // --- DOM HELPERS ---
  const $ = (id) => document.getElementById(id);

  // --- DEMO ENGINE ---
  async function runDemoLoop() {
    if (demoRunning) return;
    demoRunning = true;

    while (demoRunning) {
      await runSingleDemo(DEMO_PROMPTS[currentPromptIndex]);
      if (!demoRunning) break;
      currentPromptIndex = (currentPromptIndex + 1) % DEMO_PROMPTS.length;
    }
  }

  async function runSingleDemo(prompt) {
    const typed = $('demo-typed');
    const cursor = $('demo-cursor');
    const input = $('demo-input');
    const popup = $('demo-popup');
    const quiz = $('demo-quiz');
    const status = $('demo-status');
    const qualBefore = $('demo-qual-before');
    const qualAfter = $('demo-qual-after');
    const demoBody = $('demo-body');

    if (!typed || !input || !popup || !quiz) return;

    // --- RESET ---
    typed.textContent = '';
    cursor.style.display = '';
    input.classList.remove('demo-underlined');
    popup.classList.remove('popup-visible');
    quiz.classList.remove('quiz-visible');
    status.textContent = '';
    if (qualBefore) qualBefore.textContent = prompt.qualityBefore;
    if (qualAfter) qualAfter.textContent = prompt.qualityAfter;
    demoPhase = 'typing';

    await sleep(900);

    // --- TYPE TRIGGER PROMPT (with focus glow) ---
    input.classList.add('demo-typing');
    for (let i = 0; i < prompt.trigger.length; i++) {
      if (!demoRunning) return;
      typed.textContent = prompt.trigger.substring(0, i + 1);
      await sleep(50 + Math.random() * 25);
    }

    // --- UNDERLINE ---
    input.classList.remove('demo-typing');
    input.classList.add('demo-underlined');
    status.textContent = 'Hover over the prompt to see suggestions';
    demoPhase = 'underlined';

    // --- HOVER LISTENERS ---
    const onEnter = () => {
      if (demoPhase === 'underlined') {
        popup.classList.add('popup-visible');
        demoPhase = 'popup-visible';
        status.textContent = '';
      }
    };

    input.addEventListener('mouseenter', onEnter);
    demoBody.addEventListener('mouseenter', onEnter);
    input.addEventListener('touchstart', onEnter, { passive: true });

    // --- WAIT FOR "Personalize & Amplify" CLICK ---
    await new Promise((resolve) => {
      const btn = $('demo-personalize-btn');
      if (btn) {
        const handler = () => {
          btn.removeEventListener('click', handler);
          resolve();
        };
        btn.addEventListener('click', handler);
      }
    });

    // --- CLEANUP HOVER ---
    input.removeEventListener('mouseenter', onEnter);
    demoBody.removeEventListener('mouseenter', onEnter);
    input.removeEventListener('touchstart', onEnter);

    // --- HIDE POPUP, SHOW QUIZ ---
    popup.classList.remove('popup-visible');
    demoPhase = 'quiz';
    await sleep(250);

    // --- RUN QUIZ ---
    const answers = await runQuiz(prompt.questions);
    if (!demoRunning) return;

    // --- HIDE QUIZ, SHOW GENERATING ---
    quiz.classList.remove('quiz-visible');
    input.classList.remove('demo-underlined');
    await sleep(200);

    // Show generating animation (safe DOM construction — no innerHTML)
    status.textContent = '';
    const genDiv = document.createElement('div');
    genDiv.className = 'demo-generating';
    const dotsDiv = document.createElement('div');
    dotsDiv.className = 'demo-generating-dots';
    for (let d = 0; d < 3; d++) dotsDiv.appendChild(document.createElement('span'));
    const genText = document.createElement('span');
    genText.className = 'demo-generating-text';
    genText.textContent = `Amplifying with ${prompt.techniques.length} techniques...`;
    genDiv.appendChild(dotsDiv);
    genDiv.appendChild(genText);
    input.parentNode.insertBefore(genDiv, input);
    input.style.display = 'none';

    await sleep(1800);

    // Remove generating, show input
    genDiv.remove();
    input.style.display = '';
    typed.textContent = '';
    cursor.style.display = 'none';
    demoPhase = 'transforming';

    // --- TYPE TRANSFORMED PROMPT ---
    const text = prompt.buildPrompt(answers);
    for (let i = 0; i < text.length; i++) {
      if (!demoRunning) return;
      typed.textContent = text.substring(0, i + 1);
      const ch = text[i];
      await sleep(ch === '\n' ? 25 : ch === ' ' ? 2 : 5);
    }

    // Sparkle effect
    input.style.boxShadow = '0 0 0 2px var(--accent), 0 0 24px rgba(196,122,58,0.15)';
    demoPhase = 'displaying';

    // Show technique tags below input (safe DOM construction — no innerHTML)
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'demo-quiz-result-tags';
    prompt.techniques.forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'technique-tag';
      tag.textContent = t;
      tagsContainer.appendChild(tag);
    });
    status.textContent = '';
    status.appendChild(tagsContainer);

    await sleep(800);
    input.style.boxShadow = '';

    // --- KEEP VISIBLE UNTIL CURSOR LEAVES ---
    await new Promise((resolve) => {
      const demoWindow = document.querySelector('.demo-window');
      if (!demoWindow) { resolve(); return; }

      let isOver = false;
      const checkLeave = () => {
        isOver = false;
        setTimeout(() => { if (!isOver) resolve(); }, 600);
      };
      const checkEnter = () => { isOver = true; };

      demoWindow.addEventListener('mouseleave', checkLeave);
      demoWindow.addEventListener('mouseenter', checkEnter);

      setTimeout(() => {
        demoWindow.removeEventListener('mouseleave', checkLeave);
        demoWindow.removeEventListener('mouseenter', checkEnter);
        resolve();
      }, 60000);
    });

    status.textContent = '';
    demoPhase = 'idle';
    await sleep(800);
  }

  // --- QUIZ ENGINE ---
  async function runQuiz(questions) {
    const quiz = $('demo-quiz');
    const questionEl = $('quiz-question');
    const optionsEl = $('quiz-options');
    const progressFill = $('quiz-progress-fill');
    const stepBadge = $('quiz-step-badge');
    const otherRow = $('quiz-other-row');
    const otherInput = $('quiz-other-input');
    const otherConfirm = $('quiz-other-confirm');

    quiz.classList.add('quiz-visible');
    await sleep(300);

    const answers = [];
    const total = questions.length;

    for (let i = 0; i < total; i++) {
      if (!demoRunning) return answers;

      const q = questions[i];
      stepBadge.textContent = `${i + 1} / ${total}`;
      progressFill.style.width = `${((i) / total) * 100}%`;

      // Animate out old content, then animate in new
      if (i > 0) {
        questionEl.style.animation = 'quiz-fade-out 0.2s ease forwards';
        optionsEl.style.animation = 'quiz-fade-out 0.2s ease forwards';
        await sleep(200);
      }

      // Set question
      questionEl.textContent = q.q;
      questionEl.style.animation = 'quiz-fade-in 0.3s ease both';
      optionsEl.style.animation = 'quiz-fade-in 0.3s ease 0.05s both';

      // Render options
      otherRow.style.display = 'none';
      otherInput.value = '';
      while (optionsEl.firstChild) optionsEl.removeChild(optionsEl.firstChild);

      q.options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.textContent = opt;
        optionsEl.appendChild(btn);
      });

      // Add "Other" option
      const otherBtn = document.createElement('button');
      otherBtn.className = 'quiz-opt-btn quiz-opt-other';
      otherBtn.textContent = 'Other (type your own)';
      optionsEl.appendChild(otherBtn);

      // Wait for user selection
      const answer = await new Promise((resolve) => {
        // Regular option buttons
        optionsEl.querySelectorAll('.quiz-opt-btn:not(.quiz-opt-other)').forEach((btn) => {
          btn.addEventListener('click', () => {
            // Highlight selected
            optionsEl.querySelectorAll('.quiz-opt-btn').forEach(b => b.classList.remove('quiz-opt-selected'));
            btn.classList.add('quiz-opt-selected');
            // Short delay for visual feedback
            setTimeout(() => resolve(btn.textContent), 300);
          }, { once: true });
        });

        // "Other" button — show input
        otherBtn.addEventListener('click', () => {
          optionsEl.querySelectorAll('.quiz-opt-btn').forEach(b => b.classList.remove('quiz-opt-selected'));
          otherBtn.classList.add('quiz-opt-selected');
          otherRow.style.display = 'flex';
          otherInput.focus();
        }, { once: true });

        // Confirm custom "Other" text
        const submitOther = () => {
          const val = otherInput.value.trim().substring(0, 200).replace(/<[^>]*>/g, '');
          if (val) resolve(val);
        };
        otherConfirm.addEventListener('click', submitOther, { once: true });
        otherInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') submitOther();
        });
      });

      answers.push(answer);
    }

    // Final progress fill
    progressFill.style.width = '100%';
    await sleep(300);

    return answers;
  }

  function stopDemo() {
    demoRunning = false;
  }

  // --- TAB NAVIGATION ---
  function setupTabs() {
    const tabContents = document.querySelectorAll('.tab-content');

    function switchTab(tabName) {
      if (!['home', 'waitlist', 'updates'].includes(tabName)) return;

      tabContents.forEach(c => c.classList.remove('active'));
      document.querySelectorAll('.nav-tab, .nav-mobile-tab').forEach(b => b.classList.remove('active'));

      const target = $(`tab-${tabName}`);
      if (target) target.classList.add('active');
      document.querySelectorAll(`.nav-tab[data-tab="${tabName}"], .nav-mobile-tab[data-tab="${tabName}"]`).forEach(b => b.classList.add('active'));

      // Close mobile menu on tab switch
      const mobileMenu = $('nav-mobile-menu');
      const hamburger = $('nav-hamburger');
      if (mobileMenu) mobileMenu.classList.remove('open');
      if (hamburger) hamburger.classList.remove('open');

      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(() => {
        document.querySelectorAll('.fade-up').forEach(el => {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
        });
      }, 100);

      if (tabName === 'home' && !demoRunning) {
        setTimeout(() => runDemoLoop(), 500);
      } else if (tabName !== 'home') {
        stopDemo();
      }
    }

    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        // Decision tree: "Join Waitlist" on the waitlist tab funnels
        // logged-out visitors through the login page first. If they're
        // already signed in (either via Supabase OAuth or a local
        // check-position session), the regular tab behaviour applies.
        if (btn.dataset.tab === 'waitlist') {
          try {
            const hasLocal = !!getSession();
            let hasOAuth = false;
            if (window.__amplifyAuth?.getSession) {
              const s = await window.__amplifyAuth.getSession();
              hasOAuth = !!s;
            }
            if (!hasLocal && !hasOAuth) {
              window.location.href = '/login?next=' + encodeURIComponent('/waitlist-confirm');
              return;
            }
          } catch {
            // If auth probe fails, fall through to normal tab behaviour.
          }
        }
        switchTab(btn.dataset.tab);
      });
    });

    // Hamburger toggle
    const hamburger = $('nav-hamburger');
    const mobileMenu = $('nav-mobile-menu');
    if (hamburger && mobileMenu) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        mobileMenu.classList.toggle('open');
      });
    }

    const hash = window.location.hash.replace('#', '');
    if (['waitlist', 'updates'].includes(hash)) switchTab(hash);
  }

  // =============================================
  // SECURITY MODULE — Input Validation, Bot Protection,
  // Rate Limiting, Session Management, Abuse Prevention
  // =============================================

  // --- INPUT VALIDATION ---
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  const CODE_REGEX = /^AMP-[A-Z2-9]{6}$/;
  const MAX_EMAIL_LENGTH = 254;
  const MAX_NAME_LENGTH = 100;

  function validateEmail(email) {
    return typeof email === 'string' &&
      email.length > 0 &&
      email.length <= MAX_EMAIL_LENGTH &&
      EMAIL_REGEX.test(email);
  }

  function sanitizeName(name) {
    if (typeof name !== 'string') return '';
    return name.replace(/<[^>]*>/g, '').replace(/[^\w\s\-'.]/g, '').trim().substring(0, MAX_NAME_LENGTH);
  }

  function validateCode(code) {
    return typeof code === 'string' && CODE_REGEX.test(code);
  }

  // --- CRYPTOGRAPHICALLY SECURE CODE GENERATION ---
  // --- BOT DETECTION ---
  const botDetector = {
    // Track human interaction signals
    humanSignals: {
      mouseMovements: 0,
      keystrokes: 0,
      scrolls: 0,
      touchEvents: 0,
      focusChanges: 0,
    },

    init() {
      document.addEventListener('mousemove', () => { this.humanSignals.mouseMovements++; }, { passive: true });
      document.addEventListener('keydown', () => { this.humanSignals.keystrokes++; }, { passive: true });
      document.addEventListener('scroll', () => { this.humanSignals.scrolls++; }, { passive: true });
      document.addEventListener('touchstart', () => { this.humanSignals.touchEvents++; }, { passive: true });
      document.addEventListener('focusin', () => { this.humanSignals.focusChanges++; }, { passive: true });
    },

    // Check if submission looks like a bot
    isBot(formId) {
      const reasons = [];

      // 1. Honeypot check — if hidden field has a value, it's a bot
      const honeypotIds = { 'waitlist-signup-form': 'signup-website', 'waitlist-check-form': 'check-phone' };
      const honeypotEl = $(honeypotIds[formId]);
      if (honeypotEl && honeypotEl.value.length > 0) {
        reasons.push('honeypot_filled');
      }

      // 2. Submission speed check — forms submitted under 1.5s are suspicious
      const tsIds = { 'waitlist-signup-form': 'signup-ts', 'waitlist-check-form': 'check-ts' };
      const tsEl = $(tsIds[formId]);
      if (tsEl && tsEl.value) {
        const elapsed = Date.now() - parseInt(tsEl.value, 10);
        if (elapsed < 1500) reasons.push('too_fast');
      }

      // 3. Zero human interaction signals — bots don't move mice or type
      const s = this.humanSignals;
      const totalSignals = s.mouseMovements + s.keystrokes + s.scrolls + s.touchEvents + s.focusChanges;
      if (totalSignals < 2) reasons.push('no_interaction');

      // 4. WebDriver / headless browser detection
      if (navigator.webdriver) reasons.push('webdriver');

      // 5. Missing standard browser APIs (headless indicators)
      if (!window.chrome && !navigator.userAgent.includes('Firefox') && !navigator.userAgent.includes('Safari')) {
        reasons.push('suspicious_ua');
      }

      return { isBot: reasons.length >= 2, reasons };
    },

    // Set timestamp when form becomes visible/focused
    stampForm(formId) {
      const tsIds = { 'waitlist-signup-form': 'signup-ts', 'waitlist-check-form': 'check-ts' };
      const el = $(tsIds[formId]);
      if (el) el.value = String(Date.now());
    },
  };

  // --- RATE LIMITING (Progressive with exponential backoff) ---
  const rateLimiter = {
    attempts: new Map(),  // key -> { count, resetAt, blocked, blockedUntil }

    check(key, maxAttempts, windowMs) {
      const now = Date.now();
      const entry = this.attempts.get(key);

      // If currently blocked (exponential backoff)
      if (entry && entry.blockedUntil && now < entry.blockedUntil) {
        return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
      }

      // Fresh window or expired window
      if (!entry || now > entry.resetAt) {
        this.attempts.set(key, { count: 1, resetAt: now + windowMs, blocked: false, blockedUntil: 0 });
        return { allowed: true };
      }

      // Within window
      if (entry.count >= maxAttempts) {
        // Exponential backoff: 1min, 2min, 4min, 8min, max 30min
        const blockCount = (entry.blocked ? (entry.blockMultiplier || 1) : 0) + 1;
        const blockDuration = Math.min(blockCount * 60 * 1000, 30 * 60 * 1000);
        entry.blocked = true;
        entry.blockedUntil = now + blockDuration;
        entry.blockMultiplier = blockCount;
        return { allowed: false, retryAfter: Math.ceil(blockDuration / 1000) };
      }

      entry.count += 1;
      return { allowed: true };
    },

    // Log suspicious activity
    logAttempt(key, action, metadata) {
      const log = {
        timestamp: new Date().toISOString(),
        action,
        key,
        ...metadata,
      };
      // In production: send to server logging endpoint
      // For now: store in sessionStorage for debugging
      try {
        const logs = JSON.parse(sessionStorage.getItem('amplify_security_log') || '[]');
        logs.push(log);
        // Keep only last 100 entries
        if (logs.length > 100) logs.splice(0, logs.length - 100);
        sessionStorage.setItem('amplify_security_log', JSON.stringify(logs));
      } catch {}
    },
  };

  // --- SESSION MANAGEMENT ---
  const SESSION_KEY = 'amplify_session';
  const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  function createSession(userData) {
    const session = {
      id: crypto.randomUUID(),
      user: userData, // { name, code, position }
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch {}
    return session;
  }

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (!session.expiresAt || Date.now() > session.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }

  function destroySession() {
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }

  // --- WAITLIST API ---
  async function updateCounter() {
    const el = $('counter-total');
    if (!el) return;
    try {
      const res = await fetch('/api/count');
      const data = await res.json();
      if (data.success) {
        el.textContent = String(data.count);
        el.dataset.count = String(data.count);
      }
    } catch {
      // Silently fail — counter stays at current value
    }
  }

  // --- UI ERROR DISPLAY ---
  function showFormError(formEl, message) {
    const existing = formEl.querySelector('.form-error');
    if (existing) existing.remove();
    const errorEl = document.createElement('p');
    errorEl.className = 'form-error';
    errorEl.textContent = message;
    errorEl.style.cssText = 'color:#b94a4a;font-size:13px;text-align:center;margin-top:12px;font-weight:500;';
    formEl.appendChild(errorEl);
    setTimeout(() => errorEl.remove(), 5000);
  }

  function disableButton(btn, seconds) {
    const orig = btn.textContent;
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor = 'not-allowed';
    let remaining = seconds;
    const tick = () => {
      if (remaining <= 0) {
        btn.disabled = false;
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.textContent = orig;
        return;
      }
      btn.textContent = `Try again in ${remaining}s`;
      remaining--;
      setTimeout(tick, 1000);
    };
    tick();
  }

  // --- WAITLIST SETUP ---
  function setupWaitlist() {
    const signupSection = $('waitlist-auth-signup');
    const checkSection = $('waitlist-auth-check');
    const dashboard = $('waitlist-dashboard');

    // Initialize bot detection
    botDetector.init();

    // Stamp forms when they become visible
    botDetector.stampForm('waitlist-signup-form');

    $('show-check-btn')?.addEventListener('click', () => {
      signupSection.style.display = 'none';
      checkSection.style.display = '';
      botDetector.stampForm('waitlist-check-form');
    });
    $('show-signup-btn')?.addEventListener('click', () => {
      checkSection.style.display = 'none';
      signupSection.style.display = '';
      botDetector.stampForm('waitlist-signup-form');
    });
    $('dash-logout')?.addEventListener('click', () => {
      destroySession();
      dashboard.style.display = 'none';
      signupSection.style.display = '';
    });

    // --- SIGNUP HANDLER ---
    $('waitlist-signup-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');

      // Bot detection
      const botCheck = botDetector.isBot('waitlist-signup-form');
      if (botCheck.isBot) {
        rateLimiter.logAttempt('signup', 'bot_blocked', { reasons: botCheck.reasons });
        showFormError(form, 'Something went wrong. Please refresh and try again.');
        return;
      }

      // Rate limit: 5 signups per hour
      const rateCheck = rateLimiter.check('signup', 5, 60 * 60 * 1000);
      if (!rateCheck.allowed) {
        rateLimiter.logAttempt('signup', 'rate_limited', { retryAfter: rateCheck.retryAfter });
        showFormError(form, 'Too many attempts. Please try again later.');
        if (submitBtn) disableButton(submitBtn, rateCheck.retryAfter);
        return;
      }

      const rawEmail = $('signup-email').value.trim().toLowerCase();
      const rawName = $('signup-name').value;

      if (!validateEmail(rawEmail)) {
        showFormError(form, 'Please enter a valid email address.');
        return;
      }
      if (!sanitizeName(rawName)) {
        showFormError(form, 'Please enter your name.');
        return;
      }

      // Disable button while request is in flight
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining...';
      }

      try {
        const res = await fetch('/api/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rawEmail, name: rawName }),
        });
        const data = await res.json();

        if (!data.success) {
          showFormError(form, data.error || 'Something went wrong. Please try again.');
          return;
        }

        const userData = { name: data.name, code: data.code, position: data.position };
        createSession(userData);
        rateLimiter.logAttempt('signup', data.existing ? 'existing_user_login' : 'new_user', {});
        updateCounter();
        showDashboard(userData);
      } catch {
        showFormError(form, 'Network error. Please check your connection and try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Join Waitlist';
        }
      }
    });

    // --- CHECK POSITION HANDLER ---
    $('waitlist-check-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const submitBtn = form.querySelector('button[type="submit"]');

      // Bot detection
      const botCheck = botDetector.isBot('waitlist-check-form');
      if (botCheck.isBot) {
        rateLimiter.logAttempt('check', 'bot_blocked', { reasons: botCheck.reasons });
        showFormError(form, 'Something went wrong. Please refresh and try again.');
        return;
      }

      // Rate limit: 10 checks per hour (brute-force protection)
      const rateCheck = rateLimiter.check('check', 10, 60 * 60 * 1000);
      if (!rateCheck.allowed) {
        rateLimiter.logAttempt('check', 'rate_limited', { retryAfter: rateCheck.retryAfter });
        showFormError(form, 'Too many attempts. Please try again later.');
        if (submitBtn) disableButton(submitBtn, rateCheck.retryAfter);
        return;
      }

      const rawEmail = $('check-email').value.trim().toLowerCase();
      const rawCode = $('check-code').value.trim().toUpperCase();

      if (!validateEmail(rawEmail)) {
        showFormError(form, 'Please enter a valid email address.');
        return;
      }
      if (!validateCode(rawCode)) {
        showFormError(form, 'Invalid access code format. Expected: AMP-XXXXXX');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Checking...';
      }

      try {
        const res = await fetch('/api/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: rawEmail, code: rawCode }),
        });
        const data = await res.json();

        if (!data.success) {
          rateLimiter.logAttempt('check', 'failed', {});
          showFormError(form, data.error || 'No matching account found.');
          return;
        }

        const userData = { name: data.name, code: data.code, position: data.position };
        createSession(userData);
        rateLimiter.logAttempt('check', 'success', {});
        showDashboard(userData);
      } catch {
        showFormError(form, 'Network error. Please check your connection and try again.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Check Position';
        }
      }
    });

    // --- AUTO-LOGIN from session ---
    const session = getSession();
    if (session && session.user) {
      showDashboard(session.user);
    }

    // --- COPY BUTTON ---
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const src = $(btn.dataset.copy);
        const text = src?.value || src?.textContent || '';
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement('textarea');
          t.value = text;
          t.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          document.body.removeChild(t);
        }
        const orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = orig; }, 1500);
      });
    });

    updateCounter();
  }

  function showDashboard(user) {
    $('waitlist-auth-signup').style.display = 'none';
    $('waitlist-auth-check').style.display = 'none';
    $('waitlist-dashboard').style.display = '';
    $('dash-name').textContent = user.name || 'there';
    $('dash-code').textContent = user.code;
    $('dash-position').textContent = `#${user.position}`;
  }

  // --- SCROLL ANIMATIONS ---
  function setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }); },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    );
    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
  }

  // --- SMOOTH SCROLL ---
  function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // --- FLOATING LEAVES ---
  function spawnLeaves() {
    const emojis = ['\u{1F342}', '\u{1F343}', '\u{1F341}'];
    function create() {
      const el = document.createElement('div');
      el.className = 'leaf';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration = (14 + Math.random() * 16) + 's';
      el.style.fontSize = (14 + Math.random() * 8) + 'px';
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
    for (let i = 0; i < 4; i++) setTimeout(create, Math.random() * 3000);
    setInterval(create, 5000);
  }

  // --- UTILITY ---
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // =============================================
  // DYNAMIC FEATURES — Parallax, Counters, Slider,
  // Floating CTA, Nav Scroll, Before/After
  // =============================================

  // --- PARALLAX ---
  function setupParallax() {
    const elements = document.querySelectorAll('[data-parallax]');
    if (!elements.length) return;
    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        elements.forEach(el => {
          const speed = parseFloat(el.dataset.parallax) || 0;
          el.style.transform = `translateY(${scrollY * speed}px)`;
        });
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // --- SCROLL-TRIGGERED NUMBER COUNTERS ---
  function setupCounters() {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        if (isNaN(target) || target === 0) return;
        animateCount(el, 0, target, 1200);
        observer.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(c => observer.observe(c));
  }

  function animateCount(el, start, end, duration) {
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = String(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- SCROLL-TRIGGERED QUALITY BARS ---
  function setupQualityBars() {
    const bars = document.querySelectorAll('.compare-bar[data-width]');
    if (!bars.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const bar = entry.target;
        const w = bar.dataset.width;
        bar.style.width = w + '%';
        observer.unobserve(bar);
      });
    }, { threshold: 0.3 });

    bars.forEach(b => observer.observe(b));
  }

  // --- BEFORE/AFTER SLIDER ---
  function setupCompareSlider() {
    const slider = $('compare-slider');
    const handle = $('compare-handle');
    const beforeLayer = $('compare-before-layer');
    if (!slider || !handle || !beforeLayer) return;

    let isDragging = false;

    function setPosition(clientX) {
      const rect = slider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(5, Math.min(95, pct));
      handle.style.left = pct + '%';
      beforeLayer.style.width = pct + '%';
    }

    function onPointerDown(e) {
      isDragging = true;
      handle.classList.add('dragging');
      setPosition(e.clientX || e.touches[0].clientX);
      e.preventDefault();
    }
    function onPointerMove(e) {
      if (!isDragging) return;
      setPosition(e.clientX || e.touches[0].clientX);
    }
    function onPointerUp() {
      isDragging = false;
      handle.classList.remove('dragging');
    }

    // Mouse events
    slider.addEventListener('mousedown', onPointerDown);
    document.addEventListener('mousemove', onPointerMove);
    document.addEventListener('mouseup', onPointerUp);

    // Touch events
    slider.addEventListener('touchstart', onPointerDown, { passive: false });
    document.addEventListener('touchmove', onPointerMove, { passive: true });
    document.addEventListener('touchend', onPointerUp);
  }

  // --- NAV SCROLL EFFECT ---
  function setupNavScroll() {
    const nav = $('nav');
    if (!nav) return;
    let lastScrolled = false;
    function check() {
      const scrolled = window.scrollY > 20;
      if (scrolled !== lastScrolled) {
        nav.classList.toggle('scrolled', scrolled);
        lastScrolled = scrolled;
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // --- FLOATING CTA ---
  function setupFloatingCTA() {
    const cta = $('floating-cta');
    if (!cta) return;
    let visible = false;
    function check() {
      const show = window.scrollY > 600;
      if (show !== visible) {
        cta.classList.toggle('visible', show);
        visible = show;
      }
    }
    window.addEventListener('scroll', check, { passive: true });
  }

  // --- INIT ---
  // --- EMAIL VERIFICATION BANNER ---
  function handleVerificationRedirect() {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    if (!verified) return;

    const messages = {
      success: { text: 'Email verified! Your spot is secured.', type: 'success' },
      already: { text: 'Your email was already verified.', type: 'info' },
      expired: { text: 'Verification link expired. Please sign up again.', type: 'error' },
      invalid: { text: 'Invalid verification link.', type: 'error' },
      error: { text: 'Verification failed. Please try again.', type: 'error' },
    };

    const msg = messages[verified];
    if (!msg) return;

    const banner = document.createElement('div');
    banner.className = 'verify-banner verify-banner-' + msg.type;
    banner.textContent = msg.text;
    banner.style.cssText = 'position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:1001;'
      + 'padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;'
      + 'box-shadow:0 4px 20px rgba(0,0,0,0.1);animation:fadeInDown 0.4s ease;';

    if (msg.type === 'success') {
      banner.style.background = '#ecfdf5';
      banner.style.color = '#166534';
      banner.style.border = '1px solid #bbf7d0';
    } else if (msg.type === 'info') {
      banner.style.background = '#f0f9ff';
      banner.style.color = '#1e40af';
      banner.style.border = '1px solid #bfdbfe';
    } else {
      banner.style.background = '#fef2f2';
      banner.style.color = '#991b1b';
      banner.style.border = '1px solid #fecaca';
    }

    document.body.appendChild(banner);
    setTimeout(() => { banner.style.opacity = '0'; banner.style.transition = 'opacity 0.4s'; }, 5000);
    setTimeout(() => banner.remove(), 5500);

    // Clean URL without reload
    window.history.replaceState({}, '', window.location.pathname);
  }

  // --- OAUTH SESSION NAV SWAP ---
  // Loads the Supabase client lazily so the rest of the page never waits on it.
  // When a Supabase session exists, swap the "Sign in" button for "Account".
  async function setupOAuthNav() {
    try {
      const mod = await import('/js/supabase-client.js');
      window.__amplifyAuth = mod;
      const session = await mod.getSession();
      const signinBtn = $('nav-signin');
      const accountBtn = $('nav-account');
      if (session) {
        if (signinBtn) signinBtn.style.display = 'none';
        if (accountBtn) accountBtn.style.display = '';
      }
    } catch {
      // Supabase client couldn't load (e.g. offline / missing config) —
      // fall back to showing the Sign-in button, which is the default.
    }
  }

  function init() {
    setupTabs();
    setupWaitlist();
    setupOAuthNav();
    setupScrollAnimations();
    setupSmoothScroll();
    spawnLeaves();
    setupParallax();
    setupCounters();
    setupQualityBars();
    setupCompareSlider();
    setupNavScroll();
    setupFloatingCTA();
    handleVerificationRedirect();

    const homeTab = $('tab-home');
    if (homeTab?.classList.contains('active')) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !demoRunning) {
          runDemoLoop();
          observer.disconnect();
        }
      }, { threshold: 0.1 });
      const db = $('demo-body');
      if (db) observer.observe(db);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
