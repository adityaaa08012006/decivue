/**
 * Migration Runner
 * Runs all SQL migration files in order
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
  },
});

async function runMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');

  // Get all .sql files in migrations directory
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Sort alphabetically to run in order

  console.log(`📁 Found ${migrationFiles.length} migration files\n`);

  for (const file of migrationFiles) {
    console.log(`⏳ Running migration: ${file}`);

    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf-8');

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).single();

      if (error) {
        // If exec_sql RPC doesn't exist, try direct query
        const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);

        if (queryError) {
          // Table doesn't exist, we need to execute raw SQL
          // This requires using the SQL editor manually or Supabase CLI
          console.warn(`⚠️  Cannot run migration automatically. Please run this migration manually via Supabase Dashboard SQL Editor:`);
          console.warn(`   File: ${file}\n`);
          continue;
        }

        throw error;
      }

      console.log(`✅ Successfully ran: ${file}\n`);
    } catch (err: any) {
      console.error(`❌ Error running ${file}:`, err.message);
      console.error(`   Please run this migration manually via Supabase Dashboard.\n`);
    }
  }

  console.log('🎉 Migration process complete!');
  console.log('\nNote: If any migrations failed, please run them manually via:');
  console.log('1. Supabase Dashboard > SQL Editor');
  console.log('2. Copy/paste the SQL from backend/migrations/');
  console.log('3. Run each migration in order (001, 002, 003, etc.)\n');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
