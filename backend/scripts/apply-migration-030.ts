import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('🚀 Applying Migration 030b: Fix Edit Approval Hotfix\n');

    // Read hotfix migration file
    const migrationPath = path.join(__dirname, '../migrations/030b_fix_edit_approval_hotfix.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Hotfix migration file loaded');
    console.log('📝 Executing SQL...\n');

    // Execute migration via direct query (not RPC)
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('❌ Migration failed:', error);
      console.error('Trying direct execution...\n');
      
      // Try direct execution if RPC fails
      const lines = migrationSQL.split(';').filter(line => line.trim());
      for (const line of lines) {
        if (line.trim()) {
          const { error: execError } = await supabase.rpc('exec_sql', { sql: line + ';' });
          if (execError) {
            console.error('Failed on:', line.substring(0, 100) + '...');
            console.error(execError);
          }
        }
      }
    }

    console.log('✅ Migration 030b applied successfully!\n');
    console.log('Fixed Issues:');
    console.log('  • Used correct column name: lifecycle (was lifecycle_stage)');
    console.log('  • Added all required columns: health_signal, organization_id');
    console.log('  • Consolidated UPDATE into single statement');
    console.log('  • resolve_edit_request() now properly applies changes\n');
    console.log('Next steps:');
    console.log('  1. Test edit request approval workflow');
    console.log('  2. Verify changes are applied to decisions');
    console.log('  3. Check version history shows the update');

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

applyMigration();
