// scripts/send-discord-new-link.js
//
// Re-send of the foundations update email — original send went out with
// an expired Discord invite. Body content is byte-identical to
// scripts/send-update-01-foundations.js. The only differences:
//   1. DISCORD_URL uses the fresh invite link
//   2. Subject is changed so Gmail threads it as a new conversation
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-discord-new-link.js --dry-run
//   node --env-file=.env scripts/send-discord-new-link.js --only=you@x.com
//   node --env-file=.env scripts/send-discord-new-link.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.com/invite/xck6AmNbt';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Quick update on what we've been building since you signed up.

The big thing that's locked: Amplify treats prompts as 6 distinct categories — task-only, context-heavy, vague, multi-step, role/persona, and debug/fix. Each one needs different cleanup. Vague prompts need clarifying questions surfaced. Debug prompts need the failing input made explicit. Role-play prompts need scope guards.

We considered "one universal prompt fixer" — every other tool does it that way — and threw it out. Bad prompts are bad in different ways. Lumping them together produces generic, watered-down rewrites.

Two questions we'd love your take on:
  1. Which of the six matches what you usually paste into ChatGPT or Claude?
  2. What's the dumbest thing your AI has done because your prompt was unclear?

Reply to this email, or come hang in our Discord — about 50 of you are already in:
${DISCORD_URL}

— The Amplify AI Team

P.S. You're #${position} on the list. Holding it.
`;

  const bodyHtml = `              <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
              <p style="margin:0 0 16px;">Quick update on what we've been building since you signed up.</p>
              <p style="margin:0 0 16px;">The big thing that's locked: Amplify treats prompts as <strong>6 distinct categories</strong> — task-only, context-heavy, vague, multi-step, role/persona, and debug/fix. Each one needs different cleanup. Vague prompts need clarifying questions surfaced. Debug prompts need the failing input made explicit. Role-play prompts need scope guards.</p>
              <p style="margin:0 0 16px;">We considered "one universal prompt fixer" — every other tool does it that way — and threw it out. Bad prompts are bad in different ways. Lumping them together produces generic, watered-down rewrites.</p>
              <p style="margin:0 0 10px;">Two questions we'd love your take on:</p>
              <ol style="margin:0 0 18px;padding-left:22px;">
                <li style="margin:0 0 6px;">Which of the six matches what you usually paste into ChatGPT or Claude?</li>
                <li>What's the dumbest thing your AI has done because your prompt was unclear?</li>
              </ol>
              <p style="margin:0 0 18px;">Reply to this email, or come hang in our Discord — about 50 of you are already in:<br><a href="${DISCORD_URL}" style="color:#c47a3a;text-decoration:none;">${DISCORD_URL}</a></p>
              <p style="margin:0 0 4px;">— The Amplify AI Team</p>
              <p style="margin:24px 0 0;color:#7a6555;font-size:14px;">P.S. You're #${position} on the list. Holding it.</p>`;

  const preheader = "Six prompt categories, why we're not building 'one fits all'.";

  return { text, bodyHtml, preheader };
}

sendCampaign({
  campaignName: 'Foundations re-send / fresh Discord link',
  subject: 'An update on Amplify',
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
