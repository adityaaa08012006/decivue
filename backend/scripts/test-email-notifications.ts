/**
 * Test Email Notifications
 * Run with: npx tsx scripts/test-email-notifications.ts
 */

import dotenv from 'dotenv';
import { initializeDatabase, getAdminDatabase } from '../src/data/database';
import { NotificationService } from '../src/services/notification-service';
import { logger } from '../src/utils/logger';

dotenv.config();

async function testEmailNotifications() {
  console.log('\n🧪 Testing Email Notifications System\n');
  console.log('=====================================\n');

  // Initialize database
  initializeDatabase();
  const db = getAdminDatabase();

  // 1. Check if email_notifications column exists
  console.log('1. Checking users table schema...');
  const { data: users, error: usersError } = await db
    .from('users')
    .select('id, email, email_notifications')
    .limit(1);

  if (usersError) {
    console.error('❌ Error querying users:', usersError.message);
    process.exit(1);
  }

  if (users && users.length > 0) {
    console.log('✅ Users table accessible');
    console.log(`   Sample user:`, {
      id: users[0].id,
      email: users[0].email,
      has_email_notifications: !!users[0].email_notifications
    });

    if (!users[0].email_notifications) {
      console.log('⚠️  email_notifications column is NULL - migration may not have run');
    }
  }

  //2. Check if notifications table exists
  console.log('\n2. Checking notifications table...');
  const { data: notifications, error: notifError } = await db
    .from('notifications')
    .select('*')
    .limit(5)
    .order('created_at', { ascending: false });

  if (notifError) {
    console.error('❌ Error querying notifications:', notifError.message);
  } else {
    console.log(`✅ Notifications table accessible`);
    console.log(`   Found ${notifications?.length || 0} recent notifications`);
    if (notifications && notifications.length > 0) {
      console.log(`   Latest:`, {
        type: notifications[0].type,
        title: notifications[0].title,
        created_at: notifications[0].created_at
      });
    }
  }

  // 3. Get all users with their emails
  console.log('\n3. Fetching all users...');
  const { data: allUsers } = await db
    .from('users')
    .select('id, email, full_name, organization_id');

  if (allUsers && allUsers.length > 0) {
    console.log(`✅ Found ${allUsers.length} users:`);
    allUsers.forEach((u: any) => {
      console.log(`   - ${u.full_name} (${u.email}) - Org: ${u.organization_id}`);
    });
  }

  // 4. Get a test decision
  console.log('\n4. Finding a decision to test with...');
  const { data: decisions } = await db
    .from('decisions')
    .select('id, title, created_by, organization_id')
    .limit(1);

  if (!decisions || decisions.length === 0) {
    console.log('⚠️  No decisions found - create a decision first');
    process.exit(0);
  }

  const testDecision = decisions[0];
  console.log(`✅ Found decision: "${testDecision.title}" (${testDecision.id})`);
  console.log(`   Owner: ${testDecision.created_by}`);
  console.log(`   Org: ${testDecision.organization_id}`);

  // 5. Test notification creation
  console.log('\n5. Creating test notification...');
  try {
    await NotificationService.create({
      type: 'NEEDS_REVIEW',
      severity: 'INFO',
      title: 'Test Notification - Email System Check',
      message: 'This is a test notification to verify email delivery is working.',
      decisionId: testDecision.id,
      organizationId: testDecision.organization_id,
      metadata: {
        test: true,
        timestamp: new Date().toISOString()
      }
    });

    console.log('✅ Notification created successfully');
    console.log('   Check your email and server logs for email delivery status');
  } catch (error: any) {
    console.error('❌ Failed to create notification:', error.message);
  }

  // 6. Check environment variables
  console.log('\n6. Checking email configuration...');
  const config = {
    RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ Set' : '❌ Missing',
    EMAIL_FROM: process.env.EMAIL_FROM || '❌ Missing',
    FRONTEND_URL: process.env.FRONTEND_URL || '❌ Missing',
    EMAIL_NOTIFICATIONS_ENABLED: process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'false' ? '✅ Enabled' : '❌ Disabled',
    NOTIFICATION_CHECK_CRON: process.env.NOTIFICATION_CHECK_CRON || '*/15 * * * * (default)'
  };

  console.log('Email Configuration:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  console.log('\n✅ Test complete! Check the logs above for any issues.\n');
  process.exit(0);
}

testEmailNotifications().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
