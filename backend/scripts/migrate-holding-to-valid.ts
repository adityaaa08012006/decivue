/**
 * Migration: Change HOLDING → VALID
 * Updates the assumption status terminology to be clearer
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function migrateHoldingToValid() {
  console.log('🔄 Migrating assumption status: HOLDING → VALID\n');

  try {
    // Step 1: Update all HOLDING statuses to VALID
    console.log('1️⃣ Updating all assumptions with status HOLDING → VALID...');
    
    const { data: updated, error: updateError } = await db
      .from('assumptions')
      .update({ status: 'VALID' })
      .eq('status', 'HOLDING')
      .select('id, description');

    if (updateError) {
      console.error('❌ Error updating:', updateError);
      return;
    }

    console.log(`   ✅ Updated ${updated?.length || 0} assumptions\n`);

    // Step 2: Verify the change
    console.log('2️⃣ Verifying new status distribution...');
    
    const { data: stats } = await db
      .from('assumptions')
      .select('status');

    const statusCounts = (stats || []).reduce((acc: any, a: any) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    console.log('   Current status distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });

    console.log('\n✅ Migration complete!');
    console.log('\n💡 New status values:');
    console.log('   - VALID (was HOLDING): Assumption is currently true and verified');
    console.log('   - SHAKY: Assumption is deteriorating, needs attention');
    console.log('   - BROKEN: Assumption is no longer valid, decision at risk\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateHoldingToValid();
