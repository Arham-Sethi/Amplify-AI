// lib/campaign.js
//
// Shared infrastructure for sending update emails to the waitlist.
// Inbox-friendly by construction: matching plain text + HTML, personal
// reply-to, List-Unsubscribe headers, 600ms pacing. Layout has light brand
// chrome (wordmark header, footer with unsubscribe / Discord / contact)
// without banner images, CTA buttons, or marketing copy that would push
// the message into Promotions.
//
// Each campaign script imports `sendCampaign` and provides:
//   - subject line
//   - per-recipient buildEmail({ name, position }) => { text, bodyHtml, preheader }
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
  || 'Amplify AI <hello@amplifyai.cc>';

const REPLY_TO = process.env.REPLY_TO_EMAIL || 'contact@kangaroo.solutions';

const DISCORD_URL = 'https://discord.gg/kxx3hQd9';
const SUPPORT_EMAIL = 'contact@kangaroo.solutions';
const SITE_URL = 'https://amplifyai.cc';

/**
 * Escape user-supplied strings before interpolating into HTML.
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

/**
 * Wrap inner email content in the shared Amplify layout.
 *
 * The layout:
 *   - Hidden preheader text shown in inbox preview
 *   - Light header card with the "(a) Amplify" wordmark
 *   - Body card with comfortable typography and spacing
 *   - Compact footer with brand line, waitlist disclosure, and three
 *     small links: Unsubscribe, Discord, Contact
 *
 * Deliberately no banner images, no CTA buttons, no gradient blocks.
 * Branded enough to feel like a real product email; restrained enough
 * to land in Primary instead of Promotions.
 *
 * @param {object} opts
 * @param {string} opts.preheader  Short teaser shown in inbox preview (1 sentence).
 * @param {string} opts.bodyHtml   Inner content already rendered as HTML.
 * @returns {string} full HTML document
 */
export function wrapLayout({ preheader, bodyHtml }) {
  const safePreheader = escapeHtml(preheader || '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Amplify AI</title>
</head>
<body style="margin:0;padding:0;background:#f5efe6;font-family:'Inter',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${safePreheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5efe6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;">
          <tr>
            <td style="padding:22px 36px 18px;border-bottom:1px solid #f0e7d6;">
              <span style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#3d2b1f;">(a)</span><span style="font-family:'Inter',system-ui,sans-serif;font-size:18px;font-weight:700;color:#3d2b1f;margin-left:6px;letter-spacing:-0.01em;">Amplify</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 36px 32px;font-family:'Inter',system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.65;color:#2c1f15;">
${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 36px;background:#faf5ec;border-top:1px solid #f0e7d6;font-family:'Inter',system-ui,sans-serif;font-size:12px;line-height:1.6;color:#a8977f;">
              <p style="margin:0 0 6px;color:#7a6555;">
                <strong style="color:#3d2b1f;">Amplify AI</strong> &middot; <a href="${SITE_URL}" style="color:#7a6555;text-decoration:none;">amplifyai.cc</a>
              </p>
              <p style="margin:0 0 6px;">You're getting this because you joined the Amplify AI waitlist.</p>
              <p style="margin:0;">
                <a href="mailto:${SUPPORT_EMAIL}?subject=unsubscribe" style="color:#a8977f;text-decoration:underline;">Unsubscribe</a>
                &nbsp;&middot;&nbsp;
                <a href="${DISCORD_URL}" style="color:#a8977f;text-decoration:underline;">Discord</a>
                &nbsp;&middot;&nbsp;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#a8977f;text-decoration:underline;">Contact</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
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
 * @param {(row: { name: string, position: number }) => { text: string, bodyHtml: string, preheader?: string }} opts.buildEmail
 *   Per-recipient content builder. Must return matching plain text and the
 *   *inner* HTML body (without DOCTYPE/wrapper). The shared layout is
 *   applied automatically.
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
    const built = buildEmail({ name: row.name, position: row.position });
    const text = built.text;
    const html = wrapLayout({
      preheader: built.preheader || '',
      bodyHtml: built.bodyHtml,
    });

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
