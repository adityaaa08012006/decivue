/**
 * Create test data with conflicting assumptions
 * This script creates assumptions that conflict with each other
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  console.error('Expected: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseKey);

async function createConflictTestData() {
  console.log('🔧 Creating conflict test data...\n');

  try {
    // Get the "Open New Store in Downtown District" decision
    const { data: decision } = await db
      .from('decisions')
      .select('*')
      .eq('title', 'Open New Store in Downtown District')
      .single();

    if (!decision) {
      console.error('❌ Decision not found');
      return;
    }

    console.log(`✅ Found decision: ${decision.title} (${decision.id})\n`);

    // Create two conflicting assumptions about the lease cost
    const assumption1Id = uuidv4();
    const assumption2Id = uuidv4();

    // Assumption 1: Lease will cost $8,000/month
    const { error: error1 } = await db.from('assumptions').insert({
      id: assumption1Id,
      description: 'CONFLICT TEST: Lease negotiation expected at $8,000/month based on initial landlord discussions and comparable properties in the area',
      status: 'HOLDING',
      created_at: new Date().toISOString()
    });

    if (error1) {
      console.error('❌ Error creating assumption 1:', error1);
      return;
    }

    // Link assumption 1 to decision
    await db.from('decision_assumptions').insert({
      decision_id: decision.id,
      assumption_id: assumption1Id
    });

    console.log('✅ Created Assumption 1: Lease at $8,000/month');

    // Assumption 2: Lease will cost $12,000/month (CONFLICT!)
    const { error: error2 } = await db.from('assumptions').insert({
      id: assumption2Id,
      description: 'CONFLICT TEST: Market research indicates minimum lease rate of $12,000/month required due to 50% increase in premium downtown pricing',
      status: 'HOLDING',
      created_at: new Date().toISOString()
    });

    if (error2) {
      console.error('❌ Error creating assumption 2:', error2);
      return;
    }

    // Link assumption 2 to decision
    await db.from('decision_assumptions').insert({
      decision_id: decision.id,
      assumption_id: assumption2Id
    });

    console.log('✅ Created Assumption 2: Lease at $12,000/month (CONFLICTS with Assumption 1)\n');

    // Create the conflict record
    const conflictId = uuidv4();
    const { error: conflictError } = await db.from('assumption_conflicts').insert({
      id: conflictId,
      assumption_a_id: assumption1Id,
      assumption_b_id: assumption2Id,
      conflict_type: 'factual',
      severity: 'high',
      description: 'Conflicting information about downtown lease pricing - One assumption states $8,000/month while another states $12,000/month for the same property',
      detected_at: new Date().toISOString(),
      status: 'active'
    });

    if (conflictError) {
      console.error('❌ Error creating conflict:', conflictError);
      return;
    }

    console.log('✅ Created CONFLICT between the two lease assumptions\n');

    // Create another conflict for the budget assumptions
    const { data: budgetAssumptions } = await db
      .from('assumptions')
      .select('*')
      .or('description.ilike.%budget will be reduced by 30%%,description.ilike.%Budget will remain at $50,000%')
      .limit(2);

    if (budgetAssumptions && budgetAssumptions.length >= 2) {
      const conflictId2 = uuidv4();
      await db.from('assumption_conflicts').insert({
        id: conflictId2,
        assumption_a_id: budgetAssumptions[0].id,
        assumption_b_id: budgetAssumptions[1].id,
        conflict_type: 'factual',
        severity: 'critical',
        description: 'Critical budget conflict - One assumption indicates 30% budget cut while another assumes budget remains unchanged at $50,000',
        detected_at: new Date().toISOString(),
        status: 'active'
      });

      console.log('✅ Created CONFLICT between budget assumptions (30% cut vs stable budget)\n');
    }

    console.log('🎉 Test data created successfully!\n');
    console.log('📋 Summary:');
    console.log('   - 2 new conflicting lease assumptions created');
    console.log('   - 1 conflict for lease pricing ($8k vs $12k)');
    console.log('   - 1 conflict for budget (cut vs stable)');
    console.log('\n💡 Next steps:');
    console.log('   1. Go to Assumptions page - you should see conflict badges');
    console.log('   2. Click on a conflict to open the resolution modal');
    console.log('   3. Choose a resolution (e.g., VALIDATE_A to mark B as BROKEN)');
    console.log('   4. Check Assumptions page - broken assumption should show red "Broken" badge');
    console.log('   5. Go to Decision Monitoring and click "Evaluate Now"');
    console.log('   6. Health should decrease due to broken assumption\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createConflictTestData();
