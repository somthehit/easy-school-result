export function welcomeMail(userName: string) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Welcome</title>
    </head>
    <body style="font-family: Arial, sans-serif; background:#f9fafb; margin:0; padding:0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:20px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
              <tr>
                <td style="background:#16a34a; color:#fff; padding:12px; text-align:center; font-size:22px; font-weight:bold;">
                  Welcome to School Results
                </td>
              </tr>
              <tr>
                <td style="padding:30px; color:#374151; font-size:16px; line-height:1.6;">
                  <p>Hello <strong>${userName}</strong>,</p>
                  <p>We’re excited to have you on board! 🎉</p>
                  <p>You can now create results, manage students, and share them with your class.</p>
                  <p style="margin-top:30px;">Best regards,<br/>The School Results Team</p>
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

export function buildWelcomeMail(userName: string) {
  const subject = `Welcome to School Results`;
  const html = welcomeMail(userName);
  const text = `Hello ${userName},\n\nWelcome to School Results! You can now create results, manage students, and share them with your class.\n\n— The School Results Team`;
  return { subject, text, html };
}