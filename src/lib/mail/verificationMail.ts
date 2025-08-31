export function verificationMail(otp: string, link?: string) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f9fafb; margin:0; padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
              <tr>
                <td style="background:#2563eb; color:#fff; padding:12px; text-align:center; font-size:22px; font-weight:bold;">
                  School Results
                </td>
              </tr>
              <tr>
                <td style="padding:30px; color:#374151; font-size:16px; line-height:1.6;">
                  <p>Hi there,</p>
                  <p>Use the following verification code to complete your sign-up:</p>
                  <p style="text-align:center; margin:30px 0;">
                    <span style="display:inline-block; font-size:24px; font-weight:bold; letter-spacing:4px; color:#2563eb;">
                      ${otp}
                    </span>
                  </p>
                  ${link ? `<p>Or click to verify: <a href="${link}">${link}</a></p>` : ""}
                  <p>This code will expire in <strong>10 minutes</strong>.</p>
                  <p style="margin-top:30px;">Thank you,<br/>The School Results Team</p>
                </td>
              </tr>
              <tr>
                <td style="background:#f3f4f6; padding:8px; text-align:center; color:#6b7280; font-size:12px;">
                  &copy; ${new Date().getFullYear()} School Results. All rights reserved.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;
  }
  
export function buildVerificationMail(otp: string, purpose: string, link?: string) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "School Results";
  const subject = `[${appName}] Your ${purpose} code`;
  const textBase = `Your verification code is ${otp}. It expires in 10 minutes.`;
  const text = link ? `${textBase}\n\nOr click to verify: ${link}` : textBase;
  const html = verificationMail(otp, link);
  return { subject, text, html };
}