/**
 * COMPLETE DATABASE WIPE SCRIPT
 *
 * This script clears ALL data from Supabase:
 * 1. All database table records (in correct foreign key order)
 * 2. All Supabase Auth users
 *
 * WARNING: This is IRREVERSIBLE. All data will be permanently deleted.
 *
 * Usage: npm run clear-db
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function clearDatabase() {
  console.log('🗑️  Starting database wipe...\n');

  try {
    // Step 1: Delete all database records in correct order
    console.log('📊 Clearing database tables...');

    const tables = [
      'constraint_violations',
      'assumption_conflicts',
      'decision_tensions',
      'dependencies',
      'decision_assumptions',
      'decision_constraints',
      'decision_signals',
      'notifications',
      'evaluation_history',
      'decisions',
      'assumptions',
      'constraints',
      'parameter_templates',
      'organization_profiles',
      'users',
      'organizations'
    ];

    for (const table of tables) {
      const { error, count } = await adminClient
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (using impossible condition)

      if (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      } else {
        console.log(`   ✓ ${table}: cleared`);
      }
    }

    console.log('\n✅ All database tables cleared');

    // Step 2: Delete all Supabase Auth users
    console.log('\n👥 Clearing Supabase Auth users...');

    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      console.error('❌ Failed to list users:', listError.message);
    } else if (users && users.users.length > 0) {
      console.log(`   Found ${users.users.length} auth users to delete`);

      for (const user of users.users) {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.log(`   ⚠️  Failed to delete user ${user.email}: ${deleteError.message}`);
        } else {
          console.log(`   ✓ Deleted: ${user.email}`);
        }
      }

      console.log('\n✅ All auth users deleted');
    } else {
      console.log('   No auth users found');
    }

    // Step 3: Verification - count rows in all tables
    console.log('\n🔍 Verifying deletion...');

    let totalRows = 0;
    for (const table of tables) {
      const { count, error } = await adminClient
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (!error) {
        totalRows += count || 0;
        if (count && count > 0) {
          console.log(`   ⚠️  ${table}: ${count} rows remaining`);
        }
      }
    }

    if (totalRows === 0) {
      console.log('   ✓ All tables are empty');
      console.log('\n🎉 Database completely cleared!\n');
    } else {
      console.log(`\n⚠️  ${totalRows} rows still remain across tables\n`);
    }

  } catch (error) {
    console.error('\n❌ Error during database wipe:', error);
    process.exit(1);
  }
}

// Run the script
clearDatabase()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
