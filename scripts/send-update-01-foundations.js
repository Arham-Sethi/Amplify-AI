// scripts/send-update-01-foundations.js
//
// Waitlist update #1 — the 6 prompt categories, why we're not building
// "one universal prompt fixer". First in a 4-email cadence (every 2 days).
//
// Usage (from repo root):
//   node scripts/send-update-01-foundations.js --dry-run
//   node scripts/send-update-01-foundations.js --only=devhemnani777@gmail.com
//   node scripts/send-update-01-foundations.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/kxx3hQd9';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Quick update on what we've been building since you signed up.

The big thing that's locked: Amplify treats prompts as 6 distinct categories — task-only, context-heavy, vague, multi-step, role/persona, and debug/fix. Each one needs different cleanup. Vague prompts need clarifying questions surfaced. Debug prompts need the failing input made explicit. Role-play prompts need scope guards.

We considered "one universal prompt fixer" — every other tool does it that way — and threw it out. Bad prompts are bad in different ways. Lumping them together produces generic, watered-down rewrites.

Two questions I'd love your take on:
  1. Which of the six matches what you usually paste into ChatGPT or Claude?
  2. What's the dumbest thing your AI has done because your prompt was unclear?

Reply to this email — or come hang in the Discord, about 50 of you are already in:
${DISCORD_URL}

— Dev
Amplify AI

P.S. You're #${position} on the list. Holding it.
`;

  const html = `<p>Hi ${escapeHtml(first)},</p>
<p>Quick update on what we've been building since you signed up.</p>
<p>The big thing that's locked: Amplify treats prompts as 6 distinct categories — task-only, context-heavy, vague, multi-step, role/persona, and debug/fix. Each one needs different cleanup. Vague prompts need clarifying questions surfaced. Debug prompts need the failing input made explicit. Role-play prompts need scope guards.</p>
<p>We considered "one universal prompt fixer" — every other tool does it that way — and threw it out. Bad prompts are bad in different ways. Lumping them together produces generic, watered-down rewrites.</p>
<p>Two questions I'd love your take on:</p>
<ol>
<li>Which of the six matches what you usually paste into ChatGPT or Claude?</li>
<li>What's the dumbest thing your AI has done because your prompt was unclear?</li>
</ol>
<p>Reply to this email — or come hang in the Discord, about 50 of you are already in:<br><a href="${DISCORD_URL}">${DISCORD_URL}</a></p>
<p>— Dev<br>Amplify AI</p>
<p>P.S. You're #${position} on the list. Holding it.</p>`;

  return { text, html };
}

sendCampaign({
  campaignName: 'Update 01 — Foundations / 6 categories',
  subject: 'Quick update on Amplify',
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
