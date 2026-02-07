/**
 * Comprehensive Test Data Script
 * Creates realistic test data for a non-technical organization (e.g., Retail Business)
 * 
 * Includes:
 * - 2 Decisions (Store Expansion, Marketing Campaign)
 * - 1 Universal Assumption (Annual Budget)
 * - 2 Decision-specific Assumptions
 * - 1 Assumption Conflict
 * - Dependencies between decisions
 * - Constraints
 * 
 * Usage: npm run create-full-test-data
 * Or: npx tsx scripts/create-full-test-data.ts
 */

import 'dotenv/config';
import { getDatabase, initializeDatabase } from '../src/data/database';

async function createFullTestData() {
  console.log('🏢 Creating comprehensive test data for retail organization...\n');
  
  try {
    // Initialize database connection
    await initializeDatabase();
    const db = getDatabase();

    // ========================================================================
    // STEP 1: Create 2 Decisions
    // ========================================================================
    console.log('📋 Creating Decision 1: Store Expansion Plan...');
    const { data: decision1, error: errorD1 } = await db
      .from('decisions')
      .upsert({
        id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        title: 'Open New Store in Downtown District',
        description: 'Expand our retail presence by opening a new flagship store in the downtown shopping district. The store will be 2,500 sq ft with premium location on Main Street. Market research shows high foot traffic with 40% increase in potential customers. Current store is operating at 95% capacity. Investment required: $250,000. Expected ROI: 18-24 months.',
        lifecycle: 'STABLE',
        health_signal: 85,
        expiry_date: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days
        metadata: {
          investment_required: '$250,000',
          expected_roi: '18-24 months',
          market_segment: 'premium retail',
          tags: ['expansion', 'retail', 'growth']
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorD1) throw errorD1;
    console.log('✅ Decision 1 created:', decision1.id);

    console.log('\n📋 Creating Decision 2: Digital Marketing Campaign...');
    const { data: decision2, error: errorD2 } = await db
      .from('decisions')
      .upsert({
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        title: 'Launch Summer Digital Marketing Campaign',
        description: 'Execute a comprehensive digital marketing campaign targeting 25-45 age demographic across social media, email, and search engines for our summer product line. Online sales currently represent only 15% of total revenue while competitors average 35%. Campaign aims to increase online presence and drive traffic to both online store and physical locations. Campaign budget: $80,000 over 3 months targeting Instagram, Facebook, and Google Ads.',
        lifecycle: 'STABLE',
        health_signal: 90,
        expiry_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
        metadata: {
          campaign_budget: '$80,000',
          duration: '3 months',
          target_channels: ['Instagram', 'Facebook', 'Google Ads'],
          tags: ['marketing', 'digital', 'revenue-growth']
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorD2) throw errorD2;
    console.log('✅ Decision 2 created:', decision2.id);

    // ========================================================================
    // STEP 2: Create Universal Assumption (Budget)
    // ========================================================================
    console.log('\n💰 Creating Universal Assumption: Annual Budget...');
    const { data: universalAssumption, error: errorUA } = await db
      .from('assumptions')
      .upsert({
        id: '00000000-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        description: 'Annual operating budget for growth initiatives is $500,000 with Q1-Q2 allocation of $300,000 - Budget approved by board for expansion and marketing activities',
        status: 'HOLDING',
        scope: 'UNIVERSAL',
        metadata: {
          fiscal_year: '2026',
          approved_by: 'Board of Directors',
          review_date: '2026-06-30'
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorUA) throw errorUA;
    console.log('✅ Universal Assumption created:', universalAssumption.id);

    // ========================================================================
    // STEP 3: Create Decision-Specific Assumptions
    // ========================================================================
    console.log('\n📝 Creating Decision-Specific Assumption 1: Lease Agreement...');
    const { data: localAssumption1, error: errorLA1 } = await db
      .from('assumptions')
      .upsert({
        id: '11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        description: 'Downtown landlord will agree to 5-year lease with favorable terms at $8,000/month - Preliminary discussions show landlord interest in long-term tenant',
        status: 'HOLDING',
        scope: 'DECISION_SPECIFIC',
        metadata: {
          property_address: '123 Main Street',
          lease_terms: '5 years with 3% annual increase',
          decision_context: 'Store expansion'
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorLA1) throw errorLA1;
    console.log('✅ Decision-Specific Assumption 1 created:', localAssumption1.id);

    console.log('\n📝 Creating Decision-Specific Assumption 2: Campaign Performance...');
    const { data: localAssumption2, error: errorLA2 } = await db
      .from('assumptions')
      .upsert({
        id: '22222222-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        description: 'Digital marketing campaign will achieve 4% conversion rate based on industry benchmarks - Similar campaigns in retail sector show 3-5% conversion rates',
        status: 'HOLDING',
        scope: 'DECISION_SPECIFIC',
        metadata: {
          benchmark_source: 'Retail Marketing Association 2025',
          historical_performance: '2.8% from last campaign',
          target_metrics: '200 new online customers/month'
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorLA2) throw errorLA2;
    console.log('✅ Decision-Specific Assumption 2 created:', localAssumption2.id);

    // ========================================================================
    // STEP 4: Create Conflicting Assumption (Budget Conflict)
    // ========================================================================
    console.log('\n⚠️  Creating Conflicting Assumption: Budget Reduction...');
    const { data: conflictingAssumption, error: errorCA } = await db
      .from('assumptions')
      .upsert({
        id: '33333333-cccc-cccc-cccc-cccccccccccc',
        description: 'CFO announced potential 30% budget cut for Q2 due to underperforming Q4 2025 sales - Cost reduction initiative may impact approved growth budget',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        metadata: {
          source: 'Q4 2025 Financial Review Meeting',
          impact_date: '2026-04-01',
          affected_areas: ['expansion', 'marketing', 'operations']
        }
      }, { onConflict: 'id' })
      .select()
      .single();

    if (errorCA) throw errorCA;
    console.log('✅ Conflicting Assumption created:', conflictingAssumption.id);

    // ========================================================================
    // STEP 5: Link Assumptions to Decisions
    // ========================================================================
    console.log('\n🔗 Linking assumptions to decisions...');
    
    // Link universal assumption to decision 1
    await db.from('decision_assumptions').upsert({
      decision_id: decision1.id,
      assumption_id: universalAssumption.id
    }, { onConflict: 'decision_id,assumption_id' });

    // Link universal assumption to decision 2
    await db.from('decision_assumptions').upsert({
      decision_id: decision2.id,
      assumption_id: universalAssumption.id
    }, { onConflict: 'decision_id,assumption_id' });

    // Link conflicting assumption to both decisions
    await db.from('decision_assumptions').upsert({
      decision_id: decision1.id,
      assumption_id: conflictingAssumption.id
    }, { onConflict: 'decision_id,assumption_id' });

    await db.from('decision_assumptions').upsert({
      decision_id: decision2.id,
      assumption_id: conflictingAssumption.id
    }, { onConflict: 'decision_id,assumption_id' });

    // Link local assumption 1 to decision 1
    await db.from('decision_assumptions').upsert({
      decision_id: decision1.id,
      assumption_id: localAssumption1.id
    }, { onConflict: 'decision_id,assumption_id' });

    // Link local assumption 2 to decision 2
    await db.from('decision_assumptions').upsert({
      decision_id: decision2.id,
      assumption_id: localAssumption2.id
    }, { onConflict: 'decision_id,assumption_id' });

    console.log('✅ Assumptions linked to decisions');

    // ========================================================================
    // STEP 6: Create Assumption Conflict
    // ========================================================================
    console.log('\n⚔️  Creating assumption conflict (Budget vs Budget Cut)...');
    
    // The database has conflict_reason as a NOT NULL column
    const { data: conflict, error: errorConflict } = await db
      .from('assumption_conflicts')
      .upsert({
        id: '44444444-dddd-dddd-dddd-dddddddddddd',
        assumption_a_id: universalAssumption.id, // 00000000-aaaa... (smaller UUID)
        assumption_b_id: conflictingAssumption.id, // 33333333-cccc... (larger UUID)
        conflict_type: 'CONTRADICTORY',
        conflict_reason: 'Budget cannot both remain at $500K and be reduced by 30% to $350K - these assumptions directly contradict each other for Q2 planning',
        confidence_score: 0.92,
        detected_at: new Date().toISOString(),
        resolved_at: null,
        resolution_action: null,
        resolution_notes: null,
        metadata: {
          detected_by: 'financial_review',
          impact: 'High - affects both major initiatives',
          urgency: 'Immediate resolution required before Q2'
        }
      }, { onConflict: 'assumption_a_id,assumption_b_id' })
      .select()
      .single();

    if (errorConflict) throw errorConflict;
    console.log('✅ Assumption conflict created:', conflict.id);

    // ========================================================================
    // STEP 7: Create Decision Dependency
    // ========================================================================
    console.log('\n🔗 Creating decision dependency (Marketing depends on Store)...');
    
    try {
      const { data: dependency, error: errorDep } = await db
        .from('dependencies')
        .upsert({
          source_decision_id: decision2.id, // Marketing campaign
          target_decision_id: decision1.id  // Store expansion
        }, { onConflict: 'source_decision_id,target_decision_id' })
        .select();

      if (errorDep) {
        console.warn('⚠️  Could not create dependency (RLS policy):', errorDep.message);
      } else {
        console.log('✅ Dependency created: Marketing campaign depends on Store expansion success');
      }
    } catch (error) {
      console.warn('⚠️  Dependency creation skipped due to RLS restrictions');
    }

    // ========================================================================
    // STEP 8: Create Constraints
    // ========================================================================
    console.log('\n⚖️  Creating constraints...');
    
    try {
      const { data: constraint1, error: errorC1 } = await db
        .from('constraints')
        .upsert({
          id: '55555555-eeee-eeee-eeee-eeeeeeeeeeee',
          name: 'Budget Compliance Rule',
          description: 'Total spending across all decisions must not exceed allocated budget of $500,000',
          constraint_type: 'BUDGET',
          rule_expression: 'SUM(decision_budgets) <= total_budget',
          is_immutable: true
        }, { onConflict: 'id' })
        .select()
        .single();

      if (errorC1) {
        console.warn('⚠️  Could not create constraint 1 (RLS policy):', errorC1.message);
      } else {
        console.log('✅ Constraint 1 created: Budget Compliance Rule');
      }

      const { data: constraint2, error: errorC2 } = await db
        .from('constraints')
        .upsert({
          id: '66666666-ffff-ffff-ffff-ffffffffffff',
          name: 'Timeline Coordination Rule',
          description: 'Marketing campaign must launch after store opening to maximize impact - requires 2 weeks buffer post store opening',
          constraint_type: 'POLICY',
          rule_expression: 'marketing_launch_date > (store_opening_date + 14 days)',
          is_immutable: false
        }, { onConflict: 'id' })
        .select()
        .single();

      if (errorC2) {
        console.warn('⚠️  Could not create constraint 2 (RLS policy):', errorC2.message);
      } else {
        console.log('✅ Constraint 2 created: Timeline Coordination Rule');
      }

      // Link constraints to decisions (only if constraints were created successfully)
      if (constraint1) {
        await db.from('decision_constraints').upsert({
          decision_id: decision1.id,
          constraint_id: constraint1.id
        }, { onConflict: 'decision_id,constraint_id' });

        await db.from('decision_constraints').upsert({
          decision_id: decision2.id,
          constraint_id: constraint1.id
        }, { onConflict: 'decision_id,constraint_id' });
      }

      if (constraint2) {
        await db.from('decision_constraints').upsert({
          decision_id: decision2.id,
          constraint_id: constraint2.id
        }, { onConflict: 'decision_id,constraint_id' });
      }
    } catch (error) {
      console.warn('⚠️  Constraint creation skipped due to RLS restrictions');
    }

    // ========================================================================
    // VERIFICATION
    // ========================================================================
    console.log('\n' + '═'.repeat(60));
    console.log('🔍 VERIFICATION SUMMARY');
    console.log('═'.repeat(60));

    const { data: decisions } = await db.from('decisions').select('*');
    console.log(`\n✅ Decisions: ${decisions?.length || 0}`);
    decisions?.forEach(d => console.log(`   📋 ${d.title}`));

    const { data: assumptions } = await db.from('assumptions').select('*');
    const universal = assumptions?.filter(a => a.scope === 'UNIVERSAL').length || 0;
    const specific = assumptions?.filter(a => a.scope === 'DECISION_SPECIFIC').length || 0;
    console.log(`\n✅ Assumptions: ${assumptions?.length || 0} (${universal} universal, ${specific} decision-specific)`);
    assumptions?.forEach(a => {
      const emoji = a.scope === 'UNIVERSAL' ? '🌐' : '📌';
      console.log(`   ${emoji} ${a.description.substring(0, 60)}...`);
    });

    const { data: conflicts } = await db.rpc('get_all_assumption_conflicts', { include_resolved: false });
    console.log(`\n✅ Active Conflicts: ${conflicts?.length || 0}`);
    conflicts?.forEach(c => console.log(`   ⚔️  ${c.conflict_type} (${Math.round(c.confidence_score * 100)}% confidence)`));

    const { data: deps } = await db.from('dependencies').select('*');
    console.log(`\n✅ Dependencies: ${deps?.length || 0}`);

    const { data: constraints } = await db.from('constraints').select('*');
    console.log(`\n✅ Constraints: ${constraints?.length || 0}`);
    constraints?.forEach(c => console.log(`   ⚖️  ${c.constraint_name} (${c.scope})`));

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 SUCCESS! Full test data created!');
    console.log('═'.repeat(60));
    
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Open frontend and navigate to "Decision Monitoring"');
    console.log('2. You should see 2 decisions with health signals');
    console.log('3. Go to "Assumptions Section" to see conflicts');
    console.log('4. Check Decision Flow for dependencies');
    console.log('\n💡 TEST SCENARIOS:');
    console.log('• Resolve the budget conflict and see impact on decisions');
    console.log('• Time jump 30 days to see expiry warnings');
    console.log('• Mark an assumption as BROKEN to see health degradation');

    process.exit(0);

  } catch (error: any) {
    console.error('\n❌ Error creating test data:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createFullTestData();
