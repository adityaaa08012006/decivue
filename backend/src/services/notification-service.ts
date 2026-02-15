/**
 * Notification Service
 * Generates notifications for conflicts, health changes, and items needing review
 */

import { getAdminDatabase } from '@data/database';
import { logger } from '@utils/logger';
import EmailNotificationHandler from './email-notification-handler';

export type NotificationType =
  | 'ASSUMPTION_CONFLICT'
  | 'DECISION_CONFLICT'
  | 'HEALTH_DEGRADED'
  | 'LIFECYCLE_CHANGED'
  | 'NEEDS_REVIEW'
  | 'ASSUMPTION_BROKEN'
  | 'DEPENDENCY_BROKEN';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

interface CreateNotificationParams {
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  message: string;
  decisionId?: string;
  assumptionId?: string;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async create(params: CreateNotificationParams): Promise<void> {
    try {
      const db = getAdminDatabase();

      // If organizationId not provided, fetch it from decision or assumption
      let organizationId = params.organizationId;

      if (!organizationId && params.decisionId) {
        const { data: decision } = await db
          .from('decisions')
          .select('organization_id')
          .eq('id', params.decisionId)
          .single();
        organizationId = decision?.organization_id;
      } else if (!organizationId && params.assumptionId) {
        const { data: assumption } = await db
          .from('assumptions')
          .select('organization_id')
          .eq('id', params.assumptionId)
          .single();
        organizationId = assumption?.organization_id;
      }

      const { error } = await db.from('notifications').insert({
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        decision_id: params.decisionId,
        assumption_id: params.assumptionId,
        organization_id: organizationId,
        metadata: params.metadata || {}
      });

      if (error) {
        logger.error('Failed to create notification', { error, params });
        throw error;
      }

      logger.info(`Notification created: ${params.type} - ${params.title}`);

      // Send email notifications
      await EmailNotificationHandler.sendForNotification({
        type: params.type,
        severity: params.severity,
        title: params.title,
        message: params.message,
        decisionId: params.decisionId,
        assumptionId: params.assumptionId,
        metadata: params.metadata
      });
    } catch (error) {
      logger.error('Error creating notification', { error });
    }
  }

