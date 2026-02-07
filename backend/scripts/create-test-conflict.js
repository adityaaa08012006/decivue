/**
 * Script to create test assumption conflict data
 * Executes SQL commands directly through Supabase client
 * 
 * Usage: npm run create-test-conflict
 * Or: npx tsx scripts/create-test-conflict.ts
 */

import { getDatabase } from '../src/data/database';

async function createTestConflict() {
  console.log('🔧 Creating test assumption conflict data...\n');
  
  try {
    const db = getDatabase();

    // Step 1: Create Assumption A
    console.log('📝 Creating Assumption A: Budget remains at $50k...');
    const { data: assumptionA, error: errorA } = await db
      .from('assumptions')
      .upsert({
        id: '11111111-1111-1111-1111-111111111111',
        description: 'Budget will remain at $50,000 for Q1 - The allocated budget is expected to stay at $50,000 without any cuts or additional funding.',
        status: 'HOLDING',
        scope: 'UNIVERSAL'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorA) {
      console.error('❌ Error creating Assumption A:', errorA);
      throw errorA;
    }
    console.log('✅ Assumption A created:', assumptionA.id);

    // Step 2: Create Assumption B
    console.log('\n📝 Creating Assumption B: Budget reduced by 30%...');
    const { data: assumptionB, error: errorB } = await db
      .from('assumptions')
      .upsert({
        id: '22222222-2222-2222-2222-222222222222',
        description: 'Budget will be reduced by 30% in Q1 - Due to cost-cutting measures, the Q1 budget is expected to be reduced by approximately 30% from the original allocation.',
        status: 'HOLDING',
        scope: 'UNIVERSAL'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorB) {
      console.error('❌ Error creating Assumption B:', errorB);
      throw errorB;
    }
    console.log('✅ Assumption B created:', assumptionB.id);

    // Step 3: Create the conflict
    console.log('\n⚠️  Creating conflict between assumptions...');
    const { data: conflict, error: errorConflict } = await db
      .from('assumption_conflicts')
      .upsert({
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        assumption_a_id: '11111111-1111-1111-1111-111111111111',
        assumption_b_id: '22222222-2222-2222-2222-222222222222',
        conflict_type: 'CONTRADICTORY',
        confidence_score: 0.95,
        metadata: {
          detected_by: 'manual_test',
          notes: 'These assumptions directly contradict each other regarding Q1 budget'
        }
      }, { onConflict: 'assumption_a_id,assumption_b_id' })
      .select()
      .single();

    if (errorConflict) {
      console.error('❌ Error creating conflict:', errorConflict);
      throw errorConflict;
    }
    console.log('✅ Conflict created:', conflict.id);

    // Step 4: Verify the data
    console.log('\n🔍 Verifying created data...');
    
    const { data: assumptions, error: verifyAssumptions } = await db
      .from('assumptions')
      .select('*')
      .in('id', ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222']);

    if (verifyAssumptions) throw verifyAssumptions;
    console.log(`✅ Assumptions in database: ${assumptions.length}`);
    assumptions.forEach(a => {
      console.log(`   - ${a.description.substring(0, 50)}...`);
    });

    const { data: conflicts, error: verifyConflicts } = await db
      .rpc('get_all_assumption_conflicts', { include_resolved: false });

    if (verifyConflicts) throw verifyConflicts;
    console.log(`\n✅ Conflicts in database: ${conflicts.length}`);
    if (conflicts.length > 0) {
      const testConflict = conflicts.find(c => c.id === 'cccccccc-cccc-cccc-cccc-cccccccccccc');
      if (testConflict) {
        console.log(`   - Type: ${testConflict.conflict_type}`);
        console.log(`   - Confidence: ${Math.round(testConflict.confidence_score * 100)}%`);
        console.log(`   - Resolved: ${testConflict.resolved_at ? 'Yes' : 'No'}`);
      }
    }

    console.log('\n🎉 Success! Test conflict data created successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Open the frontend application');
    console.log('2. Navigate to "Assumptions Section"');
    console.log('3. Look for "Detected Conflicts" section');
    console.log('4. You should see the budget conflict with 95% confidence');

  } catch (error) {
    console.error('\n❌ Failed to create test data:', error.message);
    console.error('\nTroubleshooting:');
    console.error('- Ensure backend is connected to Supabase');
    console.error('- Check that assumption_conflicts table exists');
    console.error('- Verify get_all_assumption_conflicts RPC function exists');
    process.exit(1);
  }
}

// Run the script
createTestConflict();
