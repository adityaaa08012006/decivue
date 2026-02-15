import { NotificationType, NotificationSeverity } from './notification-service';
import resolveRecipients, { Recipient } from './recipient-resolver';
import { sendEmail } from './emailService';
import notificationEmailTemplate from '@templates/notification-email-template';
import { logger } from '@utils/logger';

export interface SendNotificationEmailParams {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  decisionId?: string;
  assumptionId?: string;
  metadata?: Record<string, any>;
}

// Map notification types to email preference keys (snake_case to match database)
const NOTIFICATION_TYPE_TO_PREFERENCE_KEY: Record<NotificationType, string> = {
  ASSUMPTION_CONFLICT: 'assumption_conflict',
  DECISION_CONFLICT: 'decision_conflict',
  HEALTH_DEGRADED: 'health_degraded',
  LIFECYCLE_CHANGED: 'lifecycle_changed',
  NEEDS_REVIEW: 'needs_review',
  ASSUMPTION_BROKEN: 'assumption_broken',
  DEPENDENCY_BROKEN: 'dependency_broken'
};

/**
 * Email Notification Handler
 * Centralized service for sending email notifications across all notification types
 */
export class EmailNotificationHandler {
  /**
   * Send email notifications for a notification
   */
  static async sendForNotification(params: SendNotificationEmailParams): Promise<void> {
    const isEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false';
    if (!isEnabled) {
      logger.info('Email notifications disabled via environment variable');
      return;
    }

    // Skip if no decision ID (can't resolve recipients without it)
    if (!params.decisionId) {
      logger.debug('No decisionId provided, skipping email notification', { type: params.type });
      return;
    }

    try {
      // Resolve recipients for this decision
      const triggeredBy = params.metadata?.triggeredBy;
      const recipients = await resolveRecipients(params.decisionId, triggeredBy);

      if (recipients.length === 0) {
        logger.debug('No recipients found for notification', {
          type: params.type,
          decisionId: params.decisionId
        });
        return;
      }

      // Generate CTA URL
      const ctaUrl = this.generateCtaUrl(params.type, params.decisionId, params.assumptionId);

      // Get decision name from metadata if available
      const decisionName = params.metadata?.decisionName as string | undefined;

      // Send emails to each recipient (respecting their preferences)
      await Promise.all(
        recipients.map((recipient) =>
          this.sendToRecipient(recipient, params, decisionName, ctaUrl)
        )
      );

      logger.info('Email notifications sent', {
        type: params.type,
        recipientCount: recipients.length,
        decisionId: params.decisionId
      });
    } catch (error: any) {
      // Don't throw - email failure shouldn't break notification creation
      logger.error('Failed to send email notifications', {
        error: error?.message || error,
        type: params.type,
        decisionId: params.decisionId
      });
    }
  }

  /**
   * Send email to a single recipient if they have email notifications enabled
   */
  private static async sendToRecipient(
    recipient: Recipient,
    params: SendNotificationEmailParams,
    decisionName: string | undefined,
    ctaUrl: string | undefined
  ): Promise<void> {
    try {
      // Check if recipient has email
      if (!recipient.email) {
        logger.debug('Recipient has no email address', { recipientId: recipient.id });
        return;
      }

      // Check user preferences
      const prefersEmail = this.checkUserPreference(recipient, params.type);
      if (!prefersEmail) {
        logger.debug('Recipient has disabled email notifications for this type', {
          recipientId: recipient.id,
          type: params.type
        });
        return;
      }

      // Generate email HTML
      const html = notificationEmailTemplate({
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        decisionName,
        ctaUrl
      });

      // Generate subject line
      const subject = this.getEmailSubject(params.title, decisionName);

      // Send email
      await sendEmail(recipient.email, subject, html);

      logger.debug('Email sent to recipient', {
        recipientId: recipient.id,
        type: params.type
      });
    } catch (error: any) {
      logger.error('Failed to send email to recipient', {
        error: error?.message || error,
        recipientId: recipient.id,
        type: params.type
      });
      // Don't throw - continue to other recipients
    }
  }

  /**
   * Check if user wants email notifications for this notification type
   */
  private static checkUserPreference(recipient: Recipient, type: NotificationType): boolean {
    if (!recipient.email_notifications) {
      // Default to true if no preferences set
      return true;
    }

    const preferenceKey = NOTIFICATION_TYPE_TO_PREFERENCE_KEY[type];
    const preference = recipient.email_notifications[preferenceKey];

    // Default to true if preference not explicitly set
    return preference !== false;
  }

  /**
   * Generate appropriate CTA URL based on notification type
   */
  private static generateCtaUrl(
    type: NotificationType,
    decisionId: string,
    assumptionId?: string
  ): string | undefined {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    switch (type) {
      case 'ASSUMPTION_CONFLICT':
        return assumptionId
          ? `${baseUrl}/assumptions/${assumptionId}`
          : `${baseUrl}/decisions/${decisionId}#assumptions`;
      case 'ASSUMPTION_BROKEN':
        return `${baseUrl}/decisions/${decisionId}#assumptions`;
      case 'DEPENDENCY_BROKEN':
        return `${baseUrl}/decisions/${decisionId}#dependencies`;
      case 'HEALTH_DEGRADED':
      case 'LIFECYCLE_CHANGED':
      case 'NEEDS_REVIEW':
      case 'DECISION_CONFLICT':
        return `${baseUrl}/decisions/${decisionId}`;
      default:
        return `${baseUrl}/decisions/${decisionId}`;
    }
  }

  /**
   * Generate email subject line
   */
  private static getEmailSubject(
    title: string,
    decisionName?: string
  ): string {
    const decisionPart = decisionName ? ` — ${decisionName}` : '';

    // Use the title directly as it's already formatted well
    return `${title}${decisionPart}`;
  }
}

export default EmailNotificationHandler;
