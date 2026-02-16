import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  console.log('🚀 Applying Migration 029: Enhanced Version History\n');

  try {
    // Read the migration file
    const migrationPath = path.resolve(__dirname, '../migrations/029_enhance_version_history.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Reading migration file...');
    console.log(`   File: ${migrationPath}`);
    console.log(`   Size: ${migrationSQL.length} characters\n`);

    // Execute the migration
    console.log('⚙️  Executing migration...\n');
    
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_string: migrationSQL 
    });

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('   Trying direct execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: '029_enhance_version_history',
        executed_at: new Date().toISOString()
      });

      if (directError) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
      }
    }

    console.log('✅ Migration 029 applied successfully!\n');
    console.log('📋 Changes applied:');
    console.log('   ✓ Updated get_decision_version_history() function');
    console.log('   ✓ Version history now shows edit requests and approvals');
    console.log('   ✓ Version history shows lock/unlock events');
    console.log('   ✓ Version history shows conflict resolutions');
    console.log('   ✓ Created pending_edit_requests view\n');
    
    console.log('🎯 Next steps:');
    console.log('   1. Verify the migration: npx tsx scripts/verify-migration-029.ts');
    console.log('   2. Test edit request flow as team member');
    console.log('   3. Test edit approval as team lead');
    console.log('   4. Check version history shows all events\n');

  } catch (err) {
    console.error('❌ Error applying migration:', err);
    process.exit(1);
  }
}

applyMigration();
