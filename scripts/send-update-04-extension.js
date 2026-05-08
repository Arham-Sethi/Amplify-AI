// scripts/send-update-04-extension.js
//
// Waitlist update #4 — the browser extension is the next milestone, beta
// access is reserved for this list, and a soft action: confirm your account
// email + drop your most-used AI tool in Discord so we know which adapter
// to polish first. Send ~2 days after update #3.
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-update-04-extension.js --dry-run
//   node --env-file=.env scripts/send-update-04-extension.js --only=you@x.com
//   node --env-file=.env scripts/send-update-04-extension.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/xck6AmNbt';
const ACCOUNT_URL = 'https://www.amplifyai.cc/account';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Headline: the browser extension is the next milestone we're chasing.

It drops into ChatGPT, Claude, Gemini, and Grok. Watches what you're typing, classifies it into one of the six categories, scores it against the rubric, and shows an outlined better version inline. You decide whether to use it. No keystroke leaves your machine until you click through.

You're on a 60-person waitlist. When the extension hits beta, this list goes in first. No public release yet, no Product Hunt, no waiting in a queue with strangers.

Two things we'd ask of you between now and then:

  1. Make sure the email on your Amplify account matches the one you want for beta access. Check at ${ACCOUNT_URL} — beta invites go to that address.
  2. If you're up for it, drop your most-used AI tool in the Discord (ChatGPT? Claude? Gemini? Grok? Something else?). Helps us prioritize which adapter to polish first.

Discord: ${DISCORD_URL}

That's it. Next update in a few days.

— The Amplify AI Team

P.S. #${position}. Beta-bound.
`;

  const bodyHtml = `              <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
              <p style="margin:0 0 16px;"><strong>Headline:</strong> the browser extension is the next milestone we're chasing.</p>
              <p style="margin:0 0 16px;">It drops into ChatGPT, Claude, Gemini, and Grok. Watches what you're typing, classifies it into one of the six categories, scores it against the rubric, and shows an outlined better version inline. You decide whether to use it. No keystroke leaves your machine until you click through.</p>
              <p style="margin:0 0 16px;">You're on a 60-person waitlist. When the extension hits beta, <strong>this list goes in first</strong>. No public release yet, no Product Hunt, no waiting in a queue with strangers.</p>
              <p style="margin:0 0 10px;">Two things we'd ask of you between now and then:</p>
              <ol style="margin:0 0 18px;padding-left:22px;">
                <li style="margin:0 0 8px;">Make sure the email on your Amplify account matches the one you want for beta access. Check at <a href="${ACCOUNT_URL}" style="color:#c47a3a;text-decoration:none;">amplifyai.cc/account</a> — beta invites go to that address.</li>
                <li>If you're up for it, drop your most-used AI tool in the Discord (ChatGPT? Claude? Gemini? Grok? Something else?). Helps us prioritize which adapter to polish first.</li>
              </ol>
              <p style="margin:0 0 18px;">Discord: <a href="${DISCORD_URL}" style="color:#c47a3a;text-decoration:none;">${DISCORD_URL}</a></p>
              <p style="margin:0 0 18px;">That's it. Next update in a few days.</p>
              <p style="margin:0 0 4px;">— The Amplify AI Team</p>
              <p style="margin:24px 0 0;color:#7a6555;font-size:14px;">P.S. #${position}. Beta-bound.</p>`;

  const preheader = "The browser extension is next — and you're in line for first access.";

  return { text, bodyHtml, preheader };
}

sendCampaign({
  campaignName: 'Update 04 — Extension MVP / beta access',
  subject: "What's next for Amplify",
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
