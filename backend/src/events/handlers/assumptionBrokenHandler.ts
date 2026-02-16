import { NotificationService } from '@services/notification-service';
import { logger } from '@utils/logger';
import { DomainEvent, EventType } from '../event-types';
import { getAdminDatabase } from '@data/database';

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
    // Check if notification already exists to prevent duplicates
    const db = getAdminDatabase();
    const { data: existingNotification } = await db
      .from('notifications')
      .select('id')
      .eq('type', 'ASSUMPTION_BROKEN')
      .eq('assumption_id', assumptionId)
      .eq('decision_id', decisionId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Only create notification if one doesn't already exist
    if (!existingNotification) {
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
    } else {
      logger.info(`Skipping duplicate ASSUMPTION_BROKEN notification for assumption ${assumptionId} - notification already exists`);
    }
  } catch (err: any) {
    logger.error('assumptionBrokenHandler: failed to create notification', {
      error: err?.message || err,
      decisionId,
      assumptionId
    });
  }
}

export default handleAssumptionBroken;
