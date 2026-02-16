import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

async function runMigration() {
  console.log('🔄 Running migration: 013_fix_assumption_conflicts_rls.sql\n');

  const migrationPath = path.join(__dirname, '../migrations/013_fix_assumption_conflicts_rls.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('Migration SQL:');
  console.log('─'.repeat(80));
  console.log(sql);
  console.log('─'.repeat(80));
  console.log('\n📋 Please copy the above SQL and run it manually in:');
  console.log('   Supabase Dashboard > SQL Editor > New Query\n');
  console.log('Or if you have psql access, run:');
  console.log('   psql <connection_string> -f backend/migrations/013_fix_assumption_conflicts_rls.sql\n');
}

runMigration().catch(console.error);
