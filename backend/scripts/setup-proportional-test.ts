/**
 * Test proportional health calculation
 * - Reset CFO (universal) to HOLDING
 * - Break one decision-specific assumption to test proportional penalty
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function setupProportionalTest() {
  console.log('🧪 Setting up proportional health test...\n');

  try {
    // 1. Reset CFO assumption to HOLDING (so universal assumptions don't fail)
    console.log('1️⃣ Resetting CFO universal assumption to HOLDING...');
    const { error: cfoError } = await db
      .from('assumptions')
      .update({ status: 'HOLDING' })
      .eq('id', '33333333-cccc-cccc-cccc-cccccccccccc');

    if (cfoError) {
      console.error('Error:', cfoError);
    } else {
      console.log('   ✅ CFO assumption reset to HOLDING\n');
    }

    // 2. Break one decision-specific assumption (landlord lease)
    console.log('2️⃣ Breaking ONE decision-specific assumption (landlord lease)...');
    const { error: leaseError } = await db
      .from('assumptions')
      .update({ status: 'BROKEN' })
      .eq('id', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    if (leaseError) {
      console.error('Error:', leaseError);
    } else {
      console.log('   ✅ Landlord lease assumption marked as BROKEN\n');
    }

    console.log('🎉 Test setup complete!\n');
    console.log('📋 Current state for "Open New Store" decision:');
    console.log('   - Universal assumptions: All HOLDING ✅');
    console.log('   - Decision-specific: 1 of 3 BROKEN (landlord lease) ⚠️');
    console.log('\n💡 Expected behavior when you click "Evaluate Now":');
    console.log('   - Decision should NOT be invalidated (only decision-specific broken)');
    console.log('   - Health should decrease by ~20 points (1/3 broken = 33% → ~20 point penalty)');
    console.log('   - Lifecycle should remain ACTIVE or move to AT_RISK');
    console.log('   - Status should show "At risk" not "Invalidated"\n');
    console.log('🧪 Now:');
    console.log('   1. Refresh the Assumptions page');
    console.log('   2. Go to Decision Monitoring');
    console.log('   3. Click "Evaluate Now" for "Open New Store"');
    console.log('   4. Check the health score - it should drop proportionally!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupProportionalTest();
