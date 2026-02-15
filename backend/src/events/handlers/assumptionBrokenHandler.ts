import { NotificationService } from '@services/notification-service';
import { logger } from '@utils/logger';
import { DomainEvent, EventType } from '../event-types';

/**
 * Handle 'assumption.broken' events.
 * Expected event: AssumptionBrokenEvent with { decisionId, assumptionId, message?, triggeredBy?, decisionName?, ctaUrl? }
 * Email notifications are automatically sent by EmailNotificationHandler via NotificationService
 */
export async function handleAssumptionBroken(event: DomainEvent) {
  if (event.type !== EventType.ASSUMPTION_BROKEN) return;

  const { decisionId, assumptionId, message, triggeredBy, decisionName, ctaUrl } = event;

  if (!decisionId) {
    logger.warn('assumptionBrokenHandler: missing decisionId');
    return;
  }

  const title = `Assumption broken${assumptionId ? `: ${assumptionId}` : ''}`;
  const bodyText = message ?? `An assumption on decision "${decisionName ?? decisionId}" was marked broken.`;

  try {
    // Create in-app notification
    // Email notification will be sent automatically by EmailNotificationHandler
    await NotificationService.create({
      type: 'ASSUMPTION_BROKEN',
      severity: 'CRITICAL',
      title,
      message: bodyText,
      decisionId,
      assumptionId,
      metadata: { triggeredBy, decisionName, ctaUrl }
    });
  } catch (err: any) {
    logger.error('assumptionBrokenHandler: failed to create notification', {
      error: err?.message || err,
      decisionId,
      assumptionId
    });
  }
}

export default handleAssumptionBroken;
