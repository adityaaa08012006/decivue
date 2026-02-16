/**
 * Test Data Seeder for Decision Flow Visualization
 * 
 * Creates comprehensive test data to showcase:
 * - Multiple decisions across different swimlanes (Strategy, Technical, Operations, Compliance)
 * - Dependencies between decisions (arrows/linkages)
 * - Organizational assumptions connected to decisions
 * - Various lifecycle states (Stable, At Risk, Under Review, Invalidated)
 * - Different health signals
 * 
 * Usage:
 *   node scripts/seed-decision-flow-test-data.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load .env from backend directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seedTestData() {
  console.log('🌱 Starting Decision Flow Test Data Seeding...\n');

  try {
    // Get the first organization (or use a specific one)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ No organization found. Please create an organization first.');
      return;
    }

    const organizationId = orgs[0].id;
    console.log(`✅ Using organization: ${organizationId}\n`);

    // Get the first user for created_by
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    const userId = users && users.length > 0 ? users[0].id : null;

    // ========================================
    // 0. CLEANUP EXISTING TEST DATA
    // ========================================
    console.log('🧹 Cleaning up existing test data...');
    
    // Delete existing decisions with test titles (they have cascading deletes)
    const testTitles = [
      'Adopt Cloud-First Strategy',
      'Expand to European Market',
      'Implement Microservices Architecture',
      'Adopt Kubernetes for Container Orchestration',
      'Implement CI/CD Pipeline',
      'Establish 24/7 Support Team',
      'Implement Monitoring and Alerting',
      'Achieve GDPR Compliance',
      'Implement SOC 2 Type II',
      'Reduce Cloud Infrastructure Costs',
    ];
    
    const { error: deleteDecisionsError } = await supabase
      .from('decisions')
      .delete()
      .in('title', testTitles)
      .eq('organization_id', organizationId);

    if (deleteDecisionsError) {
      console.log('⚠️  Could not delete old test decisions (may not exist):', deleteDecisionsError.message);
    }

    // Delete test assumptions
    const testAssumptionPhrases = [
      'AWS will maintain current pricing',
      'Engineering team can scale to 50 developers',
      'GDPR regulations will remain stable',
      'Customer demand supports 15% YoY growth',
      'Kubernetes learning curve is manageable',
    ];
    
    for (const phrase of testAssumptionPhrases) {
      await supabase
        .from('assumptions')
        .delete()
        .ilike('description', `%${phrase}%`)
        .eq('organization_id', organizationId);
    }

    console.log('✅ Cleanup complete\n');

    // ========================================
    // 1. CREATE DECISIONS
    // ========================================
    console.log('📋 Creating test decisions...');

    const decisions = [
      // STRATEGY SWIMLANE
      {
        title: 'Adopt Cloud-First Strategy',
        description: 'Migrate all infrastructure to cloud providers for better scalability',
        lifecycle: 'STABLE',
        health_signal: 95,
        metadata: { category: 'Strategy' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Expand to European Market',
        description: 'Strategic expansion into EU region by Q3 2026',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 75,
        metadata: { category: 'Strategy' },
        organization_id: organizationId,
        created_by: userId,
      },

      // TECHNICAL SWIMLANE
      {
        title: 'Implement Microservices Architecture',
        description: 'Break down monolith into microservices for better maintainability',
        lifecycle: 'STABLE',
        health_signal: 85,
        metadata: { category: 'Technical' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Adopt Kubernetes for Container Orchestration',
        description: 'Deploy K8s cluster for managing containerized applications',
        lifecycle: 'AT_RISK',
        health_signal: 45,
        metadata: { category: 'Technical' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement CI/CD Pipeline',
        description: 'Automated testing and deployment workflow',
        lifecycle: 'STABLE',
        health_signal: 90,
        metadata: { category: 'Technical' },
        organization_id: organizationId,
        created_by: userId,
      },

      // OPERATIONS SWIMLANE
      {
        title: 'Establish 24/7 Support Team',
        description: 'Build global support team for enterprise customers',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 70,
        metadata: { category: 'Operations' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement Monitoring and Alerting',
        description: 'Real-time system monitoring with automated alerts',
        lifecycle: 'STABLE',
        health_signal: 88,
        metadata: { category: 'Operations' },
        organization_id: organizationId,
        created_by: userId,
      },

      // COMPLIANCE SWIMLANE
      {
        title: 'Achieve GDPR Compliance',
        description: 'Full compliance with EU data protection regulations',
        lifecycle: 'AT_RISK',
        health_signal: 40,
        metadata: { category: 'Compliance' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement SOC 2 Type II',
        description: 'Security and compliance certification for enterprise sales',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 65,
        metadata: { category: 'Compliance' },
        organization_id: organizationId,
        created_by: userId,
      },

      // FINANCIAL SWIMLANE
      {
        title: 'Reduce Cloud Infrastructure Costs',
        description: 'Optimize cloud spending by 30% through better resource allocation',
        lifecycle: 'STABLE',
        health_signal: 80,
        metadata: { category: 'Financial' },
        organization_id: organizationId,
        created_by: userId,
      },
    ];

    const { data: createdDecisions, error: decisionsError } = await supabase
      .from('decisions')
      .insert(decisions)
      .select();

    if (decisionsError) {
      console.error('❌ Error creating decisions:', decisionsError);
      return;
    }

    console.log(`✅ Created ${createdDecisions.length} decisions\n`);

    // Map decisions by title for easy reference
    const decisionMap = {};
    createdDecisions.forEach(d => {
      decisionMap[d.title] = d;
    });

    // ========================================
    // 2. CREATE DEPENDENCIES (Linkages!)
    // ========================================
    console.log('🔗 Creating decision dependencies...');

    const dependencies = [
      // Cloud strategy must come before microservices
      {
        source_decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        target_decision_id: decisionMap['Implement Microservices Architecture'].id,
        organization_id: organizationId,
      },
      // Microservices before Kubernetes
      {
        source_decision_id: decisionMap['Implement Microservices Architecture'].id,
        target_decision_id: decisionMap['Adopt Kubernetes for Container Orchestration'].id,
        organization_id: organizationId,
      },
      // Kubernetes before monitoring
      {
        source_decision_id: decisionMap['Adopt Kubernetes for Container Orchestration'].id,
        target_decision_id: decisionMap['Implement Monitoring and Alerting'].id,
        organization_id: organizationId,
      },
      // CI/CD depends on microservices
      {
        source_decision_id: decisionMap['Implement Microservices Architecture'].id,
        target_decision_id: decisionMap['Implement CI/CD Pipeline'].id,
        organization_id: organizationId,
      },
      // European expansion depends on GDPR
      {
        source_decision_id: decisionMap['Achieve GDPR Compliance'].id,
        target_decision_id: decisionMap['Expand to European Market'].id,
        organization_id: organizationId,
      },
      // Support team depends on monitoring
      {
        source_decision_id: decisionMap['Implement Monitoring and Alerting'].id,
        target_decision_id: decisionMap['Establish 24/7 Support Team'].id,
        organization_id: organizationId,
      },
      // SOC 2 depends on monitoring
      {
        source_decision_id: decisionMap['Implement Monitoring and Alerting'].id,
        target_decision_id: decisionMap['Implement SOC 2 Type II'].id,
        organization_id: organizationId,
      },
      // Cost reduction depends on cloud strategy
      {
        source_decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        target_decision_id: decisionMap['Reduce Cloud Infrastructure Costs'].id,
        organization_id: organizationId,
      },
    ];

    const { data: createdDeps, error: depsError } = await supabase
      .from('dependencies')
      .insert(dependencies)
      .select();

    if (depsError) {
      console.error('❌ Error creating dependencies:', depsError);
      return;
    }

    console.log(`✅ Created ${createdDeps.length} decision dependencies\n`);

    // ========================================
    // 3. CREATE ORGANIZATIONAL ASSUMPTIONS
    // ========================================
    console.log('💡 Creating organizational assumptions...');

    const assumptions = [
      {
        description: 'AWS will maintain current pricing for next 12 months',
        status: 'VALID',
        scope: 'UNIVERSAL',
        organization_id: organizationId,
        metadata: { category: 'Technical' },
      },
      {
        description: 'Engineering team can scale to 50 developers by Q4',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        organization_id: organizationId,
        metadata: { category: 'Operations' },
      },
      {
        description: 'GDPR regulations will remain stable through 2026',
        status: 'VALID',
        scope: 'UNIVERSAL',
        organization_id: organizationId,
        metadata: { category: 'Compliance' },
      },
      {
        description: 'Customer demand supports 15% YoY growth',
        status: 'VALID',
        scope: 'UNIVERSAL',
        organization_id: organizationId,
        metadata: { category: 'Strategy' },
      },
      {
        description: 'Kubernetes learning curve is manageable for team',
        status: 'BROKEN',
        scope: 'UNIVERSAL',
        organization_id: organizationId,
        metadata: { category: 'Technical' },
      },
    ];

    const { data: createdAssumptions, error: assumptionsError } = await supabase
      .from('assumptions')
      .insert(assumptions)
      .select();

    if (assumptionsError) {
      console.error('❌ Error creating assumptions:', assumptionsError);
      return;
    }

    console.log(`✅ Created ${createdAssumptions.length} organizational assumptions\n`);

    // ========================================
    // 4. LINK ASSUMPTIONS TO DECISIONS
    // ========================================
    console.log('🔗 Linking assumptions to decisions...');

    const assumptionLinks = [
      // AWS pricing assumption -> cloud-related decisions
      {
        decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        assumption_id: createdAssumptions[0].id, // AWS pricing
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Reduce Cloud Infrastructure Costs'].id,
        assumption_id: createdAssumptions[0].id, // AWS pricing
        organization_id: organizationId,
      },
      // Team scaling assumption -> technical decisions
      {
        decision_id: decisionMap['Implement Microservices Architecture'].id,
        assumption_id: createdAssumptions[1].id, // Team scaling
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Implement CI/CD Pipeline'].id,
        assumption_id: createdAssumptions[1].id, // Team scaling
        organization_id: organizationId,
      },
      // GDPR assumption -> compliance decisions
      {
        decision_id: decisionMap['Achieve GDPR Compliance'].id,
        assumption_id: createdAssumptions[2].id, // GDPR regulations
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Expand to European Market'].id,
        assumption_id: createdAssumptions[2].id, // GDPR regulations
        organization_id: organizationId,
      },
      // Growth assumption -> strategy decisions
      {
        decision_id: decisionMap['Expand to European Market'].id,
        assumption_id: createdAssumptions[3].id, // Customer demand
        organization_id: organizationId,
      },
      // K8s learning curve -> K8s decision (BROKEN - causes AT_RISK status)
      {
        decision_id: decisionMap['Adopt Kubernetes for Container Orchestration'].id,
        assumption_id: createdAssumptions[4].id, // K8s learning curve (BROKEN)
        organization_id: organizationId,
      },
    ];

    const { data: createdLinks, error: linksError } = await supabase
      .from('decision_assumptions')
      .insert(assumptionLinks)
      .select();

    if (linksError) {
      console.error('❌ Error linking assumptions:', linksError);
      return;
    }

    console.log(`✅ Linked ${createdLinks.length} assumptions to decisions\n`);

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n🎉 Test Data Seeding Complete!\n');
    console.log('📊 Summary:');
    console.log(`   ✅ ${createdDecisions.length} decisions created`);
    console.log(`   ✅ ${createdDeps.length} dependencies created`);
    console.log(`   ✅ ${createdAssumptions.length} assumptions created`);
    console.log(`   ✅ ${createdLinks.length} assumption-decision links created\n`);

    console.log('🎯 What you\'ll see in Decision Flow:');
    console.log('   🟦 Strategy swimlane: 2 decisions');
    console.log('   🟪 Technical swimlane: 3 decisions');
    console.log('   🔷 Operations swimlane: 2 decisions');
    console.log('   🟩 Compliance swimlane: 2 decisions');
    console.log('   🟧 Financial swimlane: 1 decision');
    console.log('   🔗 8 dependencies (arrows showing flow)');
    console.log('   💡 5 org assumptions (purple circles on left)');
    console.log('   🔴 2 decisions "At Risk" with glowing borders!\n');

    console.log('🚀 Now open your app and navigate to "Decision Flow" to see the magic!\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the seeder
seedTestData().then(() => {
  console.log('✅ Seeding completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Seeding failed:', error);
  process.exit(1);
});
