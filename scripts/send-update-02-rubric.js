// scripts/send-update-02-rubric.js
//
// Waitlist update #2 — how we score a prompt. The rubric, KS_Probe heritage,
// and an honest ask for input on the "vague" category. Send ~2 days after
// update #1.
//
// Usage (from repo root):
//   node scripts/send-update-02-rubric.js --dry-run
//   node scripts/send-update-02-rubric.js --only=devhemnani777@gmail.com
//   node scripts/send-update-02-rubric.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/kxx3hQd9';
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

— Dev
Amplify AI

P.S. #${position} on the list. Still holding.
`;

  const html = `<p>Hi ${escapeHtml(first)},</p>
<p>Most prompt tools rate prompts on vibes. "This one's better!" with no explanation. We're trying to do the opposite.</p>
<p>Each of our six prompt categories has 8 to 12 binary checks — pass or fail, no in-between. For a debug/fix prompt, the rubric asks things like:</p>
<ul>
<li>Did it include the failing input?</li>
<li>Is the expected output stated?</li>
<li>Is the environment specified (language, version, OS)?</li>
<li>Are constraints on the fix mentioned?</li>
</ul>
<p>…and several more. Score = checks passed divided by checks total. Per category, per prompt, reproducible. Two reviewers see the same number.</p>
<p>This came out of a research project we ran earlier called KS_Probe. Composite scoring beats vibes every time, especially when you want to compare two prompts and pick a winner.</p>
<p>Where we're stuck: the rubric for "vague" prompts. By definition they're underspecified. So how do you grade an underspecified prompt without changing what the user actually wanted?</p>
<p>If you've got opinions, examples, or just disagree with the framing — Discord (<a href="${DISCORD_URL}">${DISCORD_URL}</a>) or <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. Reply works too.</p>
<p>— Dev<br>Amplify AI</p>
<p>P.S. #${position} on the list. Still holding.</p>`;

  return { text, html };
}

sendCampaign({
  campaignName: 'Update 02 — Rubric / KS_Probe',
  subject: 'How we decide if a prompt is good',
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
