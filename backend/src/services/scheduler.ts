/**
 * Notification Scheduler Service
 * Runs periodic notification checks using cron jobs
 */

import cron from 'node-cron';
import { NotificationService } from './notification-service';
import { MorningBriefingService } from './morning-briefing-service';
import { logger } from '@utils/logger';

export class NotificationScheduler {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Start the notification scheduler
   */
  start(): void {
    // Get cron schedule from environment or use default (every 6 hours)
    const checkSchedule = process.env.NOTIFICATION_CHECK_CRON || '0 */6 * * *';
    // Morning briefing schedule (default 8 AM UTC)
    const briefingSchedule = process.env.MORNING_BRIEFING_CRON || '0 8 * * *';

    // Validate cron expression
    if (!cron.validate(checkSchedule)) {
      logger.error('Invalid NOTIFICATION_CHECK_CRON expression', { checkSchedule });
    }

    // 1. Schedule the regular notification checks
    const checkTask = cron.schedule(
      checkSchedule,
      async () => {
        try {
          logger.info('Running scheduled notification checks');
          await NotificationService.runAllChecks();
          logger.info('Scheduled notification checks completed');
        } catch (error: any) {
          logger.error('Error running scheduled notification checks', {
            error: error?.message || error
          });
        }
      },
      { scheduled: true, timezone: 'UTC' }
    );
    this.tasks.push(checkTask);

    // 2. Schedule the morning briefing
    const briefingTask = cron.schedule(
      briefingSchedule,
      async () => {
        try {
          logger.info('Running morning briefing task');
          await MorningBriefingService.sendBriefings();
          logger.info('Morning briefing task completed');
        } catch (error: any) {
          logger.error('Error running morning briefing', {
            error: error?.message || error
          });
        }
      },
      { scheduled: true, timezone: 'UTC' }
    );
    this.tasks.push(briefingTask);

    logger.info('Notification scheduler started', {
      checkSchedule,
      briefingSchedule,
      timezone: 'UTC'
    });
  }

  /**
   * Stop the notification scheduler
   */
  stop(): void {
    this.tasks.forEach((task) => task.stop());
    logger.info('Notification scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): { running: boolean; taskCount: number } {
    return {
      running: this.tasks.length > 0,
      taskCount: this.tasks.length
    };
  }
}

export default NotificationScheduler;
