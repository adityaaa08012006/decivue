/**
 * RLS Verification and Fix Script
 *
 * This script checks if Row-Level Security is enabled on tables
 * and looks for orphaned data without organization_id
 *
 * Run this with: npx ts-node scripts/verify-and-fix-rls.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables');
  process.exit(1);
}

// Create admin client (bypasses RLS for diagnostic purposes)
const db = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAndFixRLS() {
  console.log('🔍 RLS Verification and Fix Script');
  console.log('═══════════════════════════════════\n');

  // Step 1: Check if RLS is enabled on all tables
  console.log('📋 Step 1: Checking if RLS is enabled on critical tables...\n');

  const tablesToCheck = [
    'decisions',
    'assumptions',
    'constraints',
    'dependencies',
    'notifications',
    'evaluation_history',
    'decision_assumptions',
    'decision_constraints',
    'assumption_conflicts',
    'constraint_violations',
    'parameter_templates'
  ];

  const disabledTables: string[] = [];

  try {
    // Query pg_tables to check RLS status
    const { data: tables, error: tablesError } = await db
      .from('pg_tables')
      .select('tablename, rowsecurity')
      .eq('schemaname', 'public')
      .in('tablename', tablesToCheck);

    if (tablesError) {
      console.error('❌ Error checking RLS status:', tablesError.message);
      // Try alternative query
      console.log('\n💡 Trying direct SQL query...\n');

      for (const table of tablesToCheck) {
        const { data, error } = await db.rpc('exec_sql', {
          query: `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}' AND relnamespace = 'public'::regnamespace;`
        });

        if (error) {
          console.error(`❌ Cannot check ${table}:`, error.message);
        } else {
          console.log(`   ${table}: RLS ${data?.[0]?.relrowsecurity ? 'ENABLED ✅' : 'DISABLED ❌'}`);
        }
      }
    } else {

      console.log('Table Statuses:');
      for (const table of tablesToCheck) {
        const tableData = tables?.find(t => t.tablename === table);
        const isEnabled = tableData?.rowsecurity === true;

        console.log(`   ${table.padEnd(30)} ${isEnabled ? 'ENABLED ✅' : 'DISABLED ❌'}`);

        if (!isEnabled) {
          disabledTables.push(table);
        }
      }

      if (disabledTables.length > 0) {
        console.log('\n⚠️  WARNING: RLS is DISABLED on these tables:', disabledTables.join(', '));
        console.log('💡 To enable RLS, run these SQL commands in your Supabase SQL editor:\n');

        for (const table of disabledTables) {
          console.log(`   ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
        }

        console.log('\n📌 Note: This script cannot auto-enable RLS. Please enable manually.');
      } else {
        console.log('\n✅ All tables have RLS enabled!');
      }
    }
  } catch (err: any) {
    console.error('❌ Error in Step 1:', err.message);
  }

  // Step 2: Check for orphaned data
  console.log('\n\n📋 Step 2: Checking for orphaned data (NULL organization_id)...\n');

  const dataChecks = [
    { table: 'decisions', columns: 'id, title, created_at' },
    { table: 'assumptions', columns: 'id, description, created_at' },
    { table: 'constraints', columns: 'id, name, created_at' },
    { table: 'dependencies', columns: 'id, created_at' },
    { table: 'notifications', columns: 'id, type, created_at' },
  ];

  const orphanedData: Array<{ table: string; count: number; data: any[] }> = [];

  for (const check of dataChecks) {
    try {
      const { data, error, count } = await db
        .from(check.table)
        .select(check.columns, { count: 'exact' })
        .is('organization_id', null);

      if (error) {
        console.error(`❌ Error checking ${check.table}:`, error.message);
      } else {
        const recordCount = count || data?.length || 0;
        console.log(`   ${check.table.padEnd(25)} ${recordCount === 0 ? '✅ Clean' : `❌ ${recordCount} orphaned records`}`);

        if (recordCount > 0) {
          orphanedData.push({ table: check.table, count: recordCount, data: data || [] });
        }
      }
    } catch (err: any) {
      console.error(`❌ Error checking ${check.table}:`, err.message);
    }
  }

  if (orphanedData.length > 0) {
    console.log('\n⚠️  WARNING: Found orphaned data without organization_id:');

    for (const orphan of orphanedData) {
      console.log(`\n   Table: ${orphan.table} (${orphan.count} records)`);

      // Show first 3 records as examples
      const samplesToShow = orphan.data.slice(0, 3);
      for (const record of samplesToShow) {
        const displayValue = record.title || record.description || record.name || record.id;
        console.log(`      - ${displayValue}`);
      }

      if (orphan.count > 3) {
        console.log(`      ... and ${orphan.count - 3} more`);
      }
    }

    console.log('\n💡 To delete orphaned data, run these SQL commands:');
    for (const orphan of orphanedData) {
      console.log(`   DELETE FROM ${orphan.table} WHERE organization_id IS NULL;`);
    }

    console.log('\n📌 Note: This will permanently delete orphaned records. Backup your data first!');
  } else {
    console.log('\n✅ No orphaned data found! All records have organization_id.');
  }

  // Step 3: Recommendations
  console.log('\n\n📋 Step 3: Recommendations\n');

  if (disabledTables.length > 0 || orphanedData.length > 0) {
    console.log('🔧 Action Required:');

    if (disabledTables.length > 0) {
      console.log('   1️⃣  Enable RLS on tables listed above');
    }

    if (orphanedData.length > 0) {
      console.log('   2️⃣  Delete or assign orphaned data');
      console.log('   3️⃣  Add NOT NULL constraints to prevent future orphaned data');
    }

    console.log('\n📄 See migration 008_enforce_organization_id.sql for automated fixes');
  } else {
    console.log('✅ Your database appears to be correctly configured!');
    console.log('   - RLS is enabled on all tables');
    console.log('   - No orphaned data found');
    console.log('\n💡 If you\'re still seeing cross-organization data leakage, check:');
    console.log('   - Backend routes are using getAuthenticatedDatabase()');
    console.log('   - Frontend is sending proper Authorization headers');
    console.log('   - user_organization_id() function returns correct value');
  }

  console.log('\n═══════════════════════════════════');
  console.log('✅ Diagnostic complete!\n');
}

// Run the verification
verifyAndFixRLS()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
