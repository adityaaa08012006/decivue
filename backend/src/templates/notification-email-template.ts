import { NotificationSeverity, NotificationType } from '@services/notification-service';

export interface NotificationEmailParams {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  decisionName?: string;
  ctaUrl?: string;
  ctaText?: string;
}

// Configuration for each notification type
const NOTIFICATION_CONFIG: Record<NotificationType, { icon: string; defaultCtaText: string }> = {
  ASSUMPTION_CONFLICT: {
    icon: '⚠️',
    defaultCtaText: 'Review Conflicts'
  },
  DECISION_CONFLICT: {
    icon: '⚠️',
    defaultCtaText: 'Review Conflicts'
  },
  HEALTH_DEGRADED: {
    icon: '📉',
    defaultCtaText: 'View Decision'
  },
  LIFECYCLE_CHANGED: {
    icon: '🔄',
    defaultCtaText: 'View Decision'
  },
  NEEDS_REVIEW: {
    icon: '📅',
    defaultCtaText: 'Review Decision'
  },
  ASSUMPTION_BROKEN: {
    icon: '🚨',
    defaultCtaText: 'View Decision'
  },
  DEPENDENCY_BROKEN: {
    icon: '🔗',
    defaultCtaText: 'View Dependencies'
  }
};

// Severity-based colors
const SEVERITY_COLORS: Record<NotificationSeverity, { primary: string; background: string }> = {
  INFO: {
    primary: '#3b82f6', // blue
    background: '#eff6ff'
  },
  WARNING: {
    primary: '#f59e0b', // orange
    background: '#fffbeb'
  },
  CRITICAL: {
    primary: '#ef4444', // red
    background: '#fef2f2'
  }
};

export function notificationEmailTemplate({
  type,
  severity,
  title,
  message,
  decisionName,
  ctaUrl,
  ctaText
}: NotificationEmailParams): string {
  const config = NOTIFICATION_CONFIG[type];
  const colors = SEVERITY_COLORS[severity];
  const finalCtaText = ctaText || config.defaultCtaText;

  const ctaHtml = ctaUrl
    ? `<p style="margin:16px 0;"><a href="${ctaUrl}" style="background:${colors.primary};color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block;">${finalCtaText}</a></p>`
    : '';

  const decisionLine = decisionName
    ? `<p style="margin:0 0 8px 0;color:#374151;font-size:14px;"><strong>Decision:</strong> ${decisionName}</p>`
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
            <!-- Header -->
            <tr>
              <td style="padding:18px 20px; background:#0b5cff; color:#fff;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <div style="width:36px;height:36px;border-radius:6px;background:#fff;color:#0b5cff;display:flex;align-items:center;justify-content:center;font-weight:700;">D</div>
                  <div style="font-size:16px;font-weight:600;">Decivue</div>
                </div>
              </td>
            </tr>

            <!-- Severity Badge -->
            <tr>
              <td style="padding:16px 20px 0 20px;">
                <div style="display:inline-block;background:${colors.background};color:${colors.primary};padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;border-left:3px solid ${colors.primary};">
                  <span style="font-size:16px;margin-right:6px;">${config.icon}</span>
                  ${severity}
                </div>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:16px 20px 20px 20px;">
                <h1 style="margin:0 0 8px 0;font-size:18px;color:#0b1220;">${title}</h1>
                ${decisionLine}
                <div style="margin-top:12px;color:#374151;font-size:14px;line-height:1.45;">${message}</div>
                ${ctaHtml}
                <hr style="border:none;border-top:1px solid #eef2f7;margin:18px 0;">
                <p style="color:#6b7280;font-size:12px;margin:0;">
                  You are receiving this notification because you are a participant on this decision.
                  You can manage your email preferences in your account settings.
                </p>
              </td>
            </tr>

            <!-- Footer -->
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

export default notificationEmailTemplate;
