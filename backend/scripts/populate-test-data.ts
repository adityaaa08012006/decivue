/**
 * Comprehensive Test Data Population Script
 * Creates realistic data to test:
 * - Decision version control
 * - Assumption conflict tracing
 * - Relation change tracking
 * - Health signal changes
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const db = createClient(supabaseUrl, supabaseServiceKey);

async function populateTestData() {
  console.log('🌱 Populating comprehensive test data...\n');

  try {
    // Find PLOT ARMOR organization
    const { data: plotArmorOrg } = await db
      .from('organizations')
      .select('id, name')
      .eq('name', 'PLOT ARMOR -_-')
      .single();

    if (!plotArmorOrg) {
      console.error('❌ PLOT ARMOR -_- organization not found in database.');
      return;
    }

    // Get first user from PLOT ARMOR org
    const { data: firstUser } = await db
      .from('users')
      .select('id, email')
      .eq('organization_id', plotArmorOrg.id)
      .limit(1)
      .single();

    if (!firstUser) {
      console.error('❌ No users found in PLOT ARMOR -_- organization.');
      return;
    }

    const orgId = plotArmorOrg.id;
    const userId = firstUser.id;

    console.log(`📋 Using organization: ${plotArmorOrg.name} (${orgId})`);
    console.log(`👤 Using user: ${firstUser.email} (${userId})\n`);

    // ========================================================================
    // 0. CLEANUP EXISTING TEST DATA
    // ========================================================================
    console.log('🧹 Cleaning up existing test data...');
    
    // Delete in correct order to respect foreign keys
    await db.from('decision_evaluation_history').delete().eq('organization_id', orgId);
    await db.from('decision_health_history').delete().eq('organization_id', orgId);
    await db.from('decision_relation_changes').delete().eq('organization_id', orgId);
    await db.from('decision_versions').delete().eq('organization_id', orgId);
    await db.from('decision_dependencies').delete().eq('organization_id', orgId);
    await db.from('decision_constraints').delete().eq('organization_id', orgId);
    await db.from('decision_assumptions').delete().eq('organization_id', orgId);
    await db.from('assumption_conflicts').delete().eq('organization_id', orgId);
    await db.from('assumptions').delete().eq('organization_id', orgId);
    await db.from('constraints').delete().eq('organization_id', orgId);
    await db.from('decisions').delete().eq('organization_id', orgId);
    
    console.log('  ✅ Cleanup complete\n');

    // ========================================================================
    // 1. CREATE DECISIONS WITH VARIETY
    // ========================================================================
    console.log('📊 Creating decisions...');

    const { data: decision1, error: d1Error } = await db.from('decisions').insert({
      title: 'Migrate to Microservices Architecture',
      description: 'Split monolith into microservices for better scalability',
      lifecycle: 'STABLE',
      health_signal: 100,
      organization_id: orgId,
      created_by: userId,
      category: 'Architecture',
      parameters: { complexity: 'high', timeline: '6 months' }
    }).select().single();
    if (d1Error) throw d1Error;

    const { data: decision2, error: d2Error } = await db.from('decisions').insert({
      title: 'Adopt TypeScript for Frontend',
      description: 'Migrate all JavaScript code to TypeScript',
      lifecycle: 'STABLE',
      health_signal: 100,
      organization_id: orgId,
      created_by: userId,
      category: 'Technology',
      parameters: { complexity: 'medium', timeline: '3 months' }
    }).select().single();
    if (d2Error) throw d2Error;

    const { data: decision3, error: d3Error } = await db.from('decisions').insert({
      title: 'Implement OAuth2 Authentication',
      description: 'Replace custom auth with industry-standard OAuth2',
      lifecycle: 'STABLE',
      health_signal: 100,
      organization_id: orgId,
      created_by: userId,
      category: 'Security',
      parameters: { complexity: 'medium', timeline: '2 months' }
    }).select().single();
    if (d3Error) throw d3Error;

    const { data: decision4, error: d4Error } = await db.from('decisions').insert({
      title: 'Deploy to Multi-Region Setup',
      description: 'Set up infrastructure in US, EU, and APAC regions',
      lifecycle: 'STABLE',
      health_signal: 100,
      organization_id: orgId,
      created_by: userId,
      category: 'Infrastructure',
      parameters: { complexity: 'high', timeline: '4 months' }
    }).select().single();
    if (d4Error) throw d4Error;

    console.log(`  ✅ Created ${[decision1, decision2, decision3, decision4].length} decisions\n`);

    // ========================================================================
    // 2. CREATE ASSUMPTIONS (MIX OF VALID AND CONFLICTING)
    // ========================================================================
    console.log('💭 Creating assumptions...');

    const orgPrefix = `[${plotArmorOrg.name}]`;

    // Valid assumptions
    const { data: assumption1, error: a1Error } = await db.from('assumptions').insert({
      description: `${orgPrefix} Team has microservices expertise`,
      status: 'VALID',
      scope: 'DECISION_SPECIFIC',
      organization_id: orgId,
      category: 'Team Capability',
      parameters: { confidence: 'high' }
    }).select().single();
    if (a1Error) throw a1Error;

    const { data: assumption2, error: a2Error } = await db.from('assumptions').insert({
      description: `${orgPrefix} Infrastructure supports horizontal scaling`,
      status: 'VALID',
      scope: 'DECISION_SPECIFIC',
      organization_id: orgId,
      category: 'Technical',
      parameters: { confidence: 'high' }
    }).select().single();
    if (a2Error) throw a2Error;

    const { data: assumption3, error: a3Error } = await db.from('assumptions').insert({
      description: `${orgPrefix} TypeScript will improve code quality`,
      status: 'VALID',
      scope: 'DECISION_SPECIFIC',
      organization_id: orgId,
      category: 'Quality',
      parameters: { confidence: 'medium' }
    }).select().single();
    if (a3Error) throw a3Error;

    // Create CONFLICTING assumptions (same parameter space, different conclusions)
    const { data: conflictingA, error: caError } = await db.from('assumptions').insert({
      description: `${orgPrefix} Microservices will reduce deployment complexity`,
      status: 'VALID',
      scope: 'DECISION_SPECIFIC',
      organization_id: orgId,
      category: 'Operations',
      parameters: { deploymentModel: 'distributed', complexity: 'reduced' }
    }).select().single();
    if (caError) throw caError;

    const { data: conflictingB, error: cbError } = await db.from('assumptions').insert({
      description: `${orgPrefix} Microservices will increase deployment complexity`,
      status: 'VALID',
      scope: 'DECISION_SPECIFIC',
      organization_id: orgId,
      category: 'Operations',
      parameters: { deploymentModel: 'distributed', complexity: 'increased' }
    }).select().single();
    if (cbError) throw cbError;

    // Universal assumption
    const { data: universalAssumption, error: uaError } = await db.from('assumptions').insert({
      description: `${orgPrefix} Company has budget for infrastructure investment`,
      status: 'VALID',
      scope: 'UNIVERSAL',
      organization_id: orgId,
      category: 'Financial',
      parameters: { budget: 'approved' }
    }).select().single();
    if (uaError) throw uaError;

    console.log(`  ✅ Created 6 assumptions (including 2 conflicting)\n`);

    // ========================================================================
    // 3. LINK ASSUMPTIONS TO DECISIONS
    // ========================================================================
    console.log('🔗 Linking assumptions to decisions...');

    // Link to Decision 1 (Microservices)
    // Both conflicting assumptions are linked to demonstrate conflict handling
    await db.from('decision_assumptions').insert([
      { decision_id: decision1.id, assumption_id: assumption1.id, organization_id: orgId },
      { decision_id: decision1.id, assumption_id: assumption2.id, organization_id: orgId },
      { decision_id: decision1.id, assumption_id: conflictingA.id, organization_id: orgId },
      { decision_id: decision1.id, assumption_id: conflictingB.id, organization_id: orgId }
    ]);

    // Track these as relation changes
    await db.rpc('track_relation_change', {
      p_decision_id: decision1.id,
      p_relation_type: 'assumption',
      p_relation_id: assumption1.id,
      p_action: 'linked',
      p_relation_description: assumption1.description,
      p_changed_by: userId,
      p_reason: 'Initial setup'
    });

    await db.rpc('track_relation_change', {
      p_decision_id: decision1.id,
      p_relation_type: 'assumption',
      p_relation_id: conflictingA.id,
      p_action: 'linked',
      p_relation_description: conflictingA.description,
      p_changed_by: userId,
      p_reason: 'Initial setup'
    });

    // Link to Decision 2 (TypeScript)
    await db.from('decision_assumptions').insert([
      { decision_id: decision2.id, assumption_id: assumption3.id, organization_id: orgId }
    ]);

    console.log(`  ✅ Linked assumptions to decisions\n`);

    // ========================================================================
    // 4. CREATE ASSUMPTION CONFLICTS
    // ========================================================================
    console.log('⚔️  Creating assumption conflicts...');

    const { data: conflictData, error: conflictError } = await db.from('assumption_conflicts').insert({
      assumption_a_id: conflictingA.id < conflictingB.id ? conflictingA.id : conflictingB.id,
      assumption_b_id: conflictingA.id < conflictingB.id ? conflictingB.id : conflictingA.id,
      conflict_type: 'CONTRADICTORY',
      confidence_score: 0.92,
      organization_id: orgId,
      resolution_notes: null,
      metadata: {
        explanation: 'These assumptions make contradictory claims about deployment complexity in microservices',
        affected_parameters: { deploymentModel: 'distributed', complexity: ['reduced', 'increased'] }
      }
    }).select().single();

    if (conflictError) {
      console.error('Error creating conflict:', conflictError);
      throw conflictError;
    }

    console.log(`  ✅ Created conflict between assumptions (ID: ${conflictData.id})\n`);

    // ========================================================================
    // 5. CREATE CONSTRAINTS
    // ========================================================================
    console.log('🔒 Creating constraints...');

    const { data: constraint1, error: c1Error } = await db.from('constraints').insert({
      name: `${orgPrefix} Security Compliance Required`,
      description: 'All decisions must comply with SOC2 requirements',
      constraint_type: 'COMPLIANCE',
      organization_id: orgId,
      is_immutable: true
    }).select().single();

    if (c1Error) {
      console.error('Error creating constraint 1:', c1Error);
      throw c1Error;
    }

    const { data: constraint2, error: c2Error } = await db.from('constraints').insert({
      name: `${orgPrefix} Budget Cap: $500K`,
      description: 'Total project cost must not exceed $500,000',
      constraint_type: 'BUDGET',
      organization_id: orgId,
      is_immutable: true
    }).select().single();

    if (c2Error) {
      console.error('Error creating constraint 2:', c2Error);
      throw c2Error;
    }

    console.log(`  ✅ Created 2 constraints\n`);

    // ========================================================================
    // 6. LINK CONSTRAINTS
    // ========================================================================
    console.log('🔗 Linking constraints...');

    await db.from('decision_constraints').insert([
      { decision_id: decision1.id, constraint_id: constraint1.id, organization_id: orgId },
      { decision_id: decision3.id, constraint_id: constraint1.id, organization_id: orgId },
      { decision_id: decision4.id, constraint_id: constraint2.id, organization_id: orgId }
    ]);

    console.log(`  ✅ Linked constraints\n`);

    // ========================================================================
    // 7. CREATE DEPENDENCIES
    // ========================================================================
    console.log('🔄 Creating dependencies...');

    await db.from('dependencies').insert([
      {
        source_decision_id: decision2.id,
        target_decision_id: decision1.id,
        dependency_type: 'blocks',
        organization_id: orgId
      },
      {
        source_decision_id: decision4.id,
        target_decision_id: decision1.id,
        dependency_type: 'depends_on',
        organization_id: orgId
      }
    ]);

    console.log(`  ✅ Created decision dependencies\n`);

    // ========================================================================
    // 8. CREATE VERSION HISTORY BY MAKING CHANGES
    // ========================================================================
    console.log('📝 Creating version history...');

    // Update decision 1 title
    await db.from('decisions')
      .update({ 
        title: 'Migrate to Event-Driven Microservices',
        modified_at: new Date().toISOString(),
        modified_by: userId
      })
      .eq('id', decision1.id);

    await db.rpc('create_decision_version', {
      p_decision_id: decision1.id,
      p_change_type: 'field_updated',
      p_change_summary: 'Updated title',
      p_changed_fields: ['title'],
      p_changed_by: userId
    });

    // Update decision 1 description and category
    await db.from('decisions')
      .update({ 
        description: 'Split monolith into event-driven microservices using message queues',
        category: 'Architecture - Event Driven',
        modified_at: new Date(Date.now() + 5000).toISOString(),
        modified_by: userId
      })
      .eq('id', decision1.id);

    await db.rpc('create_decision_version', {
      p_decision_id: decision1.id,
      p_change_type: 'field_updated',
      p_change_summary: 'Updated description and category',
      p_changed_fields: ['description', 'category'],
      p_changed_by: userId
    });

    console.log(`  ✅ Created 2 version snapshots\n`);

    // ========================================================================
    // 9. CREATE EVALUATION HISTORY
    // ========================================================================
    console.log('📊 Creating evaluation history...');

    await db.from('evaluation_history').insert([
      {
        decision_id: decision1.id,
        old_lifecycle: 'STABLE',
        new_lifecycle: 'STABLE',
        old_health_signal: 100,
        new_health_signal: 95,
        previous_health_signal: 100,
        change_explanation: 'Minor health decrease due to conflicting assumptions about deployment complexity',
        triggered_by: 'assumption_change',
        organization_id: orgId,
        evaluated_at: new Date().toISOString()
      },
      {
        decision_id: decision1.id,
        old_lifecycle: 'STABLE',
        new_lifecycle: 'UNDER_REVIEW',
        old_health_signal: 95,
        new_health_signal: 75,
        previous_health_signal: 95,
        change_explanation: 'Health dropped due to unresolved assumption conflict',
        triggered_by: 'manual_review',
        organization_id: orgId,
        evaluated_at: new Date(Date.now() + 10000).toISOString()
      }
    ]);

    console.log(`  ✅ Created evaluation history with explanations\n`);

    // ========================================================================
    // 10. SIMULATE ASSUMPTION LINKING/UNLINKING
    // ========================================================================
    console.log('🔄 Simulating assumption changes...');

    // Unlink one assumption
    await db.from('decision_assumptions')
      .delete()
      .eq('decision_id', decision1.id)
      .eq('assumption_id', assumption2.id);

    await db.rpc('track_relation_change', {
      p_decision_id: decision1.id,
      p_relation_type: 'assumption',
      p_relation_id: assumption2.id,
      p_action: 'unlinked',
      p_relation_description: assumption2.description,
      p_changed_by: userId,
      p_reason: 'Infrastructure assumption no longer relevant after architecture change'
    });

    // Link it back
    await db.from('decision_assumptions').insert({
      decision_id: decision1.id,
      assumption_id: assumption2.id,
      organization_id: orgId
    });

    await db.rpc('track_relation_change', {
      p_decision_id: decision1.id,
      p_relation_type: 'assumption',
      p_relation_id: assumption2.id,
      p_action: 'linked',
      p_relation_description: assumption2.description,
      p_changed_by: userId,
      p_reason: 'Re-linked after confirming infrastructure compatibility'
    });

    console.log(`  ✅ Created relation change history\n`);

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('✨ Test data population complete!\n');
    console.log('📋 Summary:');
    console.log(`   - 4 decisions created`);
    console.log(`   - 6 assumptions (2 conflicting)`);
    console.log(`   - 1 assumption conflict detected`);
    console.log(`   - 2 constraints`);
    console.log(`   - 2 dependencies`);
    console.log(`   - 3 decision versions`);
    console.log(`   - 2 evaluation history entries`);
    console.log(`   - 4 relation changes`);
    console.log('\n🎯 Now you can test:');
    console.log(`   - Version Control: Check decision "${decision1.title}"`);
    console.log(`   - Conflict Tracing: Check assumptions page for conflict between deployment assumptions`);
    console.log(`   - Relation History: View the Relations tab in version modal`);
    console.log(`   - Health History: View the Health tab to see explanations`);

  } catch (error) {
    console.error('❌ Error populating test data:', error);
    throw error;
  }
}

populateTestData();
