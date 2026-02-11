import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function createBetterTestData() {
  console.log('🎭 Creating improved test data with conflicts and universal assumptions...\n');

  // =========================================================================
  // STEP 1: Create UNIVERSAL (organizational) assumptions
  // =========================================================================
  console.log('📗 Creating UNIVERSAL assumptions (shared across all decisions)...\n');

  const universalAssumptions = [
    {
      id: uuidv4(),
      description: 'ORG: Company has sufficient budget for strategic initiatives ($5M allocated)',
      status: 'VALID',
      scope: 'UNIVERSAL'
    },
    {
      id: uuidv4(),
      description: 'ORG: Engineering team capacity is at 80% utilization',
      status: 'VALID',
      scope: 'UNIVERSAL'
    },
    {
      id: uuidv4(),
      description: 'ORG: Market conditions remain stable for next 12 months',
      status: 'VALID',
      scope: 'UNIVERSAL'
    }
  ];

  for (const assumption of universalAssumptions) {
    const { error } = await db.from('assumptions').insert(assumption);
    if (error) {
      console.error('Error inserting universal assumption:', error);
    } else {
      console.log(`   ✅ Created: ${assumption.description.substring(0, 60)}...`);
    }
  }

  // =========================================================================
  // STEP 2: Create a decision with conflicting assumptions
  // =========================================================================
  console.log('\n📕 Creating decision with CONFLICTING assumptions...\n');

  const conflictDecisionId = uuidv4();
  await db.from('decisions').insert({
    id: conflictDecisionId,
    title: 'Launch AI-Powered Analytics Feature',
    description: 'Add machine learning analytics to our platform',
    lifecycle: 'PLANNING',
    health_signal: 100,
    created_at: new Date().toISOString()
  });

  // Create TWO CONFLICTING assumptions
  const conflictAssumption1 = {
    id: uuidv4(),
    description: 'CONFLICT: AI model training will take 3 months with current team',
    status: 'VALID',
    scope: 'DECISION_SPECIFIC'
  };

  const conflictAssumption2 = {
    id: uuidv4(),
    description: 'CONFLICT: AI model can be deployed in 6 weeks using pre-trained models',
    status: 'VALID',
    scope: 'DECISION_SPECIFIC'
  };

  // Insert both conflicting assumptions
  await db.from('assumptions').insert([conflictAssumption1, conflictAssumption2]);

  // Link both to the decision
  await db.from('decision_assumptions').insert([
    { decision_id: conflictDecisionId, assumption_id: conflictAssumption1.id },
    { decision_id: conflictDecisionId, assumption_id: conflictAssumption2.id }
  ]);

  // Link universal assumptions too
  for (const univ of universalAssumptions) {
    await db.from('decision_assumptions').insert({
      decision_id: conflictDecisionId,
      assumption_id: univ.id
    });
  }

  // Create a CONFLICT record
  const conflictId = uuidv4();
  await db.from('assumption_conflicts').insert({
    id: conflictId,
    assumption_a_id: conflictAssumption1.id,
    assumption_b_id: conflictAssumption2.id,
    conflict_type: 'CONTRADICTION',
    description: 'Timeline estimates conflict: 3 months vs 6 weeks for AI deployment',
    severity: 'HIGH',
    detected_at: new Date().toISOString(),
    status: 'OPEN'
  });

  console.log(`   ✅ Created decision with 2 conflicting assumptions`);
  console.log(`      - Assumption A: 3 months timeline`);
  console.log(`      - Assumption B: 6 weeks timeline`);
  console.log(`      - Conflict type: CONTRADICTION (HIGH severity)`);

  // =========================================================================
  // STEP 3: Update existing test decisions to include universal assumptions
  // =========================================================================
  console.log('\n📙 Linking universal assumptions to existing decisions...\n');

  const { data: existingDecisions } = await db
    .from('decisions')
    .select('id, title')
    .neq('id', conflictDecisionId);

  if (existingDecisions && existingDecisions.length > 0) {
    for (const decision of existingDecisions) {
      for (const univ of universalAssumptions) {
        // Check if link already exists
        const { data: existing } = await db
          .from('decision_assumptions')
          .select('*')
          .eq('decision_id', decision.id)
          .eq('assumption_id', univ.id)
          .single();

        if (!existing) {
          await db.from('decision_assumptions').insert({
            decision_id: decision.id,
            assumption_id: univ.id
          });
        }
      }
      console.log(`   ✅ Linked universal assumptions to: ${decision.title}`);
    }
  }

  console.log('\n🎉 Enhanced test data created!\n');
  console.log('📊 SUMMARY:');
  console.log(`   - Universal assumptions: ${universalAssumptions.length}`);
  console.log(`   - New decision with conflicts: 1`);
  console.log(`   - Conflict records: 1`);
  console.log('\n💡 TEST THE CONFLICT RESOLUTION:');
  console.log('   1. Go to "Launch AI-Powered Analytics Feature" decision');
  console.log('   2. Look for the assumption conflict warning');
  console.log('   3. Click to resolve the conflict');
  console.log('   4. Choose which assumption is correct');
}

createBetterTestData().catch(console.error);
