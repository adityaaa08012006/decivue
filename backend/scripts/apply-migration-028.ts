import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📝 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'migrations', '028_add_governance_to_version_history.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration 028...');
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // Try direct execution if RPC doesn't exist
      console.log('⚠️  exec_sql RPC not available, trying direct execution...');
      
      // Split by statement and execute one by one
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: stmtError } = await supabase.rpc('exec', { query: statement });
          if (stmtError) {
            console.error('❌ Error executing statement:', stmtError.message);
            throw stmtError;
          }
        }
      }
    }

    console.log('✅ Migration 028 applied successfully!');
    console.log('');
    console.log('📋 What changed:');
    console.log('  • Updated get_decision_version_history() function');
    console.log('  • Lock/unlock events now appear in version history');
    console.log('  • Governance events merged with decision versions');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║   Migration 028: Governance Version History   ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

applyMigration();
