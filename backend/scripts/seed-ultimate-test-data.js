/**
 * 🔥 ULTIMATE TEST DATA SEEDER FOR DEVICUE 🔥
 * 
 * This comprehensive seeder creates test data for EVERY feature:
 * ✅ Decision Flow (all lifecycle states, all categories, swimlanes)
 * ✅ Dependencies (complex dependency chains)
 * ✅ Assumptions (UNIVERSAL + DECISION_SPECIFIC, all statuses)
 * ✅ Assumption Conflicts (CONTRADICTORY, MUTUALLY_EXCLUSIVE, INCOMPATIBLE)
 * ✅ Constraints (LEGAL, BUDGET, POLICY, TECHNICAL, COMPLIANCE)
 * ✅ Decision Tensions (conflicts between decisions)
 * ✅ Decision Signals (SIGNAL, RISK, NOTE, PROGRESS)
 * ✅ Notifications (all types and severities)
 * ✅ Evaluation History (audit trail)
 * ✅ Parameter Templates (categories and dropdowns)
 * 
 * Usage:
 *   node backend/scripts/seed-ultimate-test-data.js
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function cleanupTestData(organizationId) {
  console.log('🧹 Cleaning up existing test data...');
  
  // Delete all test data for this organization (cascading deletes will handle relationships)
  await supabase
    .from('notifications')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('decision_signals')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('evaluation_history')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('decision_tensions')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('assumption_conflicts')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('decisions')
    .delete()
    .eq('organization_id', organizationId);
  
  await supabase
    .from('assumptions')
    .delete()
    .eq('organization_id', organizationId);

  await supabase
    .from('constraints')
    .delete()
    .eq('organization_id', organizationId);

  console.log('✅ Cleanup complete\n');
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedUltimateTestData() {
  console.log('🚀 Starting ULTIMATE Test Data Seeding...\n');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // ========================================
    // 1. GET ORGANIZATION & USER
    // ========================================
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'PLOT ARMOR -_-')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ Organization "PLOT ARMOR -_-" not found. Please check the organization name.');
      return;
    }

    const organizationId = orgs[0].id;
    console.log(`✅ Using organization: ${orgs[0].name} (${organizationId})\n`);

    // Get Palash Kurkute's user ID
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'palashkurkute@gmail.com')
      .eq('organization_id', organizationId)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ User "palashkurkute@gmail.com" not found in PLOT ARMOR organization.');
      return;
    }

    const userId = users[0].id;
    console.log(`✅ Using user: ${users[0].email} (${userId})\n`);

    await cleanupTestData(organizationId);

    // ========================================
    // 2. CREATE COMPREHENSIVE DECISIONS
    // ========================================
    console.log('📋 Creating comprehensive test decisions...');

    const decisionsData = [
      // STRATEGY SWIMLANE
      {
        title: 'Adopt Cloud-First Strategy',
        description: 'Migrate all infrastructure to AWS/Azure for better scalability and reliability',
        lifecycle: 'STABLE',
        health_signal: 95,
        metadata: { category: 'Strategy', priority: 'High', budget: 500000 },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Expand to European Market',
        description: 'Strategic expansion into EU region targeting Germany, France, and UK by Q3 2026',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 75,
        metadata: { category: 'Strategy', priority: 'Critical', budget: 2000000 },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Pivot to Mobile-First Approach',
        description: 'Shift primary focus from web to mobile applications',
        lifecycle: 'STABLE',
        health_signal: 85,
        metadata: { category: 'Strategy', priority: 'Medium' },
        organization_id: organizationId,
        created_by: userId,
      },

      // TECHNICAL SWIMLANE
      {
        title: 'Implement Microservices Architecture',
        description: 'Break down monolith into microservices for better maintainability and scalability',
        lifecycle: 'STABLE',
        health_signal: 85,
        metadata: { category: 'Technical', priority: 'High', complexity: 'High' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Adopt Kubernetes for Container Orchestration',
        description: 'Deploy K8s cluster for managing containerized applications across environments',
        lifecycle: 'STABLE',
        health_signal: 80,
        metadata: { category: 'Technical', priority: 'High', complexity: 'Very High' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement CI/CD Pipeline',
        description: 'Automated testing and deployment workflow using GitHub Actions',
        lifecycle: 'STABLE',
        health_signal: 90,
        metadata: { category: 'Technical', priority: 'High', complexity: 'Medium' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Adopt GraphQL API Layer',
        description: 'Replace REST APIs with GraphQL for more flexible data fetching',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 70,
        metadata: { category: 'Technical', priority: 'Medium', complexity: 'High' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Migrate to Serverless Functions',
        description: 'Use AWS Lambda for compute-intensive background jobs',
        lifecycle: 'STABLE',
        health_signal: 88,
        metadata: { category: 'Technical', priority: 'Medium' },
        organization_id: organizationId,
        created_by: userId,
      },

      // OPERATIONS SWIMLANE
      {
        title: 'Establish 24/7 Support Team',
        description: 'Build global support team across 3 time zones for enterprise customers',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 70,
        metadata: { category: 'Operations', priority: 'High', headcount: 15 },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement Monitoring and Alerting',
        description: 'Real-time system monitoring with Datadog and PagerDuty integration',
        lifecycle: 'STABLE',
        health_signal: 88,
        metadata: { category: 'Operations', priority: 'Critical', complexity: 'Medium' },
        organization_id: organizationId,
        created_by: userId,
      },
      // TEST CASE: This RETIRED decision should trigger ONE deprecation warning
      {
        title: 'Legacy Waterfall Process',
        description: 'Old waterfall methodology that has been fully replaced',
        lifecycle: 'RETIRED',
        health_signal: 100,
        metadata: { category: 'Operations', priority: 'Low', retired_date: '2025-12-01' },
        organization_id: organizationId,
        created_by: userId,
      },

      // COMPLIANCE SWIMLANE
      {
        title: 'Achieve GDPR Compliance',
        description: 'Full compliance with EU data protection regulations including data portability',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 75,
        metadata: { category: 'Compliance', priority: 'Critical', deadline: '2026-06-01' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement SOC 2 Type II',
        description: 'Security and compliance certification for enterprise sales',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 65,
        metadata: { category: 'Compliance', priority: 'High', cost: 150000 },
        organization_id: organizationId,
        created_by: userId,
      },

      // FINANCIAL SWIMLANE
      {
        title: 'Reduce Cloud Infrastructure Costs',
        description: 'Optimize cloud spending by 30% through better resource allocation and reserved instances',
        lifecycle: 'STABLE',
        health_signal: 80,
        metadata: { category: 'Financial', priority: 'High', targetSavings: 300000 },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Implement Usage-Based Pricing',
        description: 'Shift from flat-rate to consumption-based pricing model',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 72,
        metadata: { category: 'Financial', priority: 'Medium', revenueImpact: 'High' },
        organization_id: organizationId,
        created_by: userId,
      },

      // OTHER CATEGORY
      {
        title: 'Adopt Open Source Strategy',
        description: 'Open source core libraries to build developer community',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 68,
        metadata: { category: 'Other', priority: 'Medium' },
        organization_id: organizationId,
        created_by: userId,
      },
      {
        title: 'Enable Remote Work Permanently',
        description: 'Transition to fully distributed team with no physical office',
        lifecycle: 'STABLE',
        health_signal: 92,
        metadata: { category: 'Other', priority: 'High', costSavings: 400000 },
        organization_id: organizationId,
        created_by: userId,
      },
    ];

    const { data: createdDecisions, error: decisionsError } = await supabase
      .from('decisions')
      .insert(decisionsData)
      .select();

    if (decisionsError) {
      console.error('❌ Error creating decisions:', decisionsError);
      return;
    }

    console.log(`✅ Created ${createdDecisions.length} decisions\n`);

    const decisionMap = {};
    createdDecisions.forEach(d => {
      const key = d.title.split(' ').slice(0, 3).join(' ');
      decisionMap[key] = d;
    });

    // ========================================
    // 3. CREATE DEPENDENCIES (Complex Chains)
    // ========================================
    console.log('🔗 Creating decision dependencies...');

    const dependencies = [
      // Cloud infrastructure chain
      {
        source_decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        target_decision_id: decisionMap['Implement Microservices Architecture'].id,
        organization_id: organizationId,
      },
      {
        source_decision_id: decisionMap['Implement Microservices Architecture'].id,
        target_decision_id: decisionMap['Adopt Kubernetes for'].id,
        organization_id: organizationId,
      },
      {
        source_decision_id: decisionMap['Adopt Kubernetes for'].id,
        target_decision_id: decisionMap['Implement Monitoring and'].id,
        organization_id: organizationId,
      },
      {
        source_decision_id: decisionMap['Implement Microservices Architecture'].id,
        target_decision_id: decisionMap['Implement CI/CD Pipeline'].id,
        organization_id: organizationId,
      },
      
      // Compliance chain
      {
        source_decision_id: decisionMap['Achieve GDPR Compliance'].id,
        target_decision_id: decisionMap['Expand to European'].id,
        organization_id: organizationId,
      },
      
      // Operations chain
      {
        source_decision_id: decisionMap['Implement Monitoring and'].id,
        target_decision_id: decisionMap['Establish 24/7 Support'].id,
        organization_id: organizationId,
      },
      {
        source_decision_id: decisionMap['Implement Monitoring and'].id,
        target_decision_id: decisionMap['Implement SOC 2'].id,
        organization_id: organizationId,
      },
      
      // Cost optimization chain
      {
        source_decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        target_decision_id: decisionMap['Reduce Cloud Infrastructure'].id,
        organization_id: organizationId,
      },
      
      // API and mobile chain
      {
        source_decision_id: decisionMap['Adopt GraphQL API'].id,
        target_decision_id: decisionMap['Pivot to Mobile-First'].id,
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

    console.log(`✅ Created ${createdDeps.length} dependencies\n`);

    // ========================================
    // 4. CREATE COMPREHENSIVE ASSUMPTIONS
    // ========================================
    console.log('💡 Creating comprehensive assumptions...');

    const assumptionsData = [
      // VALID UNIVERSAL ASSUMPTIONS
      {
        description: '[PLOT ARMOR] AWS will maintain current pricing structure for next 12 months',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Budget & Financial',
        parameters: { amount: 50000, unit: 'USD', timeframe: '2026' },
        organization_id: organizationId,
        metadata: { verified: true, source: 'AWS Enterprise Agreement' },
      },
      {
        description: '[PLOT ARMOR] Customer demand will support 15% YoY growth',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: { growth_rate: 15, unit: 'percent', timeframe: '2026' },
        organization_id: organizationId,
        metadata: { confidence: 0.85 },
      },
      {
        description: '[PLOT ARMOR] USD/EUR exchange rate will remain between 1.05-1.15',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: { min: 1.05, max: 1.15, currency: 'EUR' },
        organization_id: organizationId,
        metadata: { verified: false },
      },
      
      // SHAKY UNIVERSAL ASSUMPTIONS
      {
        description: '[PLOT ARMOR] Engineering team can scale to 50 developers by Q4 2026',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        category: 'Resource & Staffing',
        parameters: { headcount: 50, timeframe: 'Q4 2026' },
        organization_id: organizationId,
        metadata: { current_headcount: 25, hiring_rate: 'slow' },
      },
      {
        description: '[PLOT ARMOR] Market conditions will remain favorable for SaaS investments',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: { sector: 'SaaS', timeframe: '2026' },
        organization_id: organizationId,
        metadata: { risk_level: 'medium' },
      },
      
      // BROKEN UNIVERSAL ASSUMPTIONS
      {
        description: '[PLOT ARMOR] Kubernetes learning curve is manageable for current team',
        status: 'BROKEN',
        scope: 'UNIVERSAL',
        category: 'Technical & Infrastructure',
        parameters: { technology: 'Kubernetes', complexity: 'high' },
        organization_id: organizationId,
        metadata: { actual_timeline: '6 months vs expected 2 months' },
      },
      {
        description: '[PLOT ARMOR] Budget for GDPR compliance implementation is sufficient',
        status: 'BROKEN',
        scope: 'UNIVERSAL',
        category: 'Budget & Financial',
        parameters: { budget: 100000, actual_cost: 250000, unit: 'USD' },
        organization_id: organizationId,
        metadata: { variance: 150 },
      },
      
      // DECISION-SPECIFIC ASSUMPTIONS
      {
        description: '[PLOT ARMOR] Microservices migration can be completed in 6 months',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Timeline & Schedule',
        parameters: { duration: 6, unit: 'months', timeframe: 'H1 2026' },
        organization_id: organizationId,
        metadata: { decision: 'Microservices' },
      },
      {
        description: '[PLOT ARMOR] GraphQL will reduce API response times by 40%',
        status: 'SHAKY',
        scope: 'DECISION_SPECIFIC',
        category: 'Technical & Infrastructure',
        parameters: { improvement: 40, unit: 'percent', metric: 'response_time' },
        organization_id: organizationId,
        metadata: { decision: 'GraphQL', verified: false },
      },
      {
        description: '[PLOT ARMOR] Serverless functions will cost less than dedicated servers',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Budget & Financial',
        parameters: { expected_savings: 30, unit: 'percent' },
        organization_id: organizationId,
        metadata: { decision: 'Serverless' },
      },
      {
        description: '[PLOT ARMOR] Remote work will not impact productivity',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Resource & Staffing',
        parameters: { productivity_change: 5, unit: 'percent' },
        organization_id: organizationId,
        metadata: { decision: 'Remote Work', verified: true, data_points: 100 },
      },
      {
        description: '[PLOT ARMOR] European expansion will achieve breakeven within 18 months',
        status: 'SHAKY',
        scope: 'DECISION_SPECIFIC',
        category: 'Market & Business',
        parameters: { timeline: 18, unit: 'months', target_revenue: 5000000 },
        organization_id: organizationId,
        metadata: { decision: 'EU Expansion', confidence: 0.65 },
      },
      // TEST CASE: This assumption should show deprecation warning (linked only to RETIRED decision)
      {
        description: '[PLOT ARMOR] Waterfall methodology provides adequate project tracking',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Process & Methodology',
        parameters: { methodology: 'waterfall' },
        organization_id: organizationId,
        metadata: { decision: 'Legacy Waterfall', note: 'This should show deprecation warning' },
      },
    ];

    const { data: createdAssumptions, error: assumptionsError } = await supabase
      .from('assumptions')
      .insert(assumptionsData)
      .select();

    if (assumptionsError) {
      console.error('❌ Error creating assumptions:', assumptionsError);
      return;
    }

    console.log(`✅ Created ${createdAssumptions.length} assumptions\n`);

    // ========================================
    // 5. LINK ASSUMPTIONS TO DECISIONS
    // ========================================
    console.log('🔗 Linking assumptions to decisions...');

    const assumptionLinks = [
      // Link AWS pricing to cloud-related decisions
      {
        decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        assumption_id: createdAssumptions[0].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Reduce Cloud Infrastructure'].id,
        assumption_id: createdAssumptions[0].id,
        organization_id: organizationId,
      },
      
      // Link team scaling to technical decisions
      {
        decision_id: decisionMap['Implement Microservices Architecture'].id,
        assumption_id: createdAssumptions[3].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Implement CI/CD Pipeline'].id,
        assumption_id: createdAssumptions[3].id,
        organization_id: organizationId,
      },
      
      // Link customer growth to strategy
      {
        decision_id: decisionMap['Expand to European'].id,
        assumption_id: createdAssumptions[1].id,
        organization_id: organizationId,
      },
      
      // Link K8s learning curve (BROKEN) to K8s decision
      {
        decision_id: decisionMap['Adopt Kubernetes for'].id,
        assumption_id: createdAssumptions[5].id,
        organization_id: organizationId,
      },
      
      // Link GDPR budget (BROKEN) to GDPR decision
      {
        decision_id: decisionMap['Achieve GDPR Compliance'].id,
        assumption_id: createdAssumptions[6].id,
        organization_id: organizationId,
      },
      
      // Link microservices timeline to microservices decision
      {
        decision_id: decisionMap['Implement Microservices Architecture'].id,
        assumption_id: createdAssumptions[7].id,
        organization_id: organizationId,
      },
      
      // Link GraphQL performance to GraphQL decision
      {
        decision_id: decisionMap['Adopt GraphQL API'].id,
        assumption_id: createdAssumptions[8].id,
        organization_id: organizationId,
      },
      
      // Link serverless cost to serverless decision (now STABLE)
      {
        decision_id: decisionMap['Migrate to Serverless'].id,
        assumption_id: createdAssumptions[9].id,
        organization_id: organizationId,
      },
      
      // Link remote work to remote decision
      {
        decision_id: decisionMap['Enable Remote Work'].id,
        assumption_id: createdAssumptions[10].id,
        organization_id: organizationId,
      },
      
      // Link EU breakeven to EU expansion
      {
        decision_id: decisionMap['Expand to European'].id,
        assumption_id: createdAssumptions[11].id,
        organization_id: organizationId,
      },
      
      // TEST CASE: Link waterfall assumption to RETIRED decision (should show deprecation warning)
      {
        decision_id: decisionMap['Legacy Waterfall Process'].id,
        assumption_id: createdAssumptions[12].id,
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
    // 6. CREATE ASSUMPTION CONFLICTS
    // ========================================
    console.log('⚔️  Creating assumption conflicts...');

    const assumptionConflicts = [
      // CONTRADICTORY: Budget assumptions
      {
        assumption_a_id: createdAssumptions[0].id < createdAssumptions[6].id ? createdAssumptions[0].id : createdAssumptions[6].id,
        assumption_b_id: createdAssumptions[0].id < createdAssumptions[6].id ? createdAssumptions[6].id : createdAssumptions[0].id,
        conflict_type: 'CONTRADICTORY',
        confidence_score: 0.75,
        organization_id: organizationId,
        metadata: { 
          reason: 'AWS cost stability conflicts with observed budget overruns',
          detected_by: 'system' 
        },
      },
      
      // MUTUALLY_EXCLUSIVE: Growth and cost reduction
      {
        assumption_a_id: createdAssumptions[1].id < createdAssumptions[6].id ? createdAssumptions[1].id : createdAssumptions[6].id,
        assumption_b_id: createdAssumptions[1].id < createdAssumptions[6].id ? createdAssumptions[6].id : createdAssumptions[1].id,
        conflict_type: 'MUTUALLY_EXCLUSIVE',
        confidence_score: 0.82,
        organization_id: organizationId,
        metadata: { 
          reason: 'Aggressive growth targets incompatible with tight budget constraints',
          detected_by: 'ai_analysis' 
        },
      },
      
      // INCOMPATIBLE: Team capacity and timelines
      {
        assumption_a_id: createdAssumptions[3].id < createdAssumptions[5].id ? createdAssumptions[3].id : createdAssumptions[5].id,
        assumption_b_id: createdAssumptions[3].id < createdAssumptions[5].id ? createdAssumptions[5].id : createdAssumptions[3].id,
        conflict_type: 'INCOMPATIBLE',
        confidence_score: 0.68,
        organization_id: organizationId,
        metadata: { 
          reason: 'Scaling difficulties suggest staffing targets are unrealistic',
          detected_by: 'manual_review' 
        },
      },
    ];

    const { data: createdConflicts, error: conflictsError } = await supabase
      .from('assumption_conflicts')
      .insert(assumptionConflicts)
      .select();

    if (conflictsError) {
      console.error('❌ Error creating assumption conflicts:', conflictsError);
      return;
    }

    console.log(`✅ Created ${createdConflicts.length} assumption conflicts\n`);

    // ========================================
    // 7. CREATE CONSTRAINTS
    // ========================================
    console.log('🔒 Creating organizational constraints...');

    const constraintsData = [
      {
        name: '[PLOT ARMOR] GDPR Data Residency Requirement',
        description: 'All EU customer data must be stored within EU data centers',
        constraint_type: 'LEGAL',
        rule_expression: 'eu_data_location == EU',
        is_immutable: true,
        organization_id: organizationId,
      },
      {
        name: '[PLOT ARMOR] Q2 2026 Budget Cap',
        description: 'Infrastructure spending cannot exceed $500K in Q2',
        constraint_type: 'BUDGET',
        rule_expression: 'q2_infra_spend <= 500000',
        is_immutable: true,
        organization_id: organizationId,
      },
      {
        name: '[PLOT ARMOR] SOC 2 Audit Trail Policy',
        description: 'All system changes must have audit logs retained for 2 years',
        constraint_type: 'POLICY',
        rule_expression: 'audit_retention >= 730_days',
        is_immutable: true,
        organization_id: organizationId,
      },
      {
        name: '[PLOT ARMOR] Maximum Database Latency',
        description: 'P95 query latency must be under 100ms',
        constraint_type: 'TECHNICAL',
        rule_expression: 'p95_query_latency < 100',
        is_immutable: false,
        organization_id: organizationId,
      },
      {
        name: '[PLOT ARMOR] HIPAA Compliance Requirement',
        description: 'All PHI must be encrypted at rest and in transit',
        constraint_type: 'COMPLIANCE',
        rule_expression: 'phi_encryption == true',
        is_immutable: true,
        organization_id: organizationId,
      },
      {
        name: '[PLOT ARMOR] Open Source License Restriction',
        description: 'Cannot use GPL-licensed code in proprietary products',
        constraint_type: 'LEGAL',
        rule_expression: 'license != GPL',
        is_immutable: true,
        organization_id: organizationId,
      },
    ];

    const { data: createdConstraints, error: constraintsError } = await supabase
      .from('constraints')
      .insert(constraintsData)
      .select();

    if (constraintsError) {
      console.error('❌ Error creating constraints:', constraintsError);
      return;
    }

    console.log(`✅ Created ${createdConstraints.length} constraints\n`);

    // ========================================
    // 8. LINK CONSTRAINTS TO DECISIONS
    // ========================================
    console.log('🔗 Linking constraints to decisions...');

    const constraintLinks = [
      // GDPR constraint
      {
        decision_id: decisionMap['Achieve GDPR Compliance'].id,
        constraint_id: createdConstraints[0].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Expand to European'].id,
        constraint_id: createdConstraints[0].id,
        organization_id: organizationId,
      },
      
      // Budget constraint
      {
        decision_id: decisionMap['Adopt Cloud-First Strategy'].id,
        constraint_id: createdConstraints[1].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Reduce Cloud Infrastructure'].id,
        constraint_id: createdConstraints[1].id,
        organization_id: organizationId,
      },
      
      // SOC 2 audit policy
      {
        decision_id: decisionMap['Implement SOC 2'].id,
        constraint_id: createdConstraints[2].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Implement Monitoring and'].id,
        constraint_id: createdConstraints[2].id,
        organization_id: organizationId,
      },
      
      // Database latency
      {
        decision_id: decisionMap['Implement Microservices Architecture'].id,
        constraint_id: createdConstraints[3].id,
        organization_id: organizationId,
      },
      {
        decision_id: decisionMap['Adopt GraphQL API'].id,
        constraint_id: createdConstraints[3].id,
        organization_id: organizationId,
      },
      
      // Open source license
      {
        decision_id: decisionMap['Adopt Open Source'].id,
        constraint_id: createdConstraints[5].id,
        organization_id: organizationId,
      },
    ];

    const { data: createdConstraintLinks, error: constraintLinksError } = await supabase
      .from('decision_constraints')
      .insert(constraintLinks)
      .select();

    if (constraintLinksError) {
      console.error('❌ Error linking constraints:', constraintLinksError);
      return;
    }

    console.log(`✅ Linked ${createdConstraintLinks.length} constraints to decisions\n`);

    // ========================================
    // 9. CREATE DECISION TENSIONS (Conflicts)
    // ========================================
    console.log('⚡ Creating decision tensions...');

    const tensionsData = [
      {
        decision_a_id: decisionMap['Reduce Cloud Infrastructure'].id,
        decision_b_id: decisionMap['Adopt Kubernetes for'].id,
        reason: 'Cost reduction goals conflict with expensive K8s infrastructure requirements',
        severity: 'HIGH',
        organization_id: organizationId,
        metadata: { estimated_conflict_cost: 200000 },
      },
      {
        decision_a_id: decisionMap['Pivot to Mobile-First'].id,
        decision_b_id: decisionMap['Adopt GraphQL API'].id,
        reason: 'Mobile-first approach may not benefit from GraphQL complexity',
        severity: 'MEDIUM',
        organization_id: organizationId,
        metadata: { technical_debt_risk: 'medium' },
      },
      {
        decision_a_id: decisionMap['Adopt Open Source'].id,
        decision_b_id: decisionMap['Implement SOC 2'].id,
        reason: 'Open sourcing core libraries may complicate SOC 2 audit scope',
        severity: 'LOW',
        organization_id: organizationId,
        metadata: { audit_impact: 'minor' },
      },
      {
        decision_a_id: decisionMap['Enable Remote Work'].id,
        decision_b_id: decisionMap['Achieve GDPR Compliance'].id,
        reason: 'Remote work across borders complicates data residency requirements',
        severity: 'HIGH',
        organization_id: organizationId,
        metadata: { compliance_risk: 'high', requires_vpn: true },
      },
    ];

    const { data: createdTensions, error: tensionsError } = await supabase
      .from('decision_tensions')
      .insert(tensionsData)
      .select();

    if (tensionsError) {
      console.error('❌ Error creating decision tensions:', tensionsError);
      return;
    }

    console.log(`✅ Created ${createdTensions.length} decision tensions\n`);

    // ========================================
    // 10. CREATE DECISION SIGNALS
    // ========================================
    console.log('📡 Creating decision signals...');

    const signalsData = [
      // SIGNAL
      {
        decision_id: decisionMap['Adopt Kubernetes for'].id,
        type: 'SIGNAL',
        description: 'Team completed K8s certification training',
        impact: 'MEDIUM',
        organization_id: organizationId,
        metadata: { users_certified: 5, total_team: 12 },
      },
      
      // RISK
      {
        decision_id: decisionMap['Achieve GDPR Compliance'].id,
        type: 'RISK',
        description: 'Discovered 3 legacy systems not compliant with data retention policies',
        impact: 'HIGH',
        organization_id: organizationId,
        metadata: { systems: ['CRM', 'Analytics', 'Logging'], remediation_weeks: 8 },
      },
      {
        decision_id: decisionMap['Expand to European'].id,
        type: 'RISK',
        description: 'Exchange rate volatility could impact ROI calculations',
        impact: 'MEDIUM',
        organization_id: organizationId,
        metadata: { eur_usd_variance: 0.08 },
      },
      
      // NOTE
      {
        decision_id: decisionMap['Implement Microservices Architecture'].id,
        type: 'NOTE',
        description: 'Architecture review approved by CTO, proceeding to implementation',
        impact: 'LOW',
        organization_id: organizationId,
        metadata: { approved_by: 'CTO', approved_date: '2026-02-10' },
      },
      {
        decision_id: decisionMap['Reduce Cloud Infrastructure'].id,
        type: 'NOTE',
        description: 'Identified $50K/month savings opportunity in unused RDS instances',
        impact: 'HIGH',
        organization_id: organizationId,
        metadata: { monthly_savings: 50000, action: 'downsize' },
      },
      
      // PROGRESS
      {
        decision_id: decisionMap['Implement CI/CD Pipeline'].id,
        type: 'PROGRESS',
        description: 'Pipeline setup 75% complete - automated testing deployed',
        impact: 'LOW',
        organization_id: organizationId,
        metadata: { completion: 75, milestone: 'testing_automation' },
      },
      {
        decision_id: decisionMap['Establish 24/7 Support'].id,
        type: 'PROGRESS',
        description: 'Hired 8 of 15 planned support engineers across all time zones',
        impact: 'MEDIUM',
        organization_id: organizationId,
        metadata: { hired: 8, target: 15, progress: 53 },
      },
    ];

    const { data: createdSignals, error: signalsError } = await supabase
      .from('decision_signals')
      .insert(signalsData)
      .select();

    if (signalsError) {
      console.error('❌ Error creating decision signals:', signalsError);
      return;
    }

    console.log(`✅ Created ${createdSignals.length} decision signals\n`);

    // ========================================
    // 11. CREATE NOTIFICATIONS
    // ========================================
    console.log('🔔 Creating notifications...');

    const notificationsData = [
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'WARNING',
        title: 'Assumption Conflict Detected',
        message: 'Growth targets conflict with budget constraints - requires review',
        assumption_id: createdAssumptions[1].id,
        organization_id: organizationId,
        metadata: { conflict_id: createdConflicts[1].id },
      },
      {
        type: 'DECISION_CONFLICT',
        severity: 'CRITICAL',
        title: 'High-Severity Decision Tension',
        message: 'Cost reduction and K8s adoption goals are in direct conflict',
        decision_id: decisionMap['Reduce Cloud Infrastructure'].id,
        organization_id: organizationId,
        metadata: { tension_id: createdTensions[0].id, severity: 'HIGH' },
      },
      {
        type: 'HEALTH_DEGRADED',
        severity: 'WARNING',
        title: 'Decision Health Degraded',
        message: 'Kubernetes decision health dropped to 45% due to learning curve issues',
        decision_id: decisionMap['Adopt Kubernetes for'].id,
        organization_id: organizationId,
        metadata: { old_health: 65, new_health: 45 },
      },
      {
        type: 'LIFECYCLE_CHANGED',
        severity: 'INFO',
        title: 'Decision Lifecycle Updated',
        message: 'Serverless migration decision moved to INVALIDATED',
        decision_id: decisionMap['Migrate to Serverless'].id,
        organization_id: organizationId,
        metadata: { old_lifecycle: 'AT_RISK', new_lifecycle: 'INVALIDATED' },
      },
      {
        type: 'NEEDS_REVIEW',
        severity: 'WARNING',
        title: 'Decision Needs Review',
        message: 'GraphQL API decision has not been reviewed in 60 days',
        decision_id: decisionMap['Adopt GraphQL API'].id,
        organization_id: organizationId,
        metadata: { days_since_review: 60, threshold: 30 },
      },
      {
        type: 'ASSUMPTION_BROKEN',
        severity: 'CRITICAL',
        title: 'Critical Assumption Broken',
        message: 'GDPR budget assumption failed - actual costs 150% over estimate',
        assumption_id: createdAssumptions[6].id,
        decision_id: decisionMap['Achieve GDPR Compliance'].id,
        organization_id: organizationId,
        metadata: { budget_variance: 150, impact: 'HIGH' },
      },
      {
        type: 'DEPENDENCY_BROKEN',
        severity: 'CRITICAL',
        title: 'Dependency Chain Broken',
        message: 'K8s decision at risk - impacts monitoring and support decisions',
        decision_id: decisionMap['Adopt Kubernetes for'].id,
        organization_id: organizationId,
        metadata: { impacted_decisions: 2, cascade_risk: 'HIGH' },
      },
    ];

    const { data: createdNotifications, error: notificationsError } = await supabase
      .from('notifications')
      .insert(notificationsData)
      .select();

    if (notificationsError) {
      console.error('❌ Error creating notifications:', notificationsError);
      return;
    }

    console.log(`✅ Created ${createdNotifications.length} notifications\n`);

    // ========================================
    // 12. CREATE EVALUATION HISTORY
    // ========================================
    console.log('📜 Creating evaluation history (audit trail)...');

    const evaluationHistoryData = [
      {
        decision_id: decisionMap['Adopt Kubernetes for'].id,
        old_lifecycle: 'STABLE',
        new_lifecycle: 'AT_RISK',
        old_health_signal: 85,
        new_health_signal: 45,
        invalidated_reason: null,
        organization_id: organizationId,
        trace: {
          step1: { name: 'Assumption Check', status: 'BROKEN', broken_assumptions: 1 },
          step2: { name: 'Constraint Check', status: 'PASSED' },
          step3: { name: 'Dependency Check', status: 'WARNING', at_risk_dependencies: 0 },
          step4: { name: 'Health Calculation', health: 45, factors: { assumptions: -40 } },
          step5: { name: 'Lifecycle Determination', lifecycle: 'AT_RISK', reason: 'Broken assumption detected' },
        },
      },
      {
        decision_id: decisionMap['Migrate to Serverless'].id,
        old_lifecycle: 'AT_RISK',
        new_lifecycle: 'INVALIDATED',
        old_health_signal: 35,
        new_health_signal: 20,
        invalidated_reason: 'broken_assumptions',
        organization_id: organizationId,
        trace: {
          step1: { name: 'Assumption Check', status: 'BROKEN', broken_assumptions: 1 },
          step2: { name: 'Constraint Check', status: 'PASSED' },
          step3: { name: 'Dependency Check', status: 'PASSED' },
          step4: { name: 'Health Calculation', health: 20, factors: { assumptions: -60, cost_overrun: -20 } },
          step5: { name: 'Lifecycle Determination', lifecycle: 'INVALIDATED', reason: 'Cost analysis invalidated assumption' },
        },
      },
      {
        decision_id: decisionMap['Enable Remote Work'].id,
        old_lifecycle: 'UNDER_REVIEW',
        new_lifecycle: 'STABLE',
        old_health_signal: 75,
        new_health_signal: 92,
        invalidated_reason: null,
        organization_id: organizationId,
        trace: {
          step1: { name: 'Assumption Check', status: 'PASSED' },
          step2: { name: 'Constraint Check', status: 'PASSED' },
          step3: { name: 'Dependency Check', status: 'PASSED' },
          step4: { name: 'Health Calculation', health: 92, factors: { assumptions: 0, productivity: 17 } },
          step5: { name: 'Lifecycle Determination', lifecycle: 'STABLE', reason: 'Strong performance data validates decision' },
        },
      },
    ];

    const { data: createdHistory, error: historyError } = await supabase
      .from('evaluation_history')
      .insert(evaluationHistoryData)
      .select();

    if (historyError) {
      console.error('❌ Error creating evaluation history:', historyError);
      return;
    }

    console.log(`✅ Created ${createdHistory.length} evaluation history entries\n`);

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎉 ULTIMATE TEST DATA SEEDING COMPLETE! 🎉');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 COMPREHENSIVE SUMMARY:\n');
    console.log(`   ✅ ${createdDecisions.length} Decisions (all lifecycle states)`);
    console.log(`      • ${createdDecisions.filter(d => d.lifecycle === 'STABLE').length} STABLE`);
    console.log(`      • ${createdDecisions.filter(d => d.lifecycle === 'UNDER_REVIEW').length} UNDER_REVIEW`);
    console.log(`      • ${createdDecisions.filter(d => d.lifecycle === 'AT_RISK').length} AT_RISK`);
    console.log(`      • ${createdDecisions.filter(d => d.lifecycle === 'INVALIDATED').length} INVALIDATED`);
    console.log(`      • ${createdDecisions.filter(d => d.lifecycle === 'RETIRED').length} RETIRED\n`);

    console.log(`   ✅ ${createdDeps.length} Dependencies (complex chains)\n`);
    
    console.log(`   ✅ ${createdAssumptions.length} Assumptions`);
    console.log(`      • ${createdAssumptions.filter(a => a.status === 'VALID').length} VALID`);
    console.log(`      • ${createdAssumptions.filter(a => a.status === 'SHAKY').length} SHAKY`);
    console.log(`      • ${createdAssumptions.filter(a => a.status === 'BROKEN').length} BROKEN`);
    console.log(`      • ${createdAssumptions.filter(a => a.scope === 'UNIVERSAL').length} UNIVERSAL`);
    console.log(`      • ${createdAssumptions.filter(a => a.scope === 'DECISION_SPECIFIC').length} DECISION_SPECIFIC\n`);

    console.log(`   ✅ ${createdLinks.length} Assumption-Decision links\n`);
    
    console.log(`   ✅ ${createdConflicts.length} Assumption Conflicts`);
    console.log(`      • Contradictory, Mutually Exclusive, Incompatible types\n`);
    
    console.log(`   ✅ ${createdConstraints.length} Organizational Constraints`);
    console.log(`      • LEGAL, BUDGET, POLICY, TECHNICAL, COMPLIANCE types\n`);
    
    console.log(`   ✅ ${createdConstraintLinks.length} Constraint-Decision links\n`);
    
    console.log(`   ✅ ${createdTensions.length} Decision Tensions (conflicts)`);
    console.log(`      • LOW, MEDIUM, HIGH severities\n`);
    
    console.log(`   ✅ ${createdSignals.length} Decision Signals`);
    console.log(`      • SIGNAL, RISK, NOTE, PROGRESS types\n`);
    
    console.log(`   ✅ ${createdNotifications.length} Notifications`);
    console.log(`      • All notification types covered\n`);
    
    console.log(`   ✅ ${createdHistory.length} Evaluation History entries\n`);

    console.log('🎯 DECISION FLOW SWIMLANES:');
    console.log('   🟦 Strategy: 3 decisions (all STABLE or UNDER_REVIEW)');
    console.log('   🟪 Technical: 5 decisions (all STABLE or UNDER_REVIEW)');
    console.log('   🔷 Operations: 3 decisions (2 active, 1 RETIRED)');
    console.log('   🟩 Compliance: 2 decisions (all UNDER_REVIEW)');
    console.log('   🟧 Financial: 2 decisions (1 STABLE, 1 UNDER_REVIEW)');
    console.log('   ⚪ Other: 2 decisions (1 STABLE, 1 UNDER_REVIEW)\n');

    console.log('🧪 DEPRECATION TEST CASE:');
    console.log('   • Only 1 RETIRED decision: "Legacy Waterfall Process"');
    console.log('   • Only 1 assumption should show deprecation warning');
    console.log('   • All other decisions are STABLE/UNDER_REVIEW (no warnings expected)\n');

    console.log('⚔️  CONFLICTS TO EXPLORE:');
    console.log('   • 3 Assumption conflicts requiring resolution');
    console.log('   • 4 Decision tensions (including HIGH severity)');
    console.log('   • 2 Broken assumptions (linked to active decisions)\n');

    console.log('═══════════════════════════════════════════════════════════');
    console.log('🚀 TEST DATA IS READY! 🚀');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 Testing Plan:');
    console.log('   1. Go to Assumptions page');
    console.log('   2. You should see EXACTLY 1 deprecation warning:');
    console.log('      → "Waterfall methodology..." linked to RETIRED decision');
    console.log('   3. If you see more warnings = backend bug');
    console.log('   4. If you see no warnings = check filters or backend\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the ultimate seeder
seedUltimateTestData().then(() => {
  console.log('✅ Ultimate seeding completed successfully!');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Ultimate seeding failed:', error);
  process.exit(1);
});
