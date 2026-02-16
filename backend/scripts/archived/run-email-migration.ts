/**
 * Run Email Preferences Migration
 * Adds email_notifications column to users table
 * Run with: npx tsx scripts/run-email-migration.ts
 */

import dotenv from 'dotenv';
import { initializeDatabase, getAdminDatabase } from '../src/data/database';

dotenv.config();

async function runMigration() {
  console.log('\n📦 Running Email Preferences Migration\n');
  console.log('======================================\n');

  initializeDatabase();
  const db = getAdminDatabase();

  try {
    // Check current state
    console.log('1. Checking if migration is needed...');
    const { data: testUser, error: checkError } = await db
      .from('users')
      .select('email_notifications')
      .limit(1)
      .maybeSingle();

    if (!checkError) {
      console.log('✅ Column email_notifications already exists!');
      console.log('   Migration may have already been run.');

      // Update existing users just in case
      console.log('\n2. Ensuring all users have default preferences...');
      const { error: updateError } = await db
        .from('users')
        .update({
          email_notifications: {
            assumption_conflict: true,
            decision_conflict: true,
            health_degraded: true,
            lifecycle_changed: true,
            needs_review: true,
            assumption_broken: true,
            dependency_broken: true
          }
        })
        .is('email_notifications', null);

      if (updateError) {
        console.log('⚠️  Could not update users:', updateError.message);
      } else {
        console.log('✅ Updated users with missing preferences');
      }

      process.exit(0);
    }

    console.log('⚠️  Column does not exist - manual migration needed\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('(Dashboard > SQL Editor > New Query)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`
-- Add email_notifications column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
    "assumption_conflict": true,
    "decision_conflict": true,
    "health_degraded": true,
    "lifecycle_changed": true,
    "needs_review": true,
    "assumption_broken": true,
    "dependency_broken": true
  }'::JSONB;

-- Update existing users
UPDATE users
SET email_notifications = '{
  "assumption_conflict": true,
  "decision_conflict": true,
  "health_degraded": true,
  "lifecycle_changed": true,
  "needs_review": true,
  "assumption_broken": true,
  "dependency_broken": true
}'::JSONB
WHERE email_notifications IS NULL;
`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('After running the SQL, test again with:');
    console.log('npx tsx scripts/test-email-notifications.ts\n');

    process.exit(1);
  } catch (error: any) {
    console.error('\n❌ Migration check failed:', error.message);
    process.exit(1);
  }
}

runMigration();
