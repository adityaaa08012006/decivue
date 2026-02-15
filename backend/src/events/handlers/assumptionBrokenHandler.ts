import resolveRecipients from '@services/recipient-resolver';
import { NotificationService } from '@services/notification-service';
import decisionAlertTemplate from '@templates/decisionAlertTemplate';
import { sendEmail } from '@services/emailService';
import { logger } from '@utils/logger';
import { DomainEvent, EventType } from '../event-types';

/**
 * Handle 'assumption.broken' events.
 * Expected event: AssumptionBrokenEvent with { decisionId, assumptionId, message?, triggeredBy?, decisionName?, ctaUrl? }
 */
export async function handleAssumptionBroken(event: DomainEvent) {
  if (event.type !== EventType.ASSUMPTION_BROKEN) return;

  const { decisionId, assumptionId, message, triggeredBy, decisionName, ctaUrl } = event;

  if (!decisionId) {
    logger.warn('assumptionBrokenHandler: missing decisionId');
    return;
  }

  const recipients = await resolveRecipients(decisionId, triggeredBy);

  const title = `Assumption broken${assumptionId ? `: ${assumptionId}` : ''}`;
  const bodyText = message ?? `An assumption on decision "${decisionName ?? decisionId}" was marked broken.`;

  await Promise.all(
    recipients.map(async (user) => {
      try {
        // Create in-app notification via existing NotificationService
        await NotificationService.create({
          type: 'ASSUMPTION_BROKEN',
          severity: 'CRITICAL',
          title,
          message: bodyText,
          decisionId,
          assumptionId,
          metadata: { triggeredBy }
        });

        // Respect user preference (assumption_broken boolean key)
        const prefersEmail = !!(user.email_notifications && user.email_notifications.assumption_broken);
        if (prefersEmail && user.email) {
          const html = decisionAlertTemplate({ title, decisionName: decisionName ?? 'Decision', message: bodyText, ctaUrl });
          await sendEmail(user.email, `${title} — ${decisionName ?? ''}`, html);
        }
      } catch (err: any) {
        logger.error('assumptionBrokenHandler: user processing failed', { userId: user.id, error: err?.message || err });
      }
    })
  );
}

export default handleAssumptionBroken;
