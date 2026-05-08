// scripts/send-update-03-outline.js
//
// Waitlist update #3 — the "outline not underline" philosophy + the three
// intensity modes (Gentle / Medium / Aggressive). Asks for a real bad-prompt
// example so we have material to test the rewriter on. Send ~2 days after
// update #2.
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-update-03-outline.js --dry-run
//   node --env-file=.env scripts/send-update-03-outline.js --only=you@x.com
//   node --env-file=.env scripts/send-update-03-outline.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/xck6AmNbt';
const SUPPORT_EMAIL = 'contact@kangaroo.solutions';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Grammarly underlines what's wrong. Amplify won't.

When Grammarly underlines a typo, the fix is local — replace this letter with that one. The context fits in one word. With prompts, every weakness is structural. A vague phrase isn't fixed by tweaking the phrase. It's fixed by adding what's missing around it. Underlining one word would just hide the real problem.

So we outline. The whole improved prompt sits next to your original. You see what changed at the structural level — a constraint added, a role specified, a goal narrowed — not letter-by-letter edits.

Three intensity modes you'll be able to pick:

  - Gentle      — sticks close to your original
  - Medium      — adds structure, may rewrite phrasing
  - Aggressive  — full rewrite when the prompt was vague

Same input, three outputs. You decide how much help you want.

What we'd love from you: drop your worst prompt. The one that gave you garbage and you couldn't figure out why. Real examples are how we tune the rewriter — synthetic test cases just don't capture how messy real prompts are.

Discord: ${DISCORD_URL}
Or email: ${SUPPORT_EMAIL}
Or just reply.

— The Amplify AI Team

P.S. #${position} on the list.
`;

  const bodyHtml = `              <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
              <p style="margin:0 0 16px;">Grammarly underlines what's wrong. Amplify won't.</p>
              <p style="margin:0 0 16px;">When Grammarly underlines a typo, the fix is local — replace this letter with that one. The context fits in one word. With prompts, every weakness is structural. A vague phrase isn't fixed by tweaking the phrase. It's fixed by adding what's missing around it. Underlining one word would just hide the real problem.</p>
              <p style="margin:0 0 16px;">So we <strong>outline</strong>. The whole improved prompt sits next to your original. You see what changed at the structural level — a constraint added, a role specified, a goal narrowed — not letter-by-letter edits.</p>
              <p style="margin:0 0 10px;">Three intensity modes you'll be able to pick:</p>
              <ul style="margin:0 0 16px;padding-left:22px;list-style:none;">
                <li style="margin:0 0 6px;"><strong>Gentle</strong> — sticks close to your original</li>
                <li style="margin:0 0 6px;"><strong>Medium</strong> — adds structure, may rewrite phrasing</li>
                <li><strong>Aggressive</strong> — full rewrite when the prompt was vague</li>
              </ul>
              <p style="margin:0 0 16px;">Same input, three outputs. You decide how much help you want.</p>
              <p style="margin:0 0 16px;">What we'd love from you: drop your worst prompt. The one that gave you garbage and you couldn't figure out why. Real examples are how we tune the rewriter — synthetic test cases just don't capture how messy real prompts are.</p>
              <p style="margin:0 0 18px;">
                <a href="${DISCORD_URL}" style="color:#c47a3a;text-decoration:none;">Discord</a>,
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#c47a3a;text-decoration:none;">${SUPPORT_EMAIL}</a>,
                or just reply to this email.
              </p>
              <p style="margin:0 0 4px;">— The Amplify AI Team</p>
              <p style="margin:24px 0 0;color:#7a6555;font-size:14px;">P.S. #${position} on the list.</p>`;

  const preheader = "Why Amplify outlines instead of underlining your prompt.";

  return { text, bodyHtml, preheader };
}

sendCampaign({
  campaignName: 'Update 03 — Outline not underline / intensity modes',
  subject: "Why Amplify won't underline your prompt",
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
