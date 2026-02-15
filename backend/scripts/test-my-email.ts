/**
 * Send test email to palashkurkute@gmail.com
 * Run with: npx tsx scripts/test-my-email.ts
 */

import dotenv from 'dotenv';
import { initializeDatabase } from '../src/data/database';
import { NotificationService } from '../src/services/notification-service';

dotenv.config();

async function sendTestToMyEmail() {
  console.log('\n📧 Sending test email to palashkurkute@gmail.com\n');

  initializeDatabase();

  await NotificationService.create({
    type: 'NEEDS_REVIEW',
    severity: 'INFO',
    title: '📧 Email System Test - SUCCESS!',
    message: 'Congratulations! If you are reading this email, the notification system is working correctly. Email notifications are now enabled for all notification types.',
    decisionId: '532f88f7-e36c-45c4-b726-1a50651c6d22',
    organizationId: '43bc4312-2f0e-4abd-a877-73a933096216',
    metadata: {
      test: true,
      timestamp: new Date().toISOString()
    }
  });

  console.log('✅ Test notification created!');
  console.log('📧 Email sent to: palashkurkute@gmail.com');
  console.log('\nCheck your inbox (and spam folder) for the test email!\n');

  process.exit(0);
}

sendTestToMyEmail().catch((error) => {
  console.error('\n❌ Failed to send test email:', error);
  process.exit(1);
});
