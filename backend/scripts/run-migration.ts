import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running migration: 003_holding_to_valid.sql\n');

  const migrationPath = path.join(__dirname, '../migrations/003_holding_to_valid.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split into individual statements (skip comments and empty lines)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.length > 0) {
      console.log(`Executing: ${statement.substring(0, 60)}...`);
      const { error } = await db.rpc('exec_sql', { sql_string: statement });
      
      if (error) {
        console.error('❌ Error:', error);
        
        // If RPC doesn't exist, we need to use direct SQL execution
        // Unfortunately Supabase client doesn't support raw SQL well
        console.log('\n⚠️  Could not execute via RPC.');
        console.log('\n📋 Please run this SQL manually in Supabase Dashboard > SQL Editor:\n');
        console.log('─'.repeat(60));
        console.log(sql);
        console.log('─'.repeat(60));
        return;
      }
    }
  }

  console.log('\n✅ Migration completed successfully!\n');
}

runMigration().catch(console.error);