  /**
   * Check for assumption conflicts and create notifications
   */
  static async checkAssumptionConflicts(): Promise<void> {
    try {
      const db = getAdminDatabase();

      // Get all assumptions with conflicts
      const { data: assumptions, error } = await db.rpc('get_all_assumption_conflicts');

      if (error) throw error;

      if (assumptions && assumptions.length > 0) {
        for (const assumption of assumptions) {
          // Check if we already have a notification for this conflict
          const { data: existing } = await db
            .from('notifications')
            .select('id')
            .eq('type', 'ASSUMPTION_CONFLICT')
            .eq('assumption_id', assumption.id)
            .eq('is_dismissed', false)
            .single();

          if (!existing) {
            // Get decision details for context
            const { data: decision } = await db
              .from('decisions')
              .select('id, title')
              .eq('id', assumption.decision_id)
              .single();

            await this.create({
              type: 'ASSUMPTION_CONFLICT',
              severity: 'WARNING',
              title: 'Assumption Conflict Detected',
              message: `Assumption "${assumption.description}" conflicts with other assumptions`,
              assumptionId: assumption.id,
              decisionId: assumption.decision_id,
              metadata: {
                conflicts: assumption.conflicts,
                decisionName: decision?.title,
                assumptionDescription: assumption.description
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking assumption conflicts', { error });
    }
  }

  /**
   * Check for degraded decision health and create notifications
   */
  static async checkDegradedHealth(): Promise<void> {
    try {
      const db = getAdminDatabase();

      // Get decisions with poor health
      const { data: decisions, error } = await db
        .from('decisions')
        .select('id, title, health_signal, lifecycle')
        .lt('health_signal', 65)
        .neq('lifecycle', 'RETIRED');

      if (error) throw error;

      if (decisions) {
        for (const decision of decisions) {
          // Check if we already have a recent notification for this decision
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await db
            .from('notifications')
            .select('id')
            .eq('type', 'HEALTH_DEGRADED')
            .eq('decision_id', decision.id)
            .gte('created_at', oneDayAgo)
            .single();

          if (!existing) {
            const severity: NotificationSeverity = decision.health_signal < 40 ? 'CRITICAL' : 'WARNING';

            await this.create({
              type: 'HEALTH_DEGRADED',
              severity,
              title: 'Decision Health Degraded',
              message: `"${decision.title}" has degraded to ${decision.health_signal}% health`,
              decisionId: decision.id,
              metadata: {
                healthSignal: decision.health_signal,
                lifecycle: decision.lifecycle,
                decisionName: decision.title
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking degraded health', { error });
    }
  }

  /**
   * Check for decisions needing review
   */
  static async checkNeedsReview(): Promise<void> {
    try {
      const db = getAdminDatabase();

      // Get decisions not reviewed in 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: decisions, error } = await db
        .from('decisions')
        .select('id, title, last_reviewed_at, lifecycle')
        .lt('last_reviewed_at', thirtyDaysAgo)
        .neq('lifecycle', 'RETIRED');

      if (error) throw error;

      if (decisions) {
        for (const decision of decisions) {
          // Check if we already have a notification
          const { data: existing } = await db
            .from('notifications')
            .select('id')
            .eq('type', 'NEEDS_REVIEW')
            .eq('decision_id', decision.id)
            .eq('is_dismissed', false)
            .single();

          if (!existing) {
            const daysSinceReview = Math.floor(
              (Date.now() - new Date(decision.last_reviewed_at).getTime()) / (24 * 60 * 60 * 1000)
            );

            await this.create({
              type: 'NEEDS_REVIEW',
              severity: daysSinceReview > 60 ? 'WARNING' : 'INFO',
              title: 'Decision Needs Review',
              message: `"${decision.title}" hasn't been reviewed in ${daysSinceReview} days`,
              decisionId: decision.id,
              metadata: {
                lastReviewedAt: decision.last_reviewed_at,
                daysSinceReview,
                decisionName: decision.title
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking needs review', { error });
    }
  }

  /**
   * Check for lifecycle changes that need attention
   */
  static async notifyLifecycleChange(
    decisionId: string,
    decisionTitle: string,
    oldLifecycle: string,
    newLifecycle: string
  ): Promise<void> {
    // Only notify for important transitions
    const importantTransitions = [
      'STABLE->AT_RISK',
      'STABLE->INVALIDATED',
      'UNDER_REVIEW->AT_RISK',
      'UNDER_REVIEW->INVALIDATED'
    ];

    const transition = `${oldLifecycle}->${newLifecycle}`;

    if (importantTransitions.includes(transition)) {
      const severity: NotificationSeverity = newLifecycle === 'INVALIDATED' ? 'CRITICAL' : 'WARNING';

      await this.create({
        type: 'LIFECYCLE_CHANGED',
        severity,
        title: 'Decision Lifecycle Changed',
        message: `"${decisionTitle}" transitioned from ${oldLifecycle} to ${newLifecycle}`,
        decisionId,
        metadata: {
          oldLifecycle,
          newLifecycle,
          decisionName: decisionTitle
        }
      });
    }
  }

  /**
   * Check for decisions approaching expiry date
   */
  static async checkExpiringDecisions(): Promise<void> {
    try {
      const db = getAdminDatabase();

      // Calculate dates
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Get decisions expiring within 30 days
      const { data: decisions, error } = await db
        .from('decisions')
        .select('id, title, expiry_date, lifecycle')
        .not('expiry_date', 'is', null)
        .lte('expiry_date', thirtyDaysFromNow)
        .gte('expiry_date', now.toISOString())
        .neq('lifecycle', 'RETIRED');

      if (error) throw error;

      if (decisions) {
        for (const decision of decisions) {
          // Check if we already have a notification for this expiry
          const { data: existing } = await db
            .from('notifications')
            .select('id')
            .eq('type', 'NEEDS_REVIEW')
            .eq('decision_id', decision.id)
            .eq('is_dismissed', false)
            .like('message', '%expiring%')
            .single();

          if (!existing) {
            const expiryDate = new Date(decision.expiry_date);
            const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

            // Determine severity based on days until expiry
            let severity: NotificationSeverity = 'INFO';
            if (daysUntilExpiry <= 7) {
              severity = 'CRITICAL';
            } else if (daysUntilExpiry <= 14) {
              severity = 'WARNING';
            }

            const expiryDateFormatted = expiryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await this.create({
              type: 'NEEDS_REVIEW',
              severity,
              title: `Decision Expiring Soon`,
              message: `"${decision.title}" is expiring in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''} on ${expiryDateFormatted}`,
              decisionId: decision.id,
              metadata: {
                expiryDate: decision.expiry_date,
                daysUntilExpiry,
                decisionName: decision.title
              }
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error checking expiring decisions', { error });
    }
  }

  /**
   * Run all notification checks (called periodically)
   */
  static async runAllChecks(): Promise<void> {
    logger.info('Running notification checks...');

    await this.checkAssumptionConflicts();
    await this.checkDegradedHealth();
    await this.checkNeedsReview();
    await this.checkExpiringDecisions();

    logger.info('Notification checks completed');
  }
}
