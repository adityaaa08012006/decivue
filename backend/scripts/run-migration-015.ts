/**
 * Run Migration 015: Fix All Tables RLS Configuration
 * 
 * This script helps you run the migration that adds organization_id
 * to all junction tables and updates their RLS policies.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('🔄 Running migration: 015_fix_all_tables_rls.sql\n');

  const migrationPath = path.join(__dirname, '../migrations/015_fix_all_tables_rls.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📋 MIGRATION 015: Fix All Tables RLS Configuration');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('This migration will:');
  console.log('  ✅ Add organization_id to dependencies table');
  console.log('  ✅ Add organization_id to decision_assumptions table');
  console.log('  ✅ Add organization_id to decision_constraints table');
  console.log('  ✅ Add organization_id to constraint_violations table');
  console.log('  ✅ Update organization_id on decision_tensions table');
  console.log('  ✅ Update organization_id on decision_signals table');
  console.log('  ✅ Update organization_id on evaluation_history table');
  console.log('  ✅ Update all RLS policies to use organization_id directly');
  console.log('  ✅ Add performance indexes\n');

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📝 TO RUN THIS MIGRATION:');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Click "New Query"');
  console.log('3. Copy and paste the SQL below:');
  console.log('4. Click "Run"\n');

  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));

  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('✅ After running the migration, verify it worked by running:');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('npm run verify-rls');
  console.log('\n');
}

runMigration()
  .then(() => {
    console.log('✅ Migration instructions displayed successfully!\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
