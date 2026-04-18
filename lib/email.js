import { Resend } from 'resend';

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'Amplify AI <hello@amplifyai.cc>';
const appUrl = process.env.APP_URL || 'https://www.amplifyai.cc';

// Defer client creation until a send is attempted — avoids crashing the
// serverless function on import if the env var is missing.
let resend;
function getResend() {
  if (!resendKey) {
    throw new Error('Missing RESEND_API_KEY env var');
  }
  if (!resend) {
    resend = new Resend(resendKey);
  }
  return resend;
}

// Shared layout so both emails stay visually consistent with the brand.
function wrapLayout({ heading, bodyHtml }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#f5efe6; font-family:'Inter',system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe6; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(60,43,31,0.08);">
          <tr>
            <td style="background:#3d2b1f; padding:32px 40px; text-align:center;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-size:24px; font-weight:700; color:#f5efe6;">(a)</span>
              <span style="font-family:'Inter',system-ui,sans-serif; font-size:20px; font-weight:700; color:#f5efe6; margin-left:8px;">Amplify</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 16px; font-size:22px; color:#2c1810;">${heading}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px; background:#f9f5ef; border-top:1px solid rgba(60,43,31,0.06); text-align:center;">
              <p style="margin:0; color:#a8977f; font-size:12px;">
                &copy; ${new Date().getFullYear()} Amplify AI. All rights reserved.
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

// Welcome email — sent the first time a user signs in to their account.
// No position / access code here; those come later when they opt into the
// waitlist via /api/signup.
export async function sendWelcomeEmail({ email, name }) {
  const displayName = name || 'there';

  const bodyHtml = `
    <p style="margin:0 0 16px; color:#7a6555; font-size:15px; line-height:1.6;">
      Welcome to Amplify AI — we're thrilled to have you.
    </p>
    <p style="margin:0 0 16px; color:#7a6555; font-size:15px; line-height:1.6;">
      Amplify turns your rough prompts into precise, high-quality instructions that
      consistently pull better answers out of any AI model. You'll be among the first
      to try it when we launch.
    </p>
    <p style="margin:0 0 24px; color:#7a6555; font-size:15px; line-height:1.6;">
      Next step: head back to our site and join the waitlist to reserve your spot and
      lock in <strong>50% off for life</strong> (first 100 users only).
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
      <tr>
        <td style="background:#3d2b1f; border-radius:12px;">
          <a href="${appUrl}/#waitlist" style="display:inline-block; padding:14px 32px; color:#f5efe6; font-size:15px; font-weight:600; text-decoration:none;">
            Join the Waitlist
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0; color:#a8977f; font-size:13px; line-height:1.5;">
      Questions? Just reply to this email — it goes straight to our team.
    </p>
  `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: email,
    subject: `Welcome to Amplify AI, ${displayName}!`,
    html: wrapLayout({ heading: `Hey ${displayName}!`, bodyHtml }),
  });

  if (error) {
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
}

// Waitlist confirmation email — sent after /api/signup inserts a new row.
// Includes the position and access code the user just earned.
export async function sendWaitlistEmail({ email, name, position, code }) {
  const displayName = name || 'there';
  const isTop100 = position <= 100;

  const bodyHtml = `
    <p style="margin:0 0 24px; color:#7a6555; font-size:15px; line-height:1.6;">
      You're officially on the Amplify AI waitlist. Here are the details of your spot:
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px; background:rgba(196,122,58,0.08); border-radius:12px; padding:16px 24px;">
      <tr>
        <td style="text-align:center;">
          <span style="font-size:12px; color:#7a6555; text-transform:uppercase; letter-spacing:0.05em;">Your Position</span><br>
          <span style="font-size:36px; font-weight:800; color:#c47a3a;">#${position}</span>
        </td>
      </tr>
    </table>

    ${isTop100 ? `
    <p style="margin:0 0 24px; color:#2c1810; font-size:15px; line-height:1.6; background:#fef4e8; padding:14px 18px; border-radius:10px; border-left:4px solid #c47a3a;">
      <strong>You're in the first 100!</strong> You've locked in <strong>50% off for life</strong> and early access the moment we launch.
    </p>
    ` : `
    <p style="margin:0 0 24px; color:#7a6555; font-size:15px; line-height:1.6;">
      Every person ahead of you moves the line forward. Keep an eye on your inbox — we'll let you know the moment your spot opens.
    </p>
    `}

    <table cellpadding="0" cellspacing="0" style="width:100%; background:#f5efe6; border-radius:10px; margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <span style="font-size:12px; color:#7a6555;">Your Access Code (save this!)</span><br>
          <code style="font-size:20px; font-weight:700; color:#2c1810; letter-spacing:0.05em;">${code}</code>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px; color:#a8977f; font-size:13px; line-height:1.5;">
      Use this code to check your waitlist position anytime at
      <a href="${appUrl}" style="color:#c47a3a;">${appUrl.replace('https://', '')}</a>.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background:#3d2b1f; border-radius:12px;">
          <a href="${appUrl}/account" style="display:inline-block; padding:14px 32px; color:#f5efe6; font-size:15px; font-weight:600; text-decoration:none;">
            View My Account
          </a>
        </td>
      </tr>
    </table>
  `;

  const { error } = await getResend().emails.send({
    from: fromEmail,
    to: email,
    subject: `You're #${position} on the Amplify AI waitlist!`,
    html: wrapLayout({ heading: `You're in, ${displayName}!`, bodyHtml }),
  });

  if (error) {
    throw new Error(`Failed to send waitlist email: ${error.message}`);
  }
}
