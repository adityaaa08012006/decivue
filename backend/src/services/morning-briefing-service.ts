
import { getAdminDatabase } from '@data/database';
import { logger } from '@utils/logger';
import { sendEmail } from './emailService';
import resolveRecipients, { Recipient } from './recipient-resolver';
import { NotificationType } from './notification-service';

interface DigestItem {
  type: NotificationType;
  title: string;
  message: string;
  decisionId?: string;
  decisionName?: string;
  count: number;
  metadata?: any;
  createdAt: string;
}

interface UserDigest {
  user: Recipient;
  items: DigestItem[];
}

export class MorningBriefingService {
  /**
   * Run the morning briefing process
   * Sends a digest email to all users with pending notifications
   */
  static async sendBriefings(): Promise<void> {
    logger.info('Starting morning briefing process');
    
    try {
      // 1. Get all pending notifications (all types except CRITICAL which are sent immediately)
      // We look back 24 hours to ensure we don't miss anything, but also don't spam old stuff
      // Ideally we'd mark them as 'processed_for_digest', but 'email_sent' is our current flag
      const db = getAdminDatabase();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const { data: notifications, error } = await db
        .from('notifications')
        .select('*')
        .eq('email_sent', false)
        .gte('created_at', twentyFourHoursAgo)
        .neq('severity', 'CRITICAL'); // augment safety check

      if (error) throw error;

      if (!notifications || notifications.length === 0) {
        logger.info('No pending notifications for morning briefing');
        return;
      }

      logger.info(`Processing ${notifications.length} notifications for briefing`);

      // 2. Map notifications to users
      const userDigests = new Map<string, UserDigest>();

      // Cache decision recipients to avoid DB hammer
      const decisionRecipientsCache = new Map<string, Recipient[]>();

      for (const notification of notifications) {
        if (!notification.decision_id) continue;

        // Get recipients for this decision
        let recipients = decisionRecipientsCache.get(notification.decision_id);
        
        if (!recipients) {
          recipients = await resolveRecipients(notification.decision_id);
          decisionRecipientsCache.set(notification.decision_id, recipients);
        }

        // Add to each user's digest
        for (const recipient of recipients) {
            if (!recipient.email) continue;
            
            // Check preference for this notification type
            if (!this.checkUserPreference(recipient, notification.type)) {
                continue;
            }

            if (!userDigests.has(recipient.id)) {
                userDigests.set(recipient.id, {
                    user: recipient,
                    items: []
                });
            }

            const digest = userDigests.get(recipient.id)!;
            
            // Add item
            digest.items.push({
                type: notification.type,
                title: notification.title,
                message: notification.message,
                decisionId: notification.decision_id,
                decisionName: notification.metadata?.decisionName,
                count: 1, // could rely on aggregating similar ones later
                metadata: notification.metadata,
                createdAt: notification.created_at
            });
        }
      }

      // 3. Send emails
      const sentCount = 0;
      for (const [userId, digest] of userDigests.entries()) {
        if (digest.items.length === 0) continue;

        try {
            await this.sendDigestEmail(digest.user, digest.items);
            // logger.info(`Sent morning briefing to ${digest.user.email} with ${digest.items.length} items`);
        } catch (err) {
            logger.error(`Failed to send briefing to ${digest.user.email}`, { error: err });
        }
      }

      // 4. Mark notifications as sent
      // We mark ALL processed notifications as sent, regardless of whether every individual user got them
      // because 'email_sent' is a flag on the Notification (system-wide), not per-user.
      // This assumes that if it was included in the briefing process, it's "done".
      if (notifications.length > 0) {
        const ids = notifications.map(n => n.id);
        await db.from('notifications')
            .update({ email_sent: true })
            .in('id', ids);
            
        logger.info(`Marked ${ids.length} notifications as processed`);
      }

    } catch (error) {
      logger.error('Error in morning briefing process', { error });
    }
  }

