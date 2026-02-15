/**
 * Debug Email Sending
 * Run with: npx tsx scripts/debug-email-sending.ts
 */

import dotenv from 'dotenv';
import { initializeDatabase, getAdminDatabase } from '../src/data/database';
import { NotificationService } from '../src/services/notification-service';
import resolveRecipients from '../src/services/recipient-resolver';
import { logger } from '../src/utils/logger';

dotenv.config();

async function debugEmailSending() {
  console.log('\n🔍 Debugging Email Sending\n');
  console.log('============================\n');

  initializeDatabase();
  const db = getAdminDatabase();

  // Get a decision
  const { data: decisions } = await db
    .from('decisions')
    .select('id, title, created_by, organization_id')
    .limit(1);

  if (!decisions || decisions.length === 0) {
    console.log('❌ No decisions found');
    process.exit(1);
  }

  const decision = decisions[0];
  console.log('📋 Testing with decision:');
  console.log(`   Title: ${decision.title}`);
  console.log(`   ID: ${decision.id}`);
  console.log(`   Owner ID: ${decision.created_by}`);
  console.log(`   Org ID: ${decision.organization_id}`);

  // Manually resolve recipients
  console.log('\n👥 Resolving recipients...');
  const recipients = await resolveRecipients(decision.id);

  if (recipients.length === 0) {
    console.log('❌ No recipients found!');
    console.log('   This means:');
    console.log('   - Decision has no created_by user');
    console.log('   - OR that user doesn\'t exist in users table');
    console.log('   - OR RLS policies are blocking access');

    // Check if the owner exists
    if (decision.created_by) {
      console.log('\n🔍 Checking if owner exists in users table...');
      const { data: owner, error } = await db
        .from('users')
        .select('id, email, full_name, organization_id, email_notifications')
        .eq('id', decision.created_by)
        .single();

      if (error) {
        console.log(`   ❌ Error fetching owner: ${error.message}`);
      } else if (owner) {
        console.log('   ✅ Owner found:');
        console.log(`      Name: ${owner.full_name}`);
        console.log(`      Email: ${owner.email}`);
        console.log(`      Org: ${owner.organization_id}`);
        console.log(`      Email notifications:`, owner.email_notifications);
      } else {
        console.log('   ❌ Owner not found in users table');
      }
    }
  } else {
    console.log(`✅ Found ${recipients.length} recipient(s):`);
    recipients.forEach((r: any) => {
      console.log(`   - User ID: ${r.id}`);
      console.log(`     Email: ${r.email}`);
      console.log(`     Preferences:`, r.email_notifications);
    });
  }

  // Create a test notification and watch what happens
  console.log('\n📧 Creating test notification...');
  console.log('   (Watch server console for email sending logs)\n');

  await NotificationService.create({
    type: 'NEEDS_REVIEW',
    severity: 'INFO',
    title: 'DEBUG: Test Email Notification',
    message: 'This is a debug test to verify email delivery.',
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      debug: true,
      timestamp: new Date().toISOString()
    }
  });

  console.log('\n✅ Notification created!');
  console.log('   Check your email inbox for: ' + recipients.map((r: any) => r.email).join(', '));
  console.log('   Also check backend server logs for email sending attempts\n');

  process.exit(0);
}

debugEmailSending().catch((error) => {
  console.error('\n❌ Debug failed:', error);
  process.exit(1);
});
