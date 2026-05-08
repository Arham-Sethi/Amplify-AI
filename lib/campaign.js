// lib/campaign.js
//
// Shared infrastructure for sending update emails to the waitlist.
// Built on top of the proven pattern in scripts/send-discord-invite.js —
// minimal HTML, personal-name From, matching text/html, List-Unsubscribe
// headers, 600ms pacing. All of this biases Gmail toward Primary instead
// of Promotions.
//
// Each campaign script imports `sendCampaign` and provides:
//   - subject line
//   - per-recipient buildEmail({ name, position }) => { text, html }
//   - optional campaignName (for log lines)
//
// CLI flags handled here:
//   --dry-run            preview the recipient list, send nothing
//   --only=email@x.com   send to a single address (testing)

import { Resend } from 'resend';
import { supabase } from './supabase.js';

const SLEEP_MS = 600; // pace; well under Resend's 10 req/s limit

const FROM = process.env.CAMPAIGN_FROM_EMAIL
  || process.env.FROM_EMAIL
  || 'Dev from Amplify AI <hello@amplifyai.cc>';

const REPLY_TO = process.env.REPLY_TO_EMAIL || 'contact@kangaroo.solutions';

/**
 * Escape user-supplied strings before interpolating into HTML.
 * Mirrors send-discord-invite.js to keep the surface identical.
 */
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/**
 * Pull the first word of a name. Falls back to "there" so an empty/missing
 * name still renders gracefully ("Hi there,").
 */
export function firstName(name) {
  return (name && name.split(' ')[0].trim()) || 'there';
}

async function fetchRecipients(only) {
  const { data, error } = await supabase
    .from('waitlist')
    .select('email, name, position')
    .order('position', { ascending: true });

  if (error) throw new Error(`DB query failed: ${error.message}`);

  // Dedupe by lowercased email, skip empties (defence-in-depth on top of
  // the DB unique constraint).
  const seen = new Set();
  return data.filter((r) => {
    if (!r.email) return false;
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    if (only && key !== only) return false;
    return true;
  });
}

function parseArgs() {
  const argv = process.argv;
  const dryRun = argv.includes('--dry-run');
  const onlyArg = argv.find((a) => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.slice('--only='.length).toLowerCase() : null;
  return { dryRun, only };
}

/**
 * Send a campaign to all waitlist users.
 *
 * @param {object} opts
 * @param {string} opts.subject
 *   Subject line. Keep lowercase, under ~50 chars, no `!` `[]` emoji.
 * @param {(row: { name: string, position: number }) => { text: string, html: string }} opts.buildEmail
 *   Per-recipient content builder. Must return matching plain text and
 *   HTML — Gmail downranks emails where they diverge significantly.
 * @param {string} [opts.campaignName]
 *   Used only for log lines so you know which broadcast you triggered.
 */
export async function sendCampaign({ subject, buildEmail, campaignName }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Missing RESEND_API_KEY env var');
  }
  if (typeof buildEmail !== 'function') {
    throw new Error('sendCampaign requires a buildEmail function');
  }
  if (!subject || typeof subject !== 'string') {
    throw new Error('sendCampaign requires a subject string');
  }

  const { dryRun, only } = parseArgs();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const rows = await fetchRecipients(only);

  console.log(`Campaign: ${campaignName || subject}`);
  console.log(`Subject:  ${subject}`);
  console.log(`From:     ${FROM}`);
  console.log(`Reply-To: ${REPLY_TO}`);
  console.log(`Found ${rows.length} recipient(s).`);
  if (only) console.log(`(filtered to --only=${only})`);

  if (dryRun) {
    rows.forEach((r) => {
      console.log(`  #${r.position}  ${r.email}  ${r.name || ''}`);
    });
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
    const { text, html } = buildEmail({ name: row.name, position: row.position });

    try {
      const { error: sendErr } = await resend.emails.send({
        from: FROM,
        to: row.email,
        replyTo: REPLY_TO,
        subject,
        text,
        html,
        headers: {
          // Gmail/Yahoo bulk-sender rules (Feb 2024) require both.
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
