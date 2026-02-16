/**
 * Simple test: Mark an assumption as BROKEN to test evaluation
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function createBrokenAssumptionTest() {
  console.log('🔧 Setting up test: Mark assumption as BROKEN\n');

  try {
    // Get the CFO budget cut assumption (it's marked as SHAKY/Warning)
    const { data: assumptions } = await db
      .from('assumptions')
      .select('*')
      .ilike('description', '%CFO announced potential 30% budget cut%');

    if (!assumptions || assumptions.length === 0) {
      console.log('⚠️  CFO assumption not found, creating a new test assumption...');
      
      // Create a test assumption linked to "Open New Store" decision
      const { data: newAssumption, error: insertError } = await db
        .from('assumptions')
        .insert({
          description: 'TEST: Store renovation budget approved at $50,000 - Finance team confirmed budget allocation',
          status: 'HOLDING'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Error creating assumption:', insertError);
        return;
      }

      // Link to decision
      await db.from('decision_assumptions').insert({
        decision_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', // Open New Store decision
        assumption_id: newAssumption.id
      });

      console.log('✅ Created new assumption:', newAssumption.description);
      console.log(`   ID: ${newAssumption.id}\n`);

      // Now mark it as BROKEN
      const { error: updateError } = await db
        .from('assumptions')
        .update({ status: 'BROKEN' })
        .eq('id', newAssumption.id);

      if (updateError) {
        console.error('❌ Error updating assumption:', updateError);
        return;
      }

      console.log('✅ Marked assumption as BROKEN\n');
    } else {
      const assumption = assumptions[0];
      console.log(`✅ Found assumption: ${assumption.description}`);
      console.log(`   Current status: ${assumption.status}`);
      console.log(`   ID: ${assumption.id}\n`);

      // Mark it as BROKEN
      const { error: updateError } = await db
        .from('assumptions')
        .update({ status: 'BROKEN' })
        .eq('id', assumption.id);

      if (updateError) {
        console.error('❌ Error updating assumption:', updateError);
        return;
      }

      console.log('✅ Updated assumption status to BROKEN\n');
    }

    console.log('🎉 Test setup complete!\n');
    console.log('📋 Next steps:');
    console.log('   1. Refresh the Assumptions page - you should see a BROKEN (red) badge');
    console.log('   2. Go to Decision Monitoring');
    console.log('   3. Click "Evaluate Now" for "Open New Store in Downtown District"');
    console.log('   4. Watch the health score - it should DECREASE because of the broken assumption');
    console.log('   5. Check the console and backend logs for evaluation details\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createBrokenAssumptionTest();
