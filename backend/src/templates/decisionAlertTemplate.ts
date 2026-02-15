export interface DecisionAlertParams {
  title: string;
  decisionName: string;
  message: string;
  ctaUrl?: string;
}

export function decisionAlertTemplate({ title, decisionName, message, ctaUrl }: DecisionAlertParams): string {
  const ctaHtml = ctaUrl
    ? `<p style="margin:16px 0;"><a href="${ctaUrl}" style="background:#065fd4;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">View decision</a></p>`
    : '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#111; margin:0; padding:0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f8fb; padding:24px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 6px 18px rgba(17,24,39,0.06);">
            <tr>
              <td style="padding:18px 20px; background:#0b5cff; color:#fff;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:36px;height:36px;border-radius:6px;background:#fff;color:#0b5cff;display:flex;align-items:center;justify-content:center;font-weight:700;">D</div>
                  <div style="font-size:16px;font-weight:600;">Decivue</div>
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:20px;">
                <h1 style="margin:0 0 8px 0;font-size:18px;color:#0b1220;">${title}</h1>
                <p style="margin:0 0 8px 0;color:#374151;font-size:14px;"><strong>Decision:</strong> ${decisionName}</p>
                <div style="margin-top:12px;color:#374151;font-size:14px;line-height:1.45;">${message}</div>
                ${ctaHtml}
                <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0;">
                <p style="color:#6b7280;font-size:12px;margin:0;">You are receiving this because you are a participant on the decision.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:14px 20px; background:#fafafa; text-align:center; color:#9ca3af; font-size:12px;">
                Decivue — decision-driven notifications
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export default decisionAlertTemplate;