  private static async sendDigestEmail(user: Recipient, items: DigestItem[]): Promise<void> {
    // Sort items by priority/type
    // Group by Decision? Or by Type?
    // Let's simple list for now, or group by Decision
    const subject = `Your Morning Briefing - ${items.length} Updates`;
    const html = this.generateDigestHtml(user, items);
    
    if (user.email) {
        await sendEmail(user.email, subject, html);
    }
  }

  private static generateDigestHtml(user: Recipient, items: DigestItem[]): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    // Group by decision for better readability
    const decisions = new Map<string, DigestItem[]>();
    for (const item of items) {
        const key = item.decisionId || 'unknown';
        if (!decisions.has(key)) decisions.set(key, []);
        decisions.get(key)!.push(item);
    }

    let rows = '';
    
    for (const [decisionId, decisionItems] of decisions.entries()) {
        const decisionName = decisionItems[0].decisionName || 'Untitled Decision';
        const url = `${baseUrl}/decisions/${decisionId}`;
        
        rows += `
            <div style="margin-bottom: 24px; border-left: 3px solid #0b5cff; padding-left: 16px; background:#f9fafb; padding:12px 16px; border-radius:0 4px 4px 0;">
                <h3 style="margin: 0 0 12px 0;">
                    <a href="${url}" style="color: #0b1220; text-decoration: none; font-size:16px; font-weight:600;">${decisionName}</a>
                </h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size:14px; line-height:1.6;">
                    ${decisionItems.map(item => `
                        <li style="margin-bottom: 8px;">
                            <strong style="color:#0b1220;">${item.title}:</strong> ${item.message}
                            <span style="color: #9ca3af; font-size: 11px; margin-left: 8px;">
                                ${new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    }

    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Morning Briefing</title>
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
                  <div style="width:36px;height:36px;border-radius:6px;background:#fff;color:#0b5cff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;">D</div>
                  <div style="font-size:18px;font-weight:600;">Decivue</div>
                </div>
              </td>
            </tr>

            <!-- Title -->
            <tr>
              <td style="padding:24px 20px 8px 20px;">
                <h1 style="margin:0;font-size:22px;color:#0b1220;">Morning Briefing ☕</h1>
                <p style="margin:8px 0 0 0;color:#6b7280;font-size:14px;">Here's what happened while you were away:</p>
              </td>
            </tr>

            <!-- Content -->
            <tr>
              <td style="padding:16px 20px 20px 20px;">
                ${rows}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding:16px 20px; background:#fafafa; border-top:1px solid #e5e7eb;">
                <p style="color:#6b7280;font-size:12px;margin:0 0 8px 0;">
                  These updates were queued for your morning digest. Critical alerts are still sent immediately.
                </p>
                <p style="margin:0;">
                  <a href="${baseUrl}/settings/notifications" style="color:#0b5cff;font-size:12px;text-decoration:none;">Manage notification preferences →</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  // Duplicate logic from EmailNotificationHandler (should refactor later)
  private static checkUserPreference(recipient: Recipient, type: NotificationType): boolean {
    if (!recipient.email_notifications) return true;
    
    // Quick map since we can't import the private map from another class easily without refactoring
    // Ideally this map moves to a shared constants file
    const keyMap: Record<string, string> = {
      ASSUMPTION_CONFLICT: 'assumption_conflict',
      DECISION_CONFLICT: 'decision_conflict',
      HEALTH_DEGRADED: 'health_degraded',
      LIFECYCLE_CHANGED: 'lifecycle_changed',
      NEEDS_REVIEW: 'needs_review',
      ASSUMPTION_BROKEN: 'assumption_broken',
      DEPENDENCY_BROKEN: 'dependency_broken'
    };

    const key = keyMap[type];
    if (!key) return true;
    
    return recipient.email_notifications[key] !== false;
  }
}

export default MorningBriefingService;
