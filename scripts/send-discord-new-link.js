// scripts/send-discord-new-link.js
//
// EMERGENCY broadcast: the Discord invite from the earlier email expired.
// This sends every waitlist user a fresh, non-expiring link.
//
// Subject is intentionally different from any prior broadcast so Gmail
// threads it as a new conversation, not a reply.
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-discord-new-link.js --dry-run
//   node --env-file=.env scripts/send-discord-new-link.js --only=you@x.com
//   node --env-file=.env scripts/send-discord-new-link.js
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { sendCampaign, escapeHtml, firstName } from '../lib/campaign.js';

const DISCORD_URL = 'https://discord.gg/xck6AmNbt';

function buildEmail({ name, position }) {
  const first = firstName(name);

  const text = `Hi ${first},

Quick fix — the Discord invite we sent earlier has expired. Sorry about that.

Here's a fresh link that won't expire:

  ${DISCORD_URL}

Click it and you're in. About 50 of you are already inside — come say hi.

Reply to this email if you hit any issues.

— The Amplify AI Team

P.S. #${position} on the list.
`;

  const bodyHtml = `              <p style="margin:0 0 16px;">Hi ${escapeHtml(first)},</p>
              <p style="margin:0 0 16px;">Quick fix — the Discord invite we sent earlier has <strong>expired</strong>. Sorry about that.</p>
              <p style="margin:0 0 12px;">Here's a fresh link that won't expire:</p>
              <p style="margin:0 0 18px;padding:14px 18px;background:#faf5ec;border-left:3px solid #c47a3a;border-radius:4px;">
                <a href="${DISCORD_URL}" style="color:#c47a3a;text-decoration:none;font-weight:600;font-size:15px;">${DISCORD_URL}</a>
              </p>
              <p style="margin:0 0 16px;">Click it and you're in. About 50 of you are already inside — come say hi.</p>
              <p style="margin:0 0 18px;">Reply to this email if you hit any issues.</p>
              <p style="margin:0 0 4px;">— The Amplify AI Team</p>
              <p style="margin:24px 0 0;color:#7a6555;font-size:14px;">P.S. #${position} on the list.</p>`;

  const preheader = "The Discord link from our earlier email expired — here's a fresh one.";

  return { text, bodyHtml, preheader };
}

sendCampaign({
  campaignName: 'EMERGENCY — new Discord invite link',
  subject: 'New Discord invite link',
  buildEmail,
}).catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
