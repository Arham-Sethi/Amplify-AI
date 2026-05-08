// scripts/send-update-02-rubric.js
//
// Waitlist update #2 — how we score a prompt. The rubric, KS_Probe heritage,
// and an honest ask for input on the "vague" category. Send ~2 days after
// update #1.
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-update-02-rubric.js --dry-run
//   node --env-file=.env scripts/send-update-02-rubric.js --only=you@x.com
//   node --env-file=.env scripts/send-update-02-rubric.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/xck6AmNbt';
const SUPPORT_EMAIL = 'contact@kangaroo.solutions';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Most prompt tools rate prompts on vibes. "This one's better!" with no explanation. We're trying to do the opposite.

Each of our six prompt categories has 8 to 12 binary checks — pass or fail, no in-between. For a debug/fix prompt, the rubric asks things like:

  - Did it include the failing input?
  - Is the expected output stated?
  - Is the environment specified (language, version, OS)?
  - Are constraints on the fix mentioned?

…and several more. Score = checks passed divided by checks total. Per category, per prompt, reproducible. Two reviewers see the same number.

This came out of a research project we ran earlier called KS_Probe. Composite scoring beats vibes every time, especially when you want to compare two prompts and pick a winner.

Where we're stuck: the rubric for "vague" prompts. By definition they're underspecified. So how do you grade an underspecified prompt without changing what the user actually wanted?

If you've got opinions, examples, or just disagree with the framing — Discord (${DISCORD_URL}) or ${SUPPORT_EMAIL}. Reply works too.

— The Amplify AI Team

P.S. #${position} on the list. Still holding.
`;

  const bodyHtml = `              <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
              <p style="margin:0 0 16px;">Most prompt tools rate prompts on vibes. "This one's better!" with no explanation. We're trying to do the opposite.</p>
              <p style="margin:0 0 14px;">Each of our six prompt categories has <strong>8 to 12 binary checks</strong> — pass or fail, no in-between. For a debug/fix prompt, the rubric asks things like:</p>
              <ul style="margin:0 0 16px;padding-left:22px;">
                <li style="margin:0 0 6px;">Did it include the failing input?</li>
                <li style="margin:0 0 6px;">Is the expected output stated?</li>
                <li style="margin:0 0 6px;">Is the environment specified (language, version, OS)?</li>
                <li>Are constraints on the fix mentioned?</li>
              </ul>
              <p style="margin:0 0 16px;">…and several more. Score = checks passed divided by checks total. Per category, per prompt, reproducible. Two reviewers see the same number.</p>
              <p style="margin:0 0 16px;">This came out of a research project we ran earlier called <strong>KS_Probe</strong>. Composite scoring beats vibes every time, especially when you want to compare two prompts and pick a winner.</p>
              <p style="margin:0 0 16px;">Where we're stuck: the rubric for <strong>"vague"</strong> prompts. By definition they're underspecified. So how do you grade an underspecified prompt without changing what the user actually wanted?</p>
              <p style="margin:0 0 18px;">If you've got opinions, examples, or just disagree with the framing — <a href="${DISCORD_URL}" style="color:#c47a3a;text-decoration:none;">Discord</a> or <a href="mailto:${SUPPORT_EMAIL}" style="color:#c47a3a;text-decoration:none;">${SUPPORT_EMAIL}</a>. Reply works too.</p>
              <p style="margin:0 0 4px;">— The Amplify AI Team</p>
              <p style="margin:24px 0 0;color:#7a6555;font-size:14px;">P.S. #${position} on the list. Still holding.</p>`;

  const preheader = 'How we score a prompt — a rubric, not vibes.';

  return { text, bodyHtml, preheader };
}

sendCampaign({
  campaignName: 'Update 02 — Rubric / KS_Probe',
  subject: 'How we decide if a prompt is good',
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
