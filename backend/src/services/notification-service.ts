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

      // Apply smart throttling:
      // - Critical: check 24h window (urgent issues should break through)
      // - Non-critical: check 7-day window (reduce UI clutter)
      const throttleWindow = params.severity === 'CRITICAL' ? 24 : 168; // hours
      const isThrottled = await this.checkThrottle(params, throttleWindow);
      if (isThrottled) {
        logger.debug('Throttling notification - duplicate within window', {
          type: params.type,
          decisionId: params.decisionId,
          assumptionId: params.assumptionId,
          severity: params.severity,
          throttleHours: throttleWindow
        });
        return; // Skip creating this notification
      }

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
        metadata: params.metadata || {},
        email_sent: false // Will be true after immediate send OR morning briefing
      });

      if (error) {
        logger.error('Failed to create notification', { error, params });
        throw error;
      }

      logger.info(`Notification created (in-app): ${params.type} - ${params.title}`);

      // Decide on email: immediate or queue for morning briefing
      const needsImmediateEmail = this.isCritical(params);

      if (needsImmediateEmail) {
        // Send email immediately for critical issues
        await EmailNotificationHandler.sendForNotification({
          type: params.type,
          severity: params.severity,
          title: params.title,
          message: params.message,
          decisionId: params.decisionId,
          assumptionId: params.assumptionId,
          metadata: params.metadata
        });

        // Mark as email sent
        if (params.decisionId) {
          await db.from('notifications')
            .update({ email_sent: true })
            .eq('decision_id', params.decisionId)
            .eq('type', params.type)
            .is('email_sent', false)
            .order('created_at', { ascending: false })
            .limit(1);
        }

        logger.info(`🚨 Critical notification - sent immediate email`, {
          type: params.type,
          decisionId: params.decisionId
        });
      } else {
        logger.info(`📬 Non-critical notification - queued for morning briefing`, {
          type: params.type,
          decisionId: params.decisionId
        });
      }
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
   * Only notifies on threshold crossings to reduce spam:
   * - CRITICAL: health < 40%
   * - WARNING: health 40-65%
   */
  static async checkDegradedHealth(): Promise<void> {
    try {
      const db = getAdminDatabase();

      // Only get decisions with significantly degraded health
      const { data: decisions, error } = await db
        .from('decisions')
        .select('id, title, health_signal, lifecycle')
        .lt('health_signal', 65)
        .neq('lifecycle', 'RETIRED');

      if (error) throw error;

      if (decisions) {
        for (const decision of decisions) {
          // Get most recent health notification for this decision
          const { data: recentNotifications } = await db
            .from('notifications')
            .select('metadata, created_at')
            .eq('type', 'HEALTH_DEGRADED')
            .eq('decision_id', decision.id)
            .eq('is_dismissed', false)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Determine if we should notify based on threshold crossing
          let shouldNotify = false;
          let severity: NotificationSeverity = 'WARNING';

          if (decision.health_signal < 40) {
            severity = 'CRITICAL';
            // Notify if no previous notification OR last was above 40%
            shouldNotify = !recentNotifications || 
                          (recentNotifications.metadata?.healthSignal >= 40);
          } else if (decision.health_signal < 65) {
            severity = 'WARNING';
            // Notify if no previous notification OR it's been 7+ days
            if (!recentNotifications) {
              shouldNotify = true;
            } else {
              const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
              shouldNotify = new Date(recentNotifications.created_at) < sevenDaysAgo;
            }
          }

          if (shouldNotify) {
            await this.create({
              type: 'HEALTH_DEGRADED',
              severity,
              title: `Decision Health ${severity === 'CRITICAL' ? 'Critical' : 'Degraded'}`,
              message: `"${decision.title}" has ${severity === 'CRITICAL' ? 'critically degraded to' : 'health of'} ${decision.health_signal}%`,
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
   * Only notifies once per decision when it crosses 30-day threshold
   * Avoids repeated notifications for the same stale decision
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
          const daysSinceReview = Math.floor(
            (Date.now() - new Date(decision.last_reviewed_at).getTime()) / (24 * 60 * 60 * 1000)
          );

          // Check if we already notified about this (look back 30 days)
          const thirtyDaysAgoCheck = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await db
            .from('notifications')
            .select('id')
            .eq('type', 'NEEDS_REVIEW')
            .eq('decision_id', decision.id)
            .eq('is_dismissed', false)
            .not('message', 'like', '%expiring%') // Exclude expiry notifications
            .gte('created_at', thirtyDaysAgoCheck)
            .maybeSingle();

          if (!existing) {
            await this.create({
              type: 'NEEDS_REVIEW',
              severity: daysSinceReview > 90 ? 'WARNING' : 'INFO',
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
   * Notifies at specific intervals: 30 days, 14 days, 7 days, 3 days, 1 day
   */
  static async checkExpiringDecisions(): Promise<void> {
    try {
      const db = getAdminDatabase();
      const now = new Date();

      // Get decisions expiring within 30 days
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
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
          const expiryDate = new Date(decision.expiry_date);
          const daysUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

          // Determine if we should notify based on expiry thresholds
          let shouldNotify = false;
          let severity: NotificationSeverity = 'INFO';

          // Get the most recent expiry notification
          const { data: recentNotification } = await db
            .from('notifications')
            .select('metadata, created_at')
            .eq('type', 'NEEDS_REVIEW')
            .eq('decision_id', decision.id)
            .eq('is_dismissed', false)
            .like('message', '%expiring%')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Notification thresholds and logic
          if (daysUntilExpiry <= 1) {
            severity = 'CRITICAL';
            shouldNotify = !recentNotification || recentNotification.metadata?.daysUntilExpiry > 1;
          } else if (daysUntilExpiry <= 3) {
            severity = 'CRITICAL';
            shouldNotify = !recentNotification || recentNotification.metadata?.daysUntilExpiry > 3;
          } else if (daysUntilExpiry <= 7) {
            severity = 'CRITICAL';
            shouldNotify = !recentNotification || recentNotification.metadata?.daysUntilExpiry > 7;
          } else if (daysUntilExpiry <= 14) {
            severity = 'WARNING';
            shouldNotify = !recentNotification || recentNotification.metadata?.daysUntilExpiry > 14;
          } else if (daysUntilExpiry <= 30) {
            severity = 'INFO';
            shouldNotify = !recentNotification || recentNotification.metadata?.daysUntilExpiry > 30;
          }

          if (shouldNotify) {
            const expiryDateFormatted = expiryDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });

            await this.create({
              type: 'NEEDS_REVIEW',
              severity,
              title: `Decision Expiring ${daysUntilExpiry <= 3 ? 'Urgently' : 'Soon'}`,
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
   * Check if a notification should be throttled
   * Returns true if a similar notification was created recently
   */
  private static async checkThrottle(params: CreateNotificationParams, throttleHours: number = 24): Promise<boolean> {
    const db = getAdminDatabase();
    const throttleDate = new Date(Date.now() - throttleHours * 60 * 60 * 1000).toISOString();

    let throttleQuery = db
      .from('notifications')
      .select('id')
      .eq('type', params.type) // Same notification type
      .gte('created_at', throttleDate)
      .eq('is_dismissed', false)
      .limit(1);

    // Add resource-specific filter
    if (params.decisionId) {
      throttleQuery = throttleQuery.eq('decision_id', params.decisionId);
    } else if (params.assumptionId) {
      throttleQuery = throttleQuery.eq('assumption_id', params.assumptionId);
    }

    const { data: existing } = await throttleQuery.maybeSingle();
    return !!existing;
  }

  /**
   * Determine if notification needs immediate email (vs. morning briefing)
   */
  private static isCritical(params: CreateNotificationParams): boolean {
    // Always send immediate email for CRITICAL severity
    if (params.severity === 'CRITICAL') {
      return true;
    }

    // Health critically degraded (< 40%)
    if (params.type === 'HEALTH_DEGRADED' && 
        params.metadata?.healthSignal !== undefined &&
        params.metadata.healthSignal < 40) {
      return true;
    }

    // Lifecycle invalidated
    if (params.type === 'LIFECYCLE_CHANGED' && 
        params.metadata?.newLifecycle === 'INVALIDATED') {
      return true;
    }

    // Expiring very soon (≤ 7 days)
    if (params.type === 'NEEDS_REVIEW' && 
        params.metadata?.daysUntilExpiry !== undefined &&
        params.metadata.daysUntilExpiry <= 7) {
      return true;
    }

    // Assumption broken with active decisions
    if (params.type === 'ASSUMPTION_BROKEN' && 
        params.metadata?.reason !== 'all_decisions_retired') {
      return true;
    }

    // Everything else queues for morning briefing
    return false;
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
