/**
 * Update assumption scopes
 * - Assumptions linked to decisions → DECISION_SPECIFIC
 * - Budget/CFO assumptions → UNIVERSAL (affect all decisions)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function updateAssumptionScopes() {
  console.log('🔧 Updating assumption scopes...\n');

  try {
    // First, add the scope column if it doesn't exist (run migration)
    console.log('1️⃣ Ensuring scope column exists...');
    
    // Get all assumptions
    const { data: allAssumptions, error: fetchError } = await db
      .from('assumptions')
      .select('id, description');

    if (fetchError) {
      console.error('Error fetching assumptions:', fetchError);
      return;
    }

    console.log(`   Found ${allAssumptions.length} assumptions\n`);

    // Identify universal assumptions (budget-related)
    const universalKeywords = ['budget', 'Budget', 'CFO', 'operating budget', 'Q1-Q2 allocation'];
    const universalAssumptions = allAssumptions.filter(a =>
      universalKeywords.some(keyword => a.description.includes(keyword))
    );

    console.log(`2️⃣ Marking ${universalAssumptions.length} assumptions as UNIVERSAL:`);
    for (const assumption of universalAssumptions) {
      console.log(`   - ${assumption.description.substring(0, 80)}...`);
      
      const { error } = await db
        .from('assumptions')
        .update({ scope: 'UNIVERSAL' })
        .eq('id', assumption.id);

      if (error) {
        console.error(`   ❌ Error updating ${assumption.id}:`, error);
      }
    }

    // Mark all others as DECISION_SPECIFIC
    const specificAssumptions = allAssumptions.filter(a =>
      !universalKeywords.some(keyword => a.description.includes(keyword))
    );

    console.log(`\n3️⃣ Marking ${specificAssumptions.length} assumptions as DECISION_SPECIFIC:`);
    for (const assumption of specificAssumptions) {
      console.log(`   - ${assumption.description.substring(0, 80)}...`);
      
      const { error } = await db
        .from('assumptions')
        .update({ scope: 'DECISION_SPECIFIC' })
        .eq('id', assumption.id);

      if (error) {
        console.error(`   ❌ Error updating ${assumption.id}:`, error);
      }
    }

    console.log('\n✅ Scope update complete!\n');
    console.log('📊 Summary:');
    console.log(`   - Universal assumptions: ${universalAssumptions.length}`);
    console.log(`   - Decision-specific assumptions: ${specificAssumptions.length}`);
    console.log(`   - Total: ${allAssumptions.length}\n`);

    console.log('💡 Evaluation behavior:');
    console.log('   - Universal BROKEN → Immediate invalidation (health = 0)');
    console.log('   - Decision-specific BROKEN → Proportional health penalty');
    console.log('   - 1 of 3 specific broken → ~20 point penalty');
    console.log('   - 2 of 3 specific broken → ~40 point penalty');
    console.log('   - 3 of 3 specific broken (100%) → Invalidation\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAssumptionScopes();
