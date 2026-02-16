/**
 * Fix the broken assumption - mark it as valid again
 * This simulates resolving the issue (e.g., lease negotiation succeeded)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function fixBrokenAssumption() {
  console.log('🔧 Fixing broken assumption...\n');

  try {
    // Change the landlord lease assumption from BROKEN → HOLDING
    console.log('1️⃣ Changing landlord lease assumption from BROKEN → HOLDING');
    console.log('   (Simulating: Lease negotiation succeeded at revised terms)\n');
    
    const { error } = await db
      .from('assumptions')
      .update({ status: 'HOLDING' })
      .eq('id', '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log('✅ Assumption status updated to HOLDING\n');
    console.log('📋 New state:');
    console.log('   - All universal assumptions: HOLDING ✅');
    console.log('   - All decision-specific assumptions: HOLDING ✅');
    console.log('   - No broken assumptions remaining!\n');
    
    console.log('💡 Expected behavior when you click "Evaluate Now":');
    console.log('   - Health should jump to 100/100 (no penalties)');
    console.log('   - Status should change to "Good" or "Stable"');
    console.log('   - Lifecycle should be ACTIVE with full health');
    console.log('   - Badge color should turn green ✅\n');
    
    console.log('🧪 Next steps:');
    console.log('   1. Refresh the Assumptions page - all should be green');
    console.log('   2. Go to Decision Monitoring');
    console.log('   3. Click "Evaluate Now" for "Open New Store"');
    console.log('   4. Watch health go to 100/100! 🎉\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixBrokenAssumption();
