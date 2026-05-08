// scripts/send-discord-new-link.js
//
// Re-broadcast of the Discord invite — the previous link expired. Body
// content is identical to scripts/send-discord-invite.js with two
// changes:
//   1. DISCORD_URL updated to the fresh invite
//   2. The "Around 50 waitlist members are already inside…" line removed
//
// Subject is intentionally different from the original broadcast so Gmail
// threads it as a new conversation, not a reply.
//
// Usage (from repo root):
//   node --env-file=.env scripts/send-discord-new-link.js --dry-run
//   node --env-file=.env scripts/send-discord-new-link.js --only=you@x.com
//   node --env-file=.env scripts/send-discord-new-link.js
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY.

import { supabase } from '../lib/supabase.js';
import { Resend } from 'resend';

const DRY_RUN = process.argv.includes('--dry-run');
const ONLY_ARG = process.argv.find((a) => a.startsWith('--only='));
const ONLY = ONLY_ARG ? ONLY_ARG.slice('--only='.length).toLowerCase() : null;

const DISCORD_URL = 'https://discord.gg/xck6AmNbt';
const SUBJECT = 'New Discord invite link';
const FROM = process.env.DISCORD_FROM_EMAIL
  || process.env.FROM_EMAIL
  || 'Amplify-AI <hello@amplifyai.cc>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || 'contact@kangaroo.solutions';
const SLEEP_MS = 600;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function buildEmail(name) {
  const first = (name && name.split(' ')[0].trim()) || 'there';

  const text = `Hi ${first},

Thanks for being on the Amplify AI waitlist. As a waitlist member, we're opening up our community space to you ahead of public launch.

Join the Amplify AI community on Discord:
${DISCORD_URL}

What you get as a waitlist member:
- Regular updates on what we're building and when we ship
- Early access to the Chrome extension before it goes public
- Access to the testing hub — try unreleased features and help shape the product before it lands

Best,
Amplify-AI team
`;

  const html = `<p>Hi ${escapeHtml(first)},</p>
<p>Thanks for being on the Amplify AI waitlist. As a waitlist member, we're opening up our community space to you ahead of public launch.</p>
<p>Join the Amplify AI community on Discord:<br><a href="${DISCORD_URL}">${DISCORD_URL}</a></p>
<p>What you get as a waitlist member:</p>
<ul>
<li>Regular updates on what we're building and when we ship</li>
<li>Early access to the Chrome extension before it goes public</li>
<li>Access to the testing hub — try unreleased features and help shape the product before it lands</li>
</ul>
<p>Best,<br>Amplify-AI team</p>`;

  return { text, html };
}

async function fetchRecipients() {
  const { data, error } = await supabase
    .from('waitlist')
    .select('email, name, position')
    .order('position', { ascending: true });
  if (error) throw new Error(`DB query failed: ${error.message}`);

  const seen = new Set();
  return data.filter((r) => {
    if (!r.email) return false;
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    if (ONLY && key !== ONLY) return false;
    return true;
  });
}

async function main() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY env var');
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const rows = await fetchRecipients();

  console.log(`Found ${rows.length} recipient(s).`);
  if (ONLY) console.log(`(filtered to --only=${ONLY})`);

  if (DRY_RUN) {
    rows.forEach((r) => console.log(`  #${r.position}  ${r.email}  ${r.name || ''}`));
    console.log('\nDRY RUN — no emails sent.');
    return;
  }

  if (rows.length === 0) {
    console.log('Nothing to send.');
    return;
  }

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const { text, html } = buildEmail(row.name);
    try {
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: row.email,
        replyTo: REPLY_TO,
        subject: SUBJECT,
        text,
        html,
        headers: {
          'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=unsubscribe>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      });
      if (sendErr) throw new Error(sendErr.message || JSON.stringify(sendErr));
      ok++;
      console.log(`  OK   #${row.position}  ${row.email}`);
    } catch (err) {
      fail++;
      console.warn(`  FAIL #${row.position}  ${row.email}  ${err.message}`);
    }
    if (i < rows.length - 1) {
      await new Promise((r) => setTimeout(r, SLEEP_MS));
    }
  }

  console.log(`\nDone. Sent ${ok}, failed ${fail}.`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
