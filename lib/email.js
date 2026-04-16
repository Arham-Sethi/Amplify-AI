import { Resend } from 'resend';

const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.FROM_EMAIL || 'Amplify AI <noreply@amplifyai.com>';
const appUrl = process.env.APP_URL || 'https://amplifyai.com';

if (!resendKey) {
  throw new Error('Missing RESEND_API_KEY env var');
}

const resend = new Resend(resendKey);

export async function sendVerificationEmail({ email, name, token, code, position }) {
  const verifyUrl = `${appUrl}/api/verify?token=${token}`;
  const displayName = name || 'there';

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `Welcome to Amplify - You're #${position} on the waitlist!`,
    html: `
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

          <!-- Header -->
          <tr>
            <td style="background:#3d2b1f; padding:32px 40px; text-align:center;">
              <span style="font-family:Georgia,'Times New Roman',serif; font-size:24px; font-weight:700; color:#f5efe6;">(a)</span>
              <span style="font-family:'Inter',system-ui,sans-serif; font-size:20px; font-weight:700; color:#f5efe6; margin-left:8px;">Amplify</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px; font-size:22px; color:#2c1810;">Hey ${displayName}!</h1>
              <p style="margin:0 0 24px; color:#7a6555; font-size:15px; line-height:1.6;">
                You've joined the Amplify waitlist. Please verify your email to secure your spot.
              </p>

              <!-- Position Badge -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px; background:rgba(196,122,58,0.08); border-radius:12px; padding:16px 24px;">
                <tr>
                  <td style="text-align:center;">
                    <span style="font-size:12px; color:#7a6555; text-transform:uppercase; letter-spacing:0.05em;">Your Position</span><br>
                    <span style="font-size:36px; font-weight:800; color:#c47a3a;">#${position}</span>
                  </td>
                </tr>
              </table>

              <!-- Verify Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#3d2b1f; border-radius:12px;">
                    <a href="${verifyUrl}" style="display:inline-block; padding:14px 32px; color:#f5efe6; font-size:15px; font-weight:600; text-decoration:none;">
                      Verify My Email
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Access Code -->
              <table cellpadding="0" cellspacing="0" style="width:100%; background:#f5efe6; border-radius:10px; margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <span style="font-size:12px; color:#7a6555;">Your Access Code (save this!)</span><br>
                    <code style="font-size:20px; font-weight:700; color:#2c1810; letter-spacing:0.05em;">${code}</code>
                  </td>
                </tr>
              </table>

              <p style="margin:0; color:#a8977f; font-size:13px; line-height:1.5;">
                Use this code to check your waitlist position anytime at
                <a href="${appUrl}" style="color:#c47a3a;">${appUrl.replace('https://', '')}</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
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
</html>
    `.trim(),
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
