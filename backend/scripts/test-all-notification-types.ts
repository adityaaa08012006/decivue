/**
 * Test All Notification Types with Context
 * Run with: npx tsx scripts/test-all-notification-types.ts
 */

import dotenv from 'dotenv';
import { initializeDatabase, getAdminDatabase } from '../src/data/database';
import { NotificationService } from '../src/services/notification-service';

dotenv.config();

async function testAllNotificationTypes() {
  console.log('\n📧 Testing All Notification Types with Context\n');
  console.log('==============================================\n');

  initializeDatabase();
  const db = getAdminDatabase();

  // Get your decision
  const { data: decision } = await db
    .from('decisions')
    .select('id, title, organization_id')
    .eq('id', '532f88f7-e36c-45c4-b726-1a50651c6d22')
    .single();

  if (!decision) {
    console.log('Decision not found');
    process.exit(1);
  }

  console.log(`Testing with decision: "${decision.title}"\n`);

  // 1. NEEDS_REVIEW
  console.log('1️⃣ Creating NEEDS_REVIEW notification...');
  await NotificationService.create({
    type: 'NEEDS_REVIEW',
    severity: 'INFO',
    title: 'Decision Needs Review',
    message: `"${decision.title}" hasn't been reviewed in 45 days`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      lastReviewedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      daysSinceReview: 45
    }
  });
  console.log('   ✅ Sent\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. HEALTH_DEGRADED
  console.log('2️⃣ Creating HEALTH_DEGRADED notification...');
  await NotificationService.create({
    type: 'HEALTH_DEGRADED',
    severity: 'WARNING',
    title: 'Decision Health Degraded',
    message: `"${decision.title}" has degraded to 55% health`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      healthSignal: 55,
      lifecycle: 'STABLE'
    }
  });
  console.log('   ✅ Sent\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. LIFECYCLE_CHANGED
  console.log('3️⃣ Creating LIFECYCLE_CHANGED notification...');
  await NotificationService.create({
    type: 'LIFECYCLE_CHANGED',
    severity: 'WARNING',
    title: 'Decision Lifecycle Changed',
    message: `"${decision.title}" transitioned from STABLE to AT_RISK`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      oldLifecycle: 'STABLE',
      newLifecycle: 'AT_RISK'
    }
  });
  console.log('   ✅ Sent\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 4. ASSUMPTION_CONFLICT
  console.log('4️⃣ Creating ASSUMPTION_CONFLICT notification...');
  await NotificationService.create({
    type: 'ASSUMPTION_CONFLICT',
    severity: 'WARNING',
    title: 'Assumption Conflict Detected',
    message: `Assumption "Response time is critical" conflicts with "Low budget constraints"`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      assumptionDescription: 'Response time is critical',
      conflicts: ['Low budget constraints']
    }
  });
  console.log('   ✅ Sent\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 5. ASSUMPTION_BROKEN
  console.log('5️⃣ Creating ASSUMPTION_BROKEN notification...');
  await NotificationService.create({
    type: 'ASSUMPTION_BROKEN',
    severity: 'CRITICAL',
    title: 'Assumption Broken',
    message: `Assumption "Team has required expertise" was marked as broken for "${decision.title}"`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      assumptionDescription: 'Team has required expertise'
    }
  });
  console.log('   ✅ Sent\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // 6. Expiry Warning
  console.log('6️⃣ Creating EXPIRY WARNING notification...');
  const expiryDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
  await NotificationService.create({
    type: 'NEEDS_REVIEW',
    severity: 'CRITICAL',
    title: 'Decision Expiring Soon',
    message: `"${decision.title}" is expiring in 5 days on ${expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    decisionId: decision.id,
    organizationId: decision.organization_id,
    metadata: {
      decisionName: decision.title,
      expiryDate: expiryDate.toISOString(),
      daysUntilExpiry: 5
    }
  });
  console.log('   ✅ Sent\n');

  console.log('==============================================');
  console.log('📬 Check your email at: palashkurkute@gmail.com');
  console.log('\nYou should receive 6 emails showing:');
  console.log('  • Different severity levels (INFO, WARNING, CRITICAL)');
  console.log('  • Color-coded visual indicators');
  console.log('  • Rich context with decision names');
  console.log('  • Type-specific icons and messages');
  console.log('  • Clickable links to relevant decisions\n');

  process.exit(0);
}

testAllNotificationTypes().catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
