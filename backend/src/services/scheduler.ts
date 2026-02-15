/**
 * Notification Scheduler Service
 * Runs periodic notification checks using cron jobs
 */

import cron from 'node-cron';
import { NotificationService } from './notification-service';
import { logger } from '@utils/logger';

export class NotificationScheduler {
  private tasks: cron.ScheduledTask[] = [];

  /**
   * Start the notification scheduler
   */
  start(): void {
    // Get cron schedule from environment or use default (every 15 minutes)
    const cronSchedule = process.env.NOTIFICATION_CHECK_CRON || '*/15 * * * *';

    // Validate cron expression
    if (!cron.validate(cronSchedule)) {
      logger.error('Invalid NOTIFICATION_CHECK_CRON expression', { cronSchedule });
      logger.info('Using default schedule: */15 * * * * (every 15 minutes)');
    }

    // Schedule the notification checks
    const task = cron.schedule(
      cronSchedule,
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
      {
        scheduled: true,
        timezone: 'UTC' // Use UTC for consistency
      }
    );

    this.tasks.push(task);
    logger.info('Notification scheduler started', {
      schedule: cronSchedule,
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
