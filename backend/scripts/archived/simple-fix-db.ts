import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function simpleFixDatabase() {
  console.log('🔧 Simple database fix...\n');

  // Step 1: Update all existing assumptions to use VALID instead of whatever they have
  console.log('1️⃣ Checking existing assumptions...');
  const { data: assumptions, error: fetchError } = await db
    .from('assumptions')
    .select('id, description, status');

  if (fetchError) {
    console.error('Error fetching assumptions:', fetchError);
    return;
  }

  console.log(`   Found ${assumptions?.length || 0} assumptions`);
  
  if (assumptions && assumptions.length > 0) {
    console.log('\n2️⃣ Current statuses:');
    const statusCounts = assumptions.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }

  console.log('\n✅ Ready for migration!');
  console.log('\n📋 Next steps:');
  console.log('   1. Go to Supabase Dashboard → SQL Editor');
  console.log('   2. Run this SQL:');
  console.log('');
  console.log('─'.repeat(70));
  console.log(`
-- Drop the constraint (don't worry about errors)
ALTER TABLE assumptions DROP CONSTRAINT IF EXISTS assumptions_status_check;

-- Add new constraint allowing VALID
ALTER TABLE assumptions
ADD CONSTRAINT assumptions_status_check
CHECK (status IN ('VALID', 'SHAKY', 'BROKEN'));

-- Update all assumptions to VALID (except BROKEN ones)
UPDATE assumptions
SET status = 'VALID'
WHERE status NOT IN ('BROKEN', 'SHAKY');
  `.trim());
  console.log('─'.repeat(70));
}

simpleFixDatabase().catch(console.error);
