import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function checkConstraint() {
  console.log('🔍 Checking assumptions table constraints...\n');

  // Try to insert a test row with VALID status
  const testId = '00000000-0000-0000-0000-000000000001';
  
  console.log('Testing VALID status insert...');
  const { error: validError } = await db.from('assumptions').insert({
    id: testId,
    description: 'TEST: Check if VALID status is allowed',
    status: 'VALID',
    scope: 'DECISION_SPECIFIC'
  });

  if (validError) {
    console.log('❌ VALID not allowed:', validError.message);
  } else {
    console.log('✅ VALID is allowed');
    // Clean up
    await db.from('assumptions').delete().eq('id', testId);
  }

  console.log('\nTesting HOLDING status insert...');
  const { error: holdingError } = await db.from('assumptions').insert({
    id: testId,
    description: 'TEST: Check if HOLDING status is allowed',
    status: 'HOLDING',
    scope: 'DECISION_SPECIFIC'
  });

  if (holdingError) {
    console.log('❌ HOLDING not allowed:', holdingError.message);
  } else {
    console.log('✅ HOLDING is allowed');
    // Clean up
    await db.from('assumptions').delete().eq('id', testId);
  }
}

checkConstraint().catch(console.error);
