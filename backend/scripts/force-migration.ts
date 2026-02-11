import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrationDirectly() {
  console.log('🔄 Running migration with service role key...\n');

  const sql = `
-- Step 1: Drop the old constraint
ALTER TABLE assumptions
DROP CONSTRAINT IF EXISTS assumptions_status_check;

-- Step 2: Add new constraint with VALID instead of HOLDING
ALTER TABLE assumptions
ADD CONSTRAINT assumptions_status_check
CHECK (status IN ('VALID', 'SHAKY', 'BROKEN'));

-- Step 3: Update all existing HOLDING statuses to VALID
UPDATE assumptions
SET status = 'VALID'
WHERE status = 'HOLDING';
`.trim();

  try {
    // Try using the REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (response.ok) {
      console.log('✅ Migration executed successfully!');
    } else {
      const error = await response.text();
      console.error('❌ Migration failed:', error);
      console.log('\n⚠️  Please run the SQL manually in Supabase Dashboard.');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    console.log('\n📋 Please copy and run this SQL in Supabase Dashboard > SQL Editor:\n');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  }
}

runMigrationDirectly().catch(console.error);
