/**
 * Comprehensive Test Data Setup
 * Creates realistic scenarios to test all features:
 * 1. Decision with all VALID assumptions (healthy)
 * 2. Decision with BROKEN universal assumption (invalidated)
 * 3. Decision with BROKEN decision-specific assumptions (proportional penalty)
 * 4. Decision with SHAKY assumptions (warning state)
 */

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function createComprehensiveTestData() {
  console.log('🎭 Creating comprehensive test scenarios...\n');

  try {
    // =========================================================================
    // SCENARIO 1: Healthy Decision (All assumptions VALID)
    // =========================================================================
    console.log('📗 SCENARIO 1: Healthy Decision');
    console.log('   All assumptions valid → Health should be 100/100\n');

    const decision1Id = uuidv4();
    const { error: d1Error } = await db.from('decisions').insert({
      id: decision1Id,
      title: 'Launch Mobile App Beta',
      description: 'Release beta version of mobile app to 1000 users for testing and feedback',
      lifecycle: 'STABLE',
      health_signal: 85,
      created_at: new Date().toISOString()
    });

    if (d1Error) console.error('Error creating decision 1:', d1Error);

    // Create VALID assumptions for decision 1
    const assumptions1 = [
      { 
        id: uuidv4(), 
        description: 'Development team has completed core features for mobile app - All planned functionality implemented and tested',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Beta testing infrastructure is ready with 1000 user capacity - AWS environment configured and load tested',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'App Store approval process takes 3-5 days - Historical data shows consistent approval timeline',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      }
    ];

    for (const assumption of assumptions1) {
      const { error: insertError } = await db.from('assumptions').insert(assumption);
      if (insertError) {
        console.error('Error inserting assumption:', insertError);
        continue;
      }
      
      const { error: linkError } = await db.from('decision_assumptions').insert({
        decision_id: decision1Id,
        assumption_id: assumption.id
      });
      if (linkError) {
        console.error('Error linking assumption:', linkError);
      }
    }

    console.log('   ✅ Created "Launch Mobile App Beta" with 3 VALID assumptions\n');

    // =========================================================================
    // SCENARIO 2: Broken Universal Assumption (Immediate Invalidation)
    // =========================================================================
    console.log('📕 SCENARIO 2: Broken Universal Assumption');
    console.log('   Universal assumption broken → Health should be 0/100, INVALIDATED\n');

    const decision2Id = uuidv4();
    await db.from('decisions').insert({
      id: decision2Id,
      title: 'Expand to European Market',
      description: 'Launch operations in Germany, France, and UK with localized product offerings',
      lifecycle: 'STABLE',
      health_signal: 90,
      created_at: new Date().toISOString()
    });

    // Create a BROKEN universal assumption
    const brokenUniversal = {
      id: uuidv4(),
      description: 'TEST: Company has €2M budget allocated for international expansion - Finance confirmed funding available',
      status: 'BROKEN', // This will invalidate the decision
      scope: 'UNIVERSAL'
    };

    const { error: universalInsertError } = await db.from('assumptions').insert(brokenUniversal);
    if (universalInsertError) {
      console.error('Error inserting universal assumption:', universalInsertError);
      return;
    }
    
    const { error: universalLinkError } = await db.from('decision_assumptions').insert({
      decision_id: decision2Id,
      assumption_id: brokenUniversal.id
    });
    if (universalLinkError) {
      console.error('Error linking universal assumption:', universalLinkError);
    }

    // Add some valid decision-specific assumptions
    const assumptions2 = [
      { 
        id: uuidv4(), 
        description: 'GDPR compliance team ready for EU regulations - Legal team trained and processes documented',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'European logistics partner secured - Signed contract with DHL for distribution',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      }
    ];

    for (const assumption of assumptions2) {
      const { error: insertError } = await db.from('assumptions').insert(assumption);
      if (insertError) {
        console.error('Error inserting assumption:', insertError);
        continue;
      }
      
      const { error: linkError } = await db.from('decision_assumptions').insert({
        decision_id: decision2Id,
        assumption_id: assumption.id
      });
      if (linkError) {
        console.error('Error linking assumption:', linkError);
      }
    }

    console.log('   ✅ Created "Expand to European Market" with 1 BROKEN universal assumption\n');

    // =========================================================================
    // SCENARIO 3: Broken Decision-Specific Assumptions (Proportional Penalty)
    // =========================================================================
    console.log('📙 SCENARIO 3: Broken Decision-Specific Assumptions');
    console.log('   2 of 4 specific assumptions broken → Health penalty ~30 points\n');

    const decision3Id = uuidv4();
    await db.from('decisions').insert({
      id: decision3Id,
      title: 'Acquire Competitor StartupXYZ',
      description: 'Strategic acquisition of StartupXYZ to gain market share and technology IP',
      lifecycle: 'STABLE',
      health_signal: 95,
      created_at: new Date().toISOString()
    });

    const assumptions3 = [
      { 
        id: uuidv4(), 
        description: 'StartupXYZ valuation at $15M based on latest funding round - Series A valued company at $15M',
        status: 'BROKEN', // Actually valued at $25M
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Key engineering team willing to join after acquisition - Initial conversations positive',
        status: 'BROKEN', // Team leader announced departure
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Due diligence can complete in 45 days - Legal and financial review on track',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Board approval for acquisition budget secured - Board voted 6-1 in favor',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      }
    ];

    for (const assumption of assumptions3) {
      const { error: insertError } = await db.from('assumptions').insert(assumption);
      if (insertError) {
        console.error('Error inserting assumption:', insertError);
        continue;
      }
      
      const { error: linkError } = await db.from('decision_assumptions').insert({
        decision_id: decision3Id,
        assumption_id: assumption.id
      });
      if (linkError) {
        console.error('Error linking assumption:', linkError);
      }
    }

    console.log('   ✅ Created "Acquire Competitor" with 2/4 BROKEN specific assumptions\n');

    // =========================================================================
    // SCENARIO 4: SHAKY Assumptions (Warning State)
    // =========================================================================
    console.log('📒 SCENARIO 4: SHAKY Assumptions');
    console.log('   Assumptions deteriorating → Needs attention but not critical\n');

    const decision4Id = uuidv4();
    await db.from('decisions').insert({
      id: decision4Id,
      title: 'Migrate to Cloud Infrastructure',
      description: 'Move all production systems from on-premise servers to AWS cloud',
      lifecycle: 'STABLE',
      health_signal: 88,
      created_at: new Date().toISOString()
    });

    const assumptions4 = [
      { 
        id: uuidv4(), 
        description: 'AWS migration can complete in Q2 2026 without service disruption - Initial timeline based on vendor estimates',
        status: 'SHAKY', // Timeline slipping
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Cloud costs projected at $50k/month vs $70k on-premise - Cost model based on current usage',
        status: 'SHAKY', // Actual costs trending higher
        scope: 'DECISION_SPECIFIC'
      },
      { 
        id: uuidv4(), 
        description: 'Security team approved cloud architecture - All compliance requirements met',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC'
      }
    ];

    for (const assumption of assumptions4) {
      const { error: insertError } = await db.from('assumptions').insert(assumption);
      if (insertError) {
        console.error('Error inserting assumption:', insertError);
        continue;
      }
      
      const { error: linkError } = await db.from('decision_assumptions').insert({
        decision_id: decision4Id,
        assumption_id: assumption.id
      });
      if (linkError) {
        console.error('Error linking assumption:', linkError);
      }
    }

    console.log('   ✅ Created "Migrate to Cloud" with 2 SHAKY assumptions\n');

    // =========================================================================
    // Summary
    // =========================================================================
    console.log('🎉 Test data creation complete!\n');
    console.log('📊 SCENARIOS CREATED:');
    console.log('');
    console.log('1. 📗 Launch Mobile App Beta');
    console.log('   → All VALID assumptions');
    console.log('   → Expected: Health 100/100, Status: STABLE');
    console.log('');
    console.log('2. 📕 Expand to European Market');
    console.log('   → 1 BROKEN universal assumption');
    console.log('   → Expected: Health 0/100, Status: INVALIDATED');
    console.log('');
    console.log('3. 📙 Acquire Competitor StartupXYZ');
    console.log('   → 2 of 4 BROKEN decision-specific assumptions (50%)');
    console.log('   → Expected: Health ~70/100, Status: AT_RISK');
    console.log('');
    console.log('4. 📒 Migrate to Cloud Infrastructure');
    console.log('   → 2 SHAKY assumptions (deteriorating)');
    console.log('   → Expected: Health 85-90/100, Status: UNDER_REVIEW');
    console.log('');
    console.log('🧪 TESTING WORKFLOW:');
    console.log('   1. Go to Decision Monitoring page');
    console.log('   2. Click "Evaluate Now" for each decision');
    console.log('   3. Observe health scores and status changes');
    console.log('   4. Go to each decision detail to see assumptions');
    console.log('   5. Try changing assumption statuses on Assumptions page');
    console.log('   6. Re-evaluate to see health recalculate');
    console.log('');
    console.log('💡 TEST SCENARIOS:');
    console.log('   • Fix BROKEN universal (Scenario 2) → Watch invalidation clear');
    console.log('   • Fix 1 BROKEN specific (Scenario 3) → Watch health improve');
    console.log('   • Change VALID to SHAKY → Watch health decrease slightly');
    console.log('   • Break all specific assumptions → Watch invalidation trigger\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createComprehensiveTestData();
