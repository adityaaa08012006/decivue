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
    console.log('🚀 Applying Migration 034: Fix Edit Approval change_type\n');
    console.log('📌 Issue: resolve_edit_request was using "edited" instead of "edit_approved"');
    console.log('📌 This caused check constraint violations in decision_versions table\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/034_fix_edit_approval_change_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded');
    console.log('📝 Updating resolve_edit_request function...\n');

    // Split into statements and execute each
    const statements = migrationSQL
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          console.error('❌ Failed to execute statement:', error);
          console.error('Statement was:', statement.substring(0, 100) + '...');
          throw error;
        }
      }
    }

    console.log('✅ Migration 034 applied successfully!');
    console.log('✅ resolve_edit_request now uses "edit_approved" change_type');
    console.log('✅ Governance edit approvals should work now\n');

    // Verify the function was updated
    console.log('🔍 Verifying function update...');
    const { data: funcData, error: funcError } = await supabase.rpc('exec_sql', {
      sql: `SELECT prosrc FROM pg_proc WHERE proname = 'resolve_edit_request' LIMIT 1;`
    });

    if (funcError) {
      console.warn('⚠️  Could not verify function update:', funcError);
    } else if (funcData) {
      const funcSource = JSON.stringify(funcData);
      if (funcSource.includes('edit_approved')) {
        console.log('✅ Function verified: contains "edit_approved"');
      } else {
        console.warn('⚠️  Function may not have updated correctly');
      }
    }

    console.log('\n🎉 Migration complete! You can now approve edit requests.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Tip: You can manually apply the migration by:');
    console.error('   1. Opening Supabase SQL Editor');
    console.error('   2. Running the contents of migrations/034_fix_edit_approval_change_type.sql');
    process.exit(1);
  }
}

applyMigration();
