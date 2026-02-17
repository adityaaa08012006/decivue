/**
 * 🎬 PLOT ARMOR COMPREHENSIVE TEST DATA SEEDER 🎬
 * 
 * Creates realistic test data for a NON-TECHNICAL organization (Coffee Shop Chain)
 * showcasing ALL Decivue features:
 * 
 * ✅ Decision Conflicts (resource competition, contradictory strategies)
 * ✅ Assumption Conflicts (contradictory, mutually exclusive, incompatible)
 * ✅ Report Generation Data (reviews, evaluation history, audit logs)
 * ✅ Time Jump (historical data with various timestamps)
 * ✅ Version Control (decision versions with change tracking)
 * ✅ Reviewing (decision reviews with different types)
 * ✅ Deprecation (decisions with deprecation outcomes)
 * ✅ Governance Features (locked decisions, approval workflows)
 * ✅ Evaluation Tracking (health signal changes over time)
 * ✅ Decision Signals (risks, progress updates, notes)
 * ✅ Notifications (all types and severities)
 * ✅ Constraint Violations (budget, policy, compliance issues)
 * ✅ Dependencies (decision chains)
 * ✅ Parameter Templates (categories and structured data)
 * 
 * Organization Context: "PLOT ARMOR" - A growing coffee shop chain
 * making strategic business decisions about expansion, operations, 
 * customer experience, and sustainability.
 * 
 * Usage:
 *   npm run seed-plot-armor
 *   OR
 *   npx ts-node backend/scripts/seed-plot-armor-complete.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function cleanupTestData(organizationId: string) {
  console.log('🧹 Cleaning up existing test data for PLOT ARMOR...\n');
  
  const tables = [
    'governance_audit_log',
    'team_member_reports',
    'decision_relation_changes',
    'decision_reviews',
    'decision_versions',
    'evaluation_history',
    'notifications',
    'decision_signals',
    'constraint_violations',
    'decision_tensions',
    'decision_conflicts',
    'assumption_conflicts',
    'decision_assumptions',
    'decision_constraints',
    'dependencies',
    'decisions',
    'assumptions',
    'constraints',
    'parameter_templates',
    'organization_profiles'
  ];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('organization_id', organizationId);
    
    if (error && !error.message.includes('violates foreign key')) {
      console.log(`⚠️  Error cleaning ${table}:`, error.message);
    }
  }

  console.log('✅ Cleanup complete\n');
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedPlotArmorData() {
  console.log('🎬 ═══════════════════════════════════════════════════════════');
  console.log('   PLOT ARMOR - Comprehensive Test Data Seeder');
  console.log('   Coffee Shop Chain Decision Management System');
  console.log('   ═══════════════════════════════════════════════════════════\n');

  try {
    // ========================================
    // STEP 1: GET ORGANIZATION & USER
    // ========================================
    console.log('📍 Step 1: Locating PLOT ARMOR organization...');
    
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, org_code')
      .ilike('name', '%PLOT ARMOR%')
      .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ Organization "PLOT ARMOR" not found.');
      console.log('💡 Please create the organization first or update the name filter.');
      process.exit(1);
    }

    const organizationId = orgs[0].id;
    console.log(`   ✅ Organization: ${orgs[0].name}`);
    console.log(`   📋 Org Code: ${orgs[0].org_code}`);
    console.log(`   🆔 ID: ${organizationId}\n`);

    // Get first user in organization
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('organization_id', organizationId)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ No users found in PLOT ARMOR organization.');
      console.log('💡 Please register at least one user for this organization.');
      process.exit(1);
    }

    const userId = users[0].id;
    console.log('👤 Step 2: Located user...');
    console.log(`   ✅ User: ${users[0].full_name} (${users[0].email})`);
    console.log(`   👔 Role: ${users[0].role}`);
    console.log(`   🆔 ID: ${userId}\n`);

    await cleanupTestData(organizationId);

    // ========================================
    // STEP 2: CREATE ORGANIZATION PROFILE
    // ========================================
    console.log('📊 Step 3: Creating organization profile...');
    
    const { data: profile, error: profileError } = await supabase
      .from('organization_profiles')
      .insert({
        name: 'Plot Armor Coffee Co.',
        industry: 'Food & Beverage',
        size: 'Medium (50-200 employees)',
        decision_style: 'Collaborative',
        risk_tolerance: 55,
        strategic_priorities: [
          'Customer Experience',
          'Sustainability',
          'Market Expansion',
          'Product Innovation',
          'Operational Excellence'
        ],
        constraints: {
          budget_range: '$5M-$10M annually',
          compliance_requirements: ['Health & Safety', 'Food Safety', 'Labor Laws'],
          geographical_scope: 'Regional (3 states)'
        },
        organization_id: organizationId
      })
      .select()
      .single();

    if (profileError) {
      console.log('   ⚠️  Could not create organization profile:', profileError.message);
    } else {
      console.log('   ✅ Organization profile created\n');
    }

    // ========================================
    // STEP 3: CREATE PARAMETER TEMPLATES
    // ========================================
    console.log('📝 Step 4: Creating parameter templates...');
    
    const templates = [
      // Decision Categories
      { category: 'Operations', template_name: 'Store Operations', display_order: 1 },
      { category: 'Operations', template_name: 'Supply Chain', display_order: 2 },
      { category: 'Operations', template_name: 'Staff Management', display_order: 3 },
      { category: 'Marketing', template_name: 'Customer Acquisition', display_order: 1 },
      { category: 'Marketing', template_name: 'Brand Development', display_order: 2 },
      { category: 'Marketing', template_name: 'Loyalty Programs', display_order: 3 },
      { category: 'Finance', template_name: 'Budget Allocation', display_order: 1 },
      { category: 'Finance', template_name: 'Investment', display_order: 2 },
      { category: 'Product', template_name: 'Menu Development', display_order: 1 },
      { category: 'Product', template_name: 'Quality Standards', display_order: 2 },
      { category: 'Expansion', template_name: 'New Locations', display_order: 1 },
      { category: 'Expansion', template_name: 'Partnerships', display_order: 2 },
      
      // Assumption Categories (for structured mode)
      { category: 'assumption_category', template_name: 'Budget & Financial', display_order: 1 },
      { category: 'assumption_category', template_name: 'Timeline & Schedule', display_order: 2 },
      { category: 'assumption_category', template_name: 'Resource & Staffing', display_order: 3 },
      { category: 'assumption_category', template_name: 'Technical & Infrastructure', display_order: 4 },
      { category: 'assumption_category', template_name: 'Market & Business', display_order: 5 },
      { category: 'assumption_category', template_name: 'Compliance & Legal', display_order: 6 },
      { category: 'assumption_category', template_name: 'Other', display_order: 99 },
      
      // Priority Levels (for conflict severity)
      { category: 'priority_level', template_name: 'Critical', display_order: 1 },
      { category: 'priority_level', template_name: 'High', display_order: 2 },
      { category: 'priority_level', template_name: 'Medium', display_order: 3 },
      { category: 'priority_level', template_name: 'Low', display_order: 4 },
      
      // Impact Areas (where the assumption affects)
      { category: 'impact_area', template_name: 'Revenue', display_order: 1 },
      { category: 'impact_area', template_name: 'Cost', display_order: 2 },
      { category: 'impact_area', template_name: 'Timeline', display_order: 3 },
      { category: 'impact_area', template_name: 'Quality', display_order: 4 },
      { category: 'impact_area', template_name: 'Compliance', display_order: 5 },
      { category: 'impact_area', template_name: 'Customer Experience', display_order: 6 },
      { category: 'impact_area', template_name: 'Team Capacity', display_order: 7 },
      
      // Common Timeframes
      { category: 'timeframe', template_name: 'Q1 2026', display_order: 1 },
      { category: 'timeframe', template_name: 'Q2 2026', display_order: 2 },
      { category: 'timeframe', template_name: 'Q3 2026', display_order: 3 },
      { category: 'timeframe', template_name: 'Q4 2026', display_order: 4 },
      { category: 'timeframe', template_name: 'H1 2026', display_order: 5 },
      { category: 'timeframe', template_name: 'H2 2026', display_order: 6 },
      { category: 'timeframe', template_name: '2026', display_order: 7 },
      { category: 'timeframe', template_name: '2027', display_order: 8 },
      
      // Outcome Types (for what's expected)
      { category: 'outcome_type', template_name: 'Approval Required', display_order: 1 },
      { category: 'outcome_type', template_name: 'Funding Secured', display_order: 2 },
      { category: 'outcome_type', template_name: 'Resource Available', display_order: 3 },
      { category: 'outcome_type', template_name: 'Deadline Met', display_order: 4 },
      { category: 'outcome_type', template_name: 'Milestone Achieved', display_order: 5 },
      { category: 'outcome_type', template_name: 'Condition Satisfied', display_order: 6 },
      
      // Budget Types (for Budget & Financial)
      { category: 'budget_type', template_name: 'budget', display_order: 1 },
      { category: 'budget_type', template_name: 'operating', display_order: 2 },
      { category: 'budget_type', template_name: 'capital', display_order: 3 },
      { category: 'budget_type', template_name: 'contingency', display_order: 4 },
      
      // Timeline Types (for Timeline & Schedule)
      { category: 'timeline_type', template_name: 'minimum', display_order: 1 },
      { category: 'timeline_type', template_name: 'maximum', display_order: 2 },
      { category: 'timeline_type', template_name: 'deadline', display_order: 3 },
      { category: 'timeline_type', template_name: 'estimate', display_order: 4 },
      
      // Duration Units (for Timeline & Schedule)
      { category: 'duration_unit', template_name: 'days', display_order: 1 },
      { category: 'duration_unit', template_name: 'weeks', display_order: 2 },
      { category: 'duration_unit', template_name: 'months', display_order: 3 },
      { category: 'duration_unit', template_name: 'years', display_order: 4 },
      
      // Market Directions (for Market & Business)
      { category: 'market_direction', template_name: 'increase', display_order: 1 },
      { category: 'market_direction', template_name: 'decrease', display_order: 2 },
      { category: 'market_direction', template_name: 'positive', display_order: 3 },
      { category: 'market_direction', template_name: 'negative', display_order: 4 },
      { category: 'market_direction', template_name: 'stable', display_order: 5 },
      
      // Resource Availability (for Resource & Staffing)
      { category: 'resource_availability', template_name: 'high', display_order: 1 },
      { category: 'resource_availability', template_name: 'medium', display_order: 2 },
      { category: 'resource_availability', template_name: 'low', display_order: 3 }
    ];

    for (const template of templates) {
      await supabase
        .from('parameter_templates')
        .insert({
          ...template,
          organization_id: organizationId,
          is_active: true
        });
    }
    console.log(`   ✅ Created ${templates.length} parameter templates (decisions, assumptions & dropdowns)\n`);

    // ========================================
    // STEP 4: CREATE ASSUMPTIONS (STRUCTURED FORMAT)
    // ========================================
    console.log('💭 Step 5: Creating assumptions with structured parameters...');
    
    const assumptionsData = [
      // BUDGET CONFLICTS - Same timeframe, different amounts
      {
        description: 'Q3 2026 expansion budget will be $800,000 for new locations',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Budget & Financial',
        parameters: {
          amount: 800000,
          timeframe: 'Q3 2026',
          type: 'budget'
        },
        validated_at: daysAgo(10),
        created_at: daysAgo(180)
      },
      {
        description: 'Q3 2026 expansion budget allocation is $500,000 for new stores',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Budget & Financial',
        parameters: {
          amount: 500000,
          timeframe: 'Q3 2026',
          type: 'budget'
        },
        validated_at: daysAgo(8),
        created_at: daysAgo(175)
      },

      // MARKET DIRECTION CONFLICTS - Opposite trends
      {
        description: 'Coffee consumption in premium segment will increase significantly',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: {
          metric: 'coffee consumption',
          direction: 'increase',
          segment: 'premium'
        },
        validated_at: daysAgo(15),
        created_at: daysAgo(200)
      },
      {
        description: 'Coffee consumption in premium markets will decrease due to saturation',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: {
          metric: 'coffee consumption',
          direction: 'decrease',
          segment: 'premium'
        },
        validated_at: daysAgo(40),
        created_at: daysAgo(190)
      },

      // TIMELINE CONFLICTS - Minimum > Deadline
      {
        description: 'New store setup requires minimum 6 months for full buildout',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Timeline & Schedule',
        parameters: {
          duration: 6,
          unit: 'months',
          type: 'minimum'
        },
        validated_at: daysAgo(12),
        created_at: daysAgo(160)
      },
      {
        description: 'Store opening deadline set at 4 months to meet Q3 targets',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Timeline & Schedule',
        parameters: {
          duration: 4,
          unit: 'months',
          type: 'deadline'
        },
        validated_at: daysAgo(5),
        created_at: daysAgo(155)
      },

      // RESOURCE CONFLICTS - Opposite availability
      {
        description: 'Skilled baristas are readily available in current job market',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Resource & Staffing',
        parameters: {
          resource: 'skilled baristas',
          availability: 'high',
          timeframe: 'current'
        },
        validated_at: daysAgo(20),
        created_at: daysAgo(170)
      },
      {
        description: 'Skilled barista shortage in current market requires premium wages',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        category: 'Resource & Staffing',
        parameters: {
          resource: 'skilled baristas',
          availability: 'low',
          timeframe: 'current'
        },
        validated_at: daysAgo(30),
        created_at: daysAgo(165)
      },

      // NON-CONFLICTING ASSUMPTIONS
      {
        description: 'Customers value sustainability and are willing to pay premium for ethical sourcing',
        status: 'VALID',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: {
          metric: 'customer willingness to pay',
          direction: 'positive',
          factor: 'sustainability'
        },
        validated_at: daysAgo(15),
        created_at: daysAgo(200)
      },
      {
        description: 'Specialty coffee market has room for 15-20 additional locations in our region',
        status: 'SHAKY',
        scope: 'UNIVERSAL',
        category: 'Market & Business',
        parameters: {
          metric: 'market capacity',
          value: '15-20 locations',
          region: 'current'
        },
        validated_at: daysAgo(45),
        created_at: daysAgo(150)
      },
      {
        description: 'Downtown locations generate 40% higher foot traffic than suburban',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Market & Business',
        parameters: {
          metric: 'foot traffic',
          comparison: 'downtown vs suburban',
          difference: '40% higher'
        },
        validated_at: daysAgo(8),
        created_at: daysAgo(120)
      },
      {
        description: 'Automation of ordering reduces labor costs by 15%',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Technical & Infrastructure',
        parameters: {
          technology: 'ordering automation',
          impact: 'cost reduction',
          percentage: 15
        },
        validated_at: daysAgo(12),
        created_at: daysAgo(90)
      },
      {
        description: 'Plant-based milk alternatives have reached market saturation',
        status: 'BROKEN',
        scope: 'DECISION_SPECIFIC',
        category: 'Market & Business',
        parameters: {
          metric: 'market saturation',
          product: 'plant-based milk',
          status: 'saturated'
        },
        validated_at: daysAgo(7),
        created_at: daysAgo(130)
      },
      {
        description: 'Social media marketing provides 3x ROI compared to traditional advertising',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Market & Business',
        parameters: {
          channel: 'social media',
          metric: 'ROI',
          comparison: '3x traditional'
        },
        validated_at: daysAgo(22),
        created_at: daysAgo(170)
      },
      {
        description: 'Loyalty programs increase customer lifetime value by 40%',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Market & Business',
        parameters: {
          program: 'loyalty',
          metric: 'customer lifetime value',
          increase: '40%'
        },
        validated_at: daysAgo(14),
        created_at: daysAgo(155)
      },
      {
        description: 'Q4 2026 operating budget needs to account for 20% increase in supply costs',
        status: 'VALID',
        scope: 'DECISION_SPECIFIC',
        category: 'Budget & Financial',
        parameters: {
          amount: 1200000,
          timeframe: 'Q4 2026',
          type: 'operating'
        },
        validated_at: daysAgo(5),
        created_at: daysAgo(140)
      }
    ];

    const assumptions: any[] = [];
    for (const assumption of assumptionsData) {
      const { data, error } = await supabase
        .from('assumptions')
        .insert({
          ...assumption,
          organization_id: organizationId
        })
        .select()
        .single();

      if (error) {
        console.log(`   ⚠️  Could not create assumption: ${assumption.description.substring(0, 50)}...`);
      } else {
        assumptions.push(data);
      }
    }
    console.log(`   ✅ Created ${assumptions.length} assumptions\n`);

    // ========================================
    // STEP 5: CREATE CONSTRAINTS
    // ========================================
    console.log('🔒 Step 6: Creating constraints...');
    
    const constraintsData = [
      {
        name: 'Annual Budget Cap',
        description: 'Total annual capital expenditure must not exceed $8M',
        constraint_type: 'BUDGET',
        rule_expression: 'SUM(decision.metadata.budget) <= 8000000',
        is_immutable: true,
        validation_config: { threshold: 8000000, currency: 'USD' },
        last_validated_at: daysAgo(5)
      },
      {
        name: 'Health & Safety Compliance',
        description: 'All locations must maintain health department rating of A or higher',
        constraint_type: 'COMPLIANCE',
        rule_expression: 'health_rating >= "A"',
        is_immutable: true,
        validation_config: { required_rating: 'A', inspection_frequency: 'quarterly' },
        last_validated_at: daysAgo(15)
      },
      {
        name: 'Sustainable Sourcing Policy',
        description: 'Minimum 75% of coffee beans must be certified fair trade or organic',
        constraint_type: 'POLICY',
        rule_expression: 'sustainable_sourcing_percentage >= 0.75',
        is_immutable: false,
        validation_config: { minimum_percentage: 0.75, certifications: ['Fair Trade', 'Organic', 'Rainforest Alliance'] },
        last_validated_at: daysAgo(8)
      },
      {
        name: 'Labor Cost Ratio',
        description: 'Employee wages and benefits must stay within 28-32% of revenue',
        constraint_type: 'BUDGET',
        rule_expression: 'labor_costs / revenue BETWEEN 0.28 AND 0.32',
        is_immutable: false,
        validation_config: { min_ratio: 0.28, max_ratio: 0.32 },
        last_validated_at: daysAgo(3),
        validation_failures: 2
      },
      {
        name: 'Location Minimum Distance',
        description: 'New locations must be at least 2 miles from existing stores',
        constraint_type: 'POLICY',
        rule_expression: 'MIN_DISTANCE(new_location, existing_locations) >= 2.0',
        is_immutable: false,
        validation_config: { minimum_miles: 2.0, market_type: 'suburban' },
        last_validated_at: daysAgo(20)
      },
      {
        name: 'Maximum Debt-to-Equity Ratio',
        description: 'Company debt-to-equity ratio must not exceed 1.5',
        constraint_type: 'LEGAL',
        rule_expression: 'debt / equity <= 1.5',
        is_immutable: true,
        validation_config: { max_ratio: 1.5, review_frequency: 'quarterly' },
        last_validated_at: daysAgo(10)
      }
    ];

    const constraints: any[] = [];
    for (const constraint of constraintsData) {
      const { data, error } = await supabase
        .from('constraints')
        .insert({
          ...constraint,
          organization_id: organizationId,
          created_at: daysAgo(200)
        })
        .select()
        .single();

      if (error) {
        console.log(`   ⚠️  Could not create constraint: ${constraint.name}`);
      } else {
        constraints.push(data);
      }
    }
    console.log(`   ✅ Created ${constraints.length} constraints\n`);

    // ========================================
    // STEP 6: CREATE DECISIONS
    // ========================================
    console.log('📋 Step 7: Creating business decisions...');
    
    const decisionsData = [
      // EXPANSION DECISIONS
      {
        title: 'Open Downtown Location on Market Street',
        description: 'Launch flagship store in prime downtown location with seating for 60, full espresso bar, and bakery partnership. Target opening Q3 2026.',
        category: 'Expansion',
        lifecycle: 'STABLE',
        health_signal: 88,
        parameters: {
          location: 'Market Street, Downtown',
          estimated_budget: 450000,
          target_opening: '2026-09-01',
          seating_capacity: 60,
          staff_required: 12
        },
        expiry_date: daysFromNow(120), // Construction permit expires
        created_at: daysAgo(120),
        last_reviewed_at: daysAgo(10),
        last_evaluated_at: daysAgo(10),
        needs_evaluation: false,
        review_urgency_score: 25,
        next_review_date: daysFromNow(75),
        review_frequency_days: 90
      },
      {
        title: 'Establish University District Location',
        description: 'Open student-focused location near State University campus with extended hours, study-friendly atmosphere, and student discount program.',
        category: 'Expansion',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 62,
        parameters: {
          location: 'University District',
          estimated_budget: 320000,
          target_opening: '2026-08-15',
          seating_capacity: 45,
          staff_required: 9,
          concerns: 'Summer revenue drops significantly'
        },
        expiry_date: daysFromNow(60), // Lease agreement deadline
        created_at: daysAgo(90),
        last_reviewed_at: daysAgo(5),
        last_evaluated_at: daysAgo(5),
        needs_evaluation: true,
        review_urgency_score: 68,
        next_review_date: daysFromNow(30),
        review_frequency_days: 60
      },
      {
        title: 'Expand to Suburban Mall Food Court',
        description: 'Smaller format store in Westfield Mall food court. Lower overhead, high foot traffic, limited menu.',
        category: 'Expansion',
        lifecycle: 'AT_RISK',
        health_signal: 45,
        parameters: {
          location: 'Westfield Mall',
          estimated_budget: 180000,
          target_opening: '2026-11-01',
          format: 'Express',
          staff_required: 5,
          concerns: 'Mall traffic declining, competing with food court chains'
        },
        expiry_date: daysFromNow(15), // Decision deadline - URGENT!
        created_at: daysAgo(60),
        last_reviewed_at: daysAgo(3),
        last_evaluated_at: daysAgo(3),
        needs_evaluation: true,
        review_urgency_score: 82,
        next_review_date: daysFromNow(14),
        review_frequency_days: 30,
        consecutive_deferrals: 1
      },
      {
        title: 'Open Second Downtown Location (Failed)',
        description: 'Attempted second downtown location that was too close to existing store. Led to cannibalization.',
        category: 'Expansion',
        lifecycle: 'RETIRED',
        health_signal: 15,
        invalidated_reason: 'Violated minimum distance policy and cannibalized existing store revenue by 30%',
        parameters: {
          location: 'Pine Street, Downtown',
          estimated_budget: 400000,
          actual_impact: 'Negative - Revenue cannibalization'
        },
        created_at: daysAgo(180),
        last_reviewed_at: daysAgo(60),
        last_evaluated_at: daysAgo(60),
        review_urgency_score: 0,
        deprecation_outcome: 'failed',
        deprecation_conclusions: {
          lessons_learned: [
            'Minimum distance policy exists for good reason',
            'Market saturation analysis insufficient',
            'Should have invested in different neighborhood'
          ],
          financial_impact: -125000,
          recommendation: 'Strengthen location analysis process before future expansions'
        }
      },

      // OPERATIONS DECISIONS
      {
        title: 'Implement Mobile Ordering System',
        description: 'Deploy custom mobile app for pre-ordering, payment, and loyalty rewards. Integration with existing POS system.',
        category: 'Operations',
        lifecycle: 'STABLE',
        health_signal: 91,
        parameters: {
          vendor: 'BeanTech Solutions',
          budget: 85000,
          implementation_timeline: '3 months',
          expected_efficiency_gain: '15%',
          rollout_status: 'Completed all locations'
        },
        created_at: daysAgo(150),
        last_reviewed_at: daysAgo(20),
        last_evaluated_at: daysAgo(20),
        needs_evaluation: false,
        review_urgency_score: 18,
        next_review_date: daysFromNow(70),
        review_frequency_days: 90
      },
      {
        title: 'Automate Inventory Management',
        description: 'Implement IoT sensors and AI-powered inventory tracking to reduce waste and optimize ordering.',
        category: 'Operations',
        lifecycle: 'STABLE',
        health_signal: 85,
        parameters: {
          vendor: 'SmartStock AI',
          budget: 65000,
          expected_waste_reduction: '20%',
          rollout_phase: 'Pilot at 3 locations'
        },
        expiry_date: daysFromNow(50), // Vendor proposal expires
        created_at: daysAgo(110),
        last_reviewed_at: daysAgo(15),
        last_evaluated_at: daysAgo(15),
        needs_evaluation: false,
        review_urgency_score: 22,
        next_review_date: daysFromNow(75),
        review_frequency_days: 90
      },
      {
        title: 'Reduce Staff Hours to Cut Costs',
        description: 'Decrease staff hours during slow periods to improve labor cost ratio.',
        category: 'Operations',
        lifecycle: 'INVALIDATED',
        health_signal: 28,
        invalidated_reason: 'Led to severe customer service degradation, longer wait times, and increased staff turnover. Customer satisfaction dropped 35%.',
        parameters: {
          proposed_savings: 45000,
          actual_impact: 'Highly negative',
          customer_satisfaction_change: -35,
          staff_turnover_increase: 28
        },
        created_at: daysAgo(75),
        last_reviewed_at: daysAgo(8),
        last_evaluated_at: daysAgo(8),
        review_urgency_score: 95,
        next_review_date: daysFromNow(7),
        review_frequency_days: 14,
        deprecation_outcome: 'failed',
        deprecation_conclusions: {
          lessons_learned: [
            'Customer experience is paramount',
            'Labor costs should be optimized through efficiency, not reduction',
            'Staff morale directly impacts service quality'
          ],
          reversal_actions: 'Restored all staff hours and hired 3 additional baristas'
        }
      },

      // PRODUCT DECISIONS
      {
        title: 'Launch Seasonal Specialty Drink Menu',
        description: 'Introduce rotating seasonal drinks featuring unique flavor profiles and local ingredients. Refresh every 10-12 weeks.',
        category: 'Product',
        lifecycle: 'STABLE',
        health_signal: 93,
        parameters: {
          number_of_items: 5,
          development_cost: 15000,
          price_premium: '10-15%',
          marketing_support: 'Social media campaign',
          current_season: 'Spring Floral Collection'
        },
        created_at: daysAgo(200),
        last_reviewed_at: daysAgo(12),
        last_evaluated_at: daysAgo(12),
        needs_evaluation: false,
        review_urgency_score: 15,
        next_review_date: daysFromNow(80),
        review_frequency_days: 90
      },
      {
        title: 'Expand Plant-Based Menu Options',
        description: 'Add extensive plant-based milk alternatives and vegan food options to appeal to health-conscious customers.',
        category: 'Product',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 58,
        parameters: {
          additional_milks: ['Oat', 'Almond', 'Coconut', 'Soy', 'Macadamia'],
          vegan_food_items: 8,
          supplier_costs: 'Increased 18%',
          customer_adoption: 'Below expectations at 12%'
        },
        created_at: daysAgo(85),
        last_reviewed_at: daysAgo(6),
        last_evaluated_at: daysAgo(6),
        needs_evaluation: true,
        review_urgency_score: 71,
        next_review_date: daysFromNow(25),
        review_frequency_days: 45
      },
      {
        title: 'Introduce Coffee Subscription Service',
        description: 'Monthly subscription for whole bean coffee delivery with member-exclusive blends.',
        category: 'Product',
        lifecycle: 'STABLE',
        health_signal: 79,
        parameters: {
          subscription_tiers: ['Basic', 'Premium', 'Connoisseur'],
          pricing: '$24.99 - $49.99/month',
          target_subscribers: 500,
          current_subscribers: 342,
          margin: '45%'
        },
        expiry_date: daysFromNow(75), // Promotional pricing period ends
        created_at: daysAgo(130),
        last_reviewed_at: daysAgo(18),
        last_evaluated_at: daysAgo(18),
        needs_evaluation: false,
        review_urgency_score: 32,
        next_review_date: daysFromNow(60),
        review_frequency_days: 90
      },

      // MARKETING DECISIONS
      {
        title: 'Launch Instagram Influencer Partnerships',
        description: 'Partner with local micro-influencers (10K-50K followers) for authentic content creation and brand awareness.',
        category: 'Marketing',
        lifecycle: 'STABLE',
        health_signal: 86,
        parameters: {
          budget: 35000,
          number_of_influencers: 12,
          expected_reach: '250K impressions/month',
          content_type: 'Instagram posts, Stories, Reels',
          kpi: 'Brand awareness +40%, foot traffic +15%'
        },
        expiry_date: daysFromNow(45), // Campaign duration ends
        created_at: daysAgo(95),
        last_reviewed_at: daysAgo(11),
        last_evaluated_at: daysAgo(11),
        needs_evaluation: false,
        review_urgency_score: 28,
        next_review_date: daysFromNow(65),
        review_frequency_days: 75
      },
      {
        title: 'Implement Tiered Loyalty Rewards Program',
        description: 'Three-tier loyalty program (Bronze, Silver, Gold) with escalating benefits and personalized offers.',
        category: 'Marketing',
        lifecycle: 'STABLE',
        health_signal: 90,
        parameters: {
          implementation_cost: 55000,
          technology_partner: 'LoyaltyLoop',
          enrollment_goal: 5000,
          current_members: 4723,
          repeat_visit_increase: '32%'
        },
        expiry_date: daysFromNow(90), // Pilot program evaluation deadline
        created_at: daysAgo(140),
        last_reviewed_at: daysAgo(9),
        last_evaluated_at: daysAgo(9),
        needs_evaluation: false,
        review_urgency_score: 19,
        next_review_date: daysFromNow(80),
        review_frequency_days: 90
      },
      {
        title: 'Radio Advertising Campaign (Deprecated)',
        description: 'Traditional radio advertising on morning drive time shows.',
        category: 'Marketing',
        lifecycle: 'RETIRED',
        health_signal: 35,
        invalidated_reason: 'Poor ROI compared to digital marketing. Attribution difficult, reach unclear, younger demographic does not listen to radio.',
        parameters: {
          budget_spent: 28000,
          stations: 3,
          duration: '6 months',
          measurable_impact: 'Minimal - estimated 2% increase in awareness',
          roi: '0.4x - Significantly below digital channels'
        },
        expiry_date: daysAgo(90), // Campaign ended - ALREADY EXPIRED
        created_at: daysAgo(210),
        last_reviewed_at: daysAgo(90),
        last_evaluated_at: daysAgo(90),
        deprecation_outcome: 'partially_succeeded',
        deprecation_conclusions: {
          lessons_learned: [
            'Traditional media is not effective for our target demographic',
            'Digital channels provide better targeting and measurement',
            'Budget better allocated to influencer and social media marketing'
          ],
          funds_reallocated_to: 'Instagram and TikTok advertising'
        }
      },

      // SUSTAINABILITY DECISIONS
      {
        title: 'Transition to 100% Compostable Packaging',
        description: 'Replace all plastic and non-recyclable packaging with certified compostable alternatives.',
        category: 'Sustainability',
        lifecycle: 'STABLE',
        health_signal: 87,
        parameters: {
          implementation_cost: 125000,
          ongoing_cost_increase: '8%',
          supplier: 'GreenWare Solutions',
          timeline: 'Complete by Q2 2026',
          environmental_impact: '15 tons less plastic waste annually',
          customer_approval: '94% positive'
        },
        created_at: daysAgo(165),
        last_reviewed_at: daysAgo(14),
        last_evaluated_at: daysAgo(14),
        needs_evaluation: false,
        review_urgency_score: 24,
        next_review_date: daysFromNow(75),
        review_frequency_days: 90,
        governance_mode: false
      },
      {
        title: 'Source 100% Fair Trade Certified Coffee',
        description: 'Commit to purchasing only Fair Trade certified beans supporting ethical labor practices and sustainable farming.',
        category: 'Sustainability',
        lifecycle: 'STABLE',
        health_signal: 92,
        parameters: {
          supplier_partnerships: ['Equal Exchange', 'Cooperative Coffees', 'Cafe Imports'],
          price_increase: '12%',
          pass_through_to_customer: '5%',
          certification_cost: 8500,
          farmer_impact: 'Direct trade with 14 cooperatives in 6 countries'
        },
        created_at: daysAgo(190),
        last_reviewed_at: daysAgo(16),
        last_evaluated_at: daysAgo(16),
        needs_evaluation: false,
        review_urgency_score: 12,
        next_review_date: daysFromNow(85),
        review_frequency_days: 90,
        governance_mode: true,
        requires_second_reviewer: true,
        edit_justification_required: true,
        governance_tier: 'high_impact'
      },

      // FINANCE DECISIONS
      {
        title: 'Secure $2M Line of Credit for Expansion',
        description: 'Establish line of credit with Regional Business Bank to fund expansion initiatives.',
        category: 'Finance',
        lifecycle: 'STABLE',
        health_signal: 82,
        parameters: {
          amount: 2000000,
          interest_rate: '6.5%',
          term: '5 years',
          lender: 'Regional Business Bank',
          collateral: 'Equipment and real estate',
          purpose: 'Working capital and expansion funding'
        },
        created_at: daysAgo(100),
        last_reviewed_at: daysAgo(25),
        last_evaluated_at: daysAgo(25),
        needs_evaluation: false,
        review_urgency_score: 38,
        next_review_date: daysFromNow(65),
        review_frequency_days: 90,
        governance_mode: true,
        requires_second_reviewer: true,
        edit_justification_required: true,
        governance_tier: 'critical',
        locked_at: daysAgo(95)
      },
      {
        title: 'Invest in Equipment Upgrade Program',
        description: 'Replace aging espresso machines and grinders across all locations with premium equipment.',
        category: 'Finance',
        lifecycle: 'UNDER_REVIEW',
        health_signal: 67,
        parameters: {
          total_investment: 380000,
          equipment_vendor: 'La Marzocco',
          financing: 'Equipment lease with buyout option',
          expected_quality_improvement: 'Consistent extraction, reduced downtime',
          payback_period: '4.5 years',
          concern: 'Stretches budget limits'
        },
        expiry_date: daysFromNow(20), // Financing offer expires - URGENT!
        created_at: daysAgo(55),
        last_reviewed_at: daysAgo(4),
        last_evaluated_at: daysAgo(4),
        needs_evaluation: true,
        review_urgency_score: 74,
        next_review_date: daysFromNow(20),
        review_frequency_days: 45,
        consecutive_deferrals: 2
      },

      // WORKFORCE DECISIONS
      {
        title: 'Implement Comprehensive Barista Training Program',
        description: 'Develop in-house certification program for baristas including coffee education, customer service, and latte art.',
        category: 'Workforce',
        lifecycle: 'STABLE',
        health_signal: 89,
        parameters: {
          development_cost: 45000,
          training_duration: '40 hours over 2 weeks',
          certification_levels: ['Certified Barista', 'Senior Barista', 'Master Barista'],
          expected_outcomes: 'Improved consistency, reduced turnover, better customer experience'
        },
        created_at: daysAgo(145),
        last_reviewed_at: daysAgo(13),
        last_evaluated_at: daysAgo(13),
        needs_evaluation: false,
        review_urgency_score: 21,
        next_review_date: daysFromNow(77),
        review_frequency_days: 90
      },
      {
        title: 'Offer Health Insurance to Part-Time Staff',
        description: 'Extend health benefits to part-time employees working 20+ hours per week.',
        category: 'Workforce',
        lifecycle: 'AT_RISK',
        health_signal: 52,
        parameters: {
          annual_cost: 185000,
          employees_affected: 23,
          benefit_provider: 'Regional Health Network',
          employee_contribution: '25%',
          concern: 'High cost relative to profit margins'
        },
        expiry_date: daysFromNow(30), // Open enrollment deadline
        created_at: daysAgo(70),
        last_reviewed_at: daysAgo(7),
        last_evaluated_at: daysAgo(7),
        needs_evaluation: true,
        review_urgency_score: 79,
        next_review_date: daysFromNow(15),
        review_frequency_days: 30
      },
      {
        title: 'Cut Employee Discount from 50% to 30%',
        description: 'Reduce staff beverage discount to control costs.',
        category: 'Workforce',
        lifecycle: 'INVALIDATED',
        health_signal: 18,
        invalidated_reason: 'Staff morale plummeted. Turnover increased 45%. Employee benefits are critical for retention in food service industry.',
        parameters: {
          projected_savings: 18000,
          actual_impact: 'Devastating - staff exodus and recruitment costs exceeded savings by 3x',
          turnover_increase: 45,
          recruitment_costs: 72000
        },
        created_at: daysAgo(50),
        last_reviewed_at: daysAgo(14),
        last_evaluated_at: daysAgo(14),
        deprecation_outcome: 'failed',
        deprecation_conclusions: {
          lessons_learned: [
            'Employee benefits should never be cut to save marginal costs',
            'Staff satisfaction directly correlates to customer experience',
            'Penny wise, pound foolish - lost far more than we saved'
          ],
          reversal_actions: 'Immediately restored 50% discount and added monthly $50 coffee allowance'
        }
      }
    ];

    const decisions: any[] = [];
    for (const decision of decisionsData) {
      const { data, error } = await supabase
        .from('decisions')
        .insert({
          ...decision,
          organization_id: organizationId,
          created_by: userId,
          modified_by: userId,
          modified_at: decision.last_reviewed_at
        })
        .select()
        .single();

      if (error) {
        console.log(`   ⚠️  Could not create decision: ${decision.title}`);
        console.log(`      Error: ${error.message}`);
      } else {
        decisions.push(data);
        if (decision.governance_mode && decision.locked_at) {
          // Update locked_by
          await supabase
            .from('decisions')
            .update({ locked_by: userId })
            .eq('id', data.id);
        }
      }
    }
    console.log(`   ✅ Created ${decisions.length} business decisions\n`);

    // ========================================
    // STEP 7: LINK DECISIONS TO ASSUMPTIONS
    // ========================================
    console.log('🔗 Step 8: Linking decisions to assumptions...');
    
    const decisionAssumptionLinks = [
      // Downtown Location
      { decision: 'Open Downtown Location on Market Street', assumptions: ['Q3 2026 expansion budget will be $800,000', 'Customers value sustainability', 'Downtown locations generate 40%'] },
      // University District
      { decision: 'Establish University District Location', assumptions: ['Q3 2026 expansion budget allocation is $500,000', 'Coffee consumption in premium segment will increase', 'Skilled baristas are readily available'] },
      // Mall Location
      { decision: 'Expand to Suburban Mall Food Court', assumptions: ['Coffee consumption in premium segment will increase', 'New store setup requires minimum 6 months'] },
      // Failed Downtown
      { decision: 'Open Second Downtown Location (Failed)', assumptions: ['Specialty coffee market has room', 'Downtown locations generate 40%'] },
      
      // Operations
      { decision: 'Implement Mobile Ordering System', assumptions: ['Automation of ordering reduces'] },
      { decision: 'Automate Inventory Management', assumptions: ['Automation of ordering reduces'] },
      { decision: 'Reduce Staff Hours to Cut Costs', assumptions: ['Skilled baristas are readily available', 'Q4 2026 operating budget needs'] },
      
      // Product
      { decision: 'Launch Seasonal Specialty Drink Menu', assumptions: ['Customers value sustainability'] },
      { decision: 'Expand Plant-Based Menu Options', assumptions: ['Plant-based milk alternatives', 'Customers value sustainability'] },
      { decision: 'Introduce Coffee Subscription Service', assumptions: ['Customers value sustainability', 'Coffee consumption in premium segment will increase'] },
      
      // Marketing
      { decision: 'Launch Instagram Influencer Partnerships', assumptions: ['Social media marketing provides'] },
      { decision: 'Implement Tiered Loyalty Rewards Program', assumptions: ['Loyalty programs increase'] },
      { decision: 'Radio Advertising Campaign (Deprecated)', assumptions: ['Coffee consumption in premium segment will increase'] },
      
      // Sustainability
      { decision: 'Transition to 100% Compostable Packaging', assumptions: ['Customers value sustainability'] },
      { decision: 'Source 100% Fair Trade Certified Coffee', assumptions: ['Customers value sustainability'] },
      
      // Finance
      { decision: 'Secure $2M Line of Credit for Expansion', assumptions: ['Specialty coffee market has room', 'Q3 2026 expansion budget will be $800,000'] },
      { decision: 'Invest in Equipment Upgrade Program', assumptions: ['Q4 2026 operating budget needs'] },
      
      // Workforce
      { decision: 'Implement Comprehensive Barista Training Program', assumptions: ['Skilled barista shortage in current market'] },
      { decision: 'Offer Health Insurance to Part-Time Staff', assumptions: ['Skilled barista shortage in current market', 'Q4 2026 operating budget needs'] },
      { decision: 'Cut Employee Discount from 50% to 30%', assumptions: ['Q4 2026 operating budget needs'] }
    ];

    let linksCreated = 0;
    for (const link of decisionAssumptionLinks) {
      const decision = decisions.find(d => d.title.includes(link.decision.substring(0, 30)));
      if (!decision) continue;

      for (const assumptionDesc of link.assumptions) {
        const assumption = assumptions.find(a => a.description.includes(assumptionDesc));
        if (!assumption) continue;

        const { error } = await supabase
          .from('decision_assumptions')
          .insert({
            decision_id: decision.id,
            assumption_id: assumption.id,
            organization_id: organizationId,
            created_at: decision.created_at
          });

        if (!error) linksCreated++;
      }
    }
    console.log(`   ✅ Created ${linksCreated} decision-assumption links\n`);

    // ========================================
    // STEP 8: LINK DECISIONS TO CONSTRAINTS
    // ========================================
    console.log('🔗 Step 9: Linking decisions to constraints...');
    
    const decisionConstraintLinks = [
      { decision: 'Open Downtown Location on Market Street', constraints: ['Annual Budget Cap', 'Health &'] },
      { decision: 'Establish University District Location', constraints: ['Annual Budget Cap', 'Health &'] },
      { decision: 'Expand to Suburban Mall Food Court', constraints: ['Annual Budget Cap'] },
      { decision: 'Open Second Downtown Location (Failed)', constraints: ['Location Minimum Distance', 'Annual Budget Cap'] },
      { decision: 'Reduce Staff Hours to Cut Costs', constraints: ['Labor Cost Ratio'] },
      { decision: 'Transition to 100% Compostable Packaging', constraints: ['Annual Budget Cap', 'Sustainable'] },
      { decision: 'Source 100% Fair Trade Certified Coffee', constraints: ['Sustainable'] },
      { decision: 'Secure $2M Line of Credit for Expansion', constraints: ['Maximum Debt'] },
      { decision: 'Invest in Equipment Upgrade Program', constraints: ['Annual Budget Cap', 'Labor Cost'] },
      { decision: 'Offer Health Insurance to Part-Time Staff', constraints: ['Labor Cost Ratio', 'Annual Budget Cap'] }
    ];

    let constraintLinksCreated = 0;
    for (const link of decisionConstraintLinks) {
      const decision = decisions.find(d => d.title.includes(link.decision.substring(0, 30)));
      if (!decision) continue;

      for (const constraintName of link.constraints) {
        const constraint = constraints.find(c => c.name.includes(constraintName));
        if (!constraint) continue;

        const { error } = await supabase
          .from('decision_constraints')
          .insert({
            decision_id: decision.id,
            constraint_id: constraint.id,
            organization_id: organizationId,
            created_at: decision.created_at
          });

        if (!error) constraintLinksCreated++;
      }
    }
    console.log(`   ✅ Created ${constraintLinksCreated} decision-constraint links\n`);

    // ========================================
    // STEP 9: CREATE DEPENDENCIES
    // ========================================
    console.log('🔗 Step 10: Creating decision dependencies...');
    
    const dependencyLinks = [
      { source: 'Implement Mobile Ordering System', target: 'Implement Tiered Loyalty Rewards Program' },
      { source: 'Secure $2M Line of Credit for Expansion', target: 'Open Downtown Location on Market Street' },
      { source: 'Secure $2M Line of Credit for Expansion', target: 'Establish University District Location' },
      { source: 'Implement Comprehensive Barista Training Program', target: 'Open Downtown Location on Market Street' },
      { source: 'Source 100% Fair Trade Certified Coffee', target: 'Transition to 100% Compostable Packaging' },
      { source: 'Launch Instagram Influencer Partnerships', target: 'Launch Seasonal Specialty Drink Menu' },
      { source: 'Invest in Equipment Upgrade Program', target: 'Open Downtown Location on Market Street' }
    ];

    let dependenciesCreated = 0;
    for (const link of dependencyLinks) {
      const source = decisions.find(d => d.title.includes(link.source.substring(0, 25)));
      const target = decisions.find(d => d.title.includes(link.target.substring(0, 25)));
      
      if (source && target) {
        const { error } = await supabase
          .from('dependencies')
          .insert({
            source_decision_id: source.id,
            target_decision_id: target.id,
            organization_id: organizationId,
            created_at: target.created_at
          });

        if (!error) dependenciesCreated++;
      }
    }
    console.log(`   ✅ Created ${dependenciesCreated} dependencies\n`);

    // ========================================
    // STEP 10: CREATE ASSUMPTION CONFLICTS (STRUCTURED)
    // ========================================
    console.log('⚠️  Step 11: Creating assumption conflicts from structured data...');
    
    const assumptionConflictsData = [
      // Budget Conflict - Same timeframe, different amounts
      {
        assumptionA: 'Q3 2026 expansion budget will be $800,000',
        assumptionB: 'Q3 2026 expansion budget allocation is $500,000',
        conflict_type: 'CONTRADICTORY',
        conflict_reason: 'Q3 2026 expansion budget conflict: one assumption states $800,000 while another states $500,000 for the same timeframe',
        confidence_score: 0.95,
        resolved: false
      },
      // Market Direction Conflict - Opposite trends
      {
        assumptionA: 'Coffee consumption in premium segment will increase',
        assumptionB: 'Coffee consumption in premium markets will decrease',
        conflict_type: 'CONTRADICTORY',
        conflict_reason: 'Conflicting market direction for coffee consumption: one assumes increase in premium segment, another assumes decrease due to saturation',
        confidence_score: 0.92,
        resolved: false
      },
      // Timeline Conflict - Minimum > Deadline
      {
        assumptionA: 'New store setup requires minimum 6 months',
        assumptionB: 'Store opening deadline set at 4 months',
        conflict_type: 'CONTRADICTORY',
        conflict_reason: 'Timeline conflict: Minimum duration (6 months) exceeds deadline (4 months) - physically impossible to meet targets',
        confidence_score: 0.98,
        resolved: false
      },
      // Resource Availability Conflict
      {
        assumptionA: 'Skilled baristas are readily available',
        assumptionB: 'Skilled barista shortage in current market',
        conflict_type: 'CONTRADICTORY',
        conflict_reason: 'Conflicting resource availability: one assumes high availability of skilled baristas, another assumes shortage requiring premium wages',
        confidence_score: 0.88,
        resolved: false
      },
      // Resolved conflict - Product vs Sustainability
      {
        assumptionA: 'Plant-based milk alternatives',
        assumptionB: 'Customers value sustainability',
        conflict_type: 'INCOMPATIBLE',
        conflict_reason: 'Market saturation of plant-based milk conflicts with strong sustainability values that should drive continued demand for these options',
        confidence_score: 0.79,
        resolved: true,
        resolved_at: daysAgo(18),
        resolution_action: 'KEEP_BOTH',
        resolution_notes: 'Market saturation refers to variety/options, not demand. Sustainability drives continued usage of existing options. Both valid in different contexts.'
      }
    ];

    let conflictsCreated = 0;
    for (const conflict of assumptionConflictsData) {
      const assumptionA = assumptions.find(a => a.description.includes(conflict.assumptionA));
      const assumptionB = assumptions.find(a => a.description.includes(conflict.assumptionB));
      
      if (!assumptionA) {
        console.log(`   ⚠️  Could not find assumption A: "${conflict.assumptionA}"`);
      }
      if (!assumptionB) {
        console.log(`   ⚠️  Could not find assumption B: "${conflict.assumptionB}"`);
      }
      
      if (assumptionA && assumptionB) {
        const { error } = await supabase
          .from('assumption_conflicts')
          .insert({
            assumption_a_id: assumptionA.id,
            assumption_b_id: assumptionB.id,
            conflict_type: conflict.conflict_type,
            conflict_reason: conflict.conflict_reason,
            confidence_score: conflict.confidence_score,
            resolved: conflict.resolved,
            resolved_at: conflict.resolved_at,
            resolution_action: conflict.resolution_action,
            resolution_notes: conflict.resolution_notes,
            detected_at: daysAgo(30),
            organization_id: organizationId
          });

        if (error) {
          console.log(`   ⚠️  Error creating conflict: ${error.message}`);
        } else {
          conflictsCreated++;
        }
      }
    }
    console.log(`   ✅ Created ${conflictsCreated} assumption conflicts\n`);

    // Verify conflicts were created properly
    const { data: verifyConflicts, error: verifyError } = await supabase
      .from('assumption_conflicts')
      .select('id, assumption_a_id, assumption_b_id, organization_id, conflict_type')
      .eq('organization_id', organizationId);
    
    if (!verifyError && verifyConflicts) {
      console.log(`   🔍 Verification: Found ${verifyConflicts.length} conflicts in database for this org`);
      verifyConflicts.forEach(c => {
        console.log(`      - Conflict ${c.id.substring(0, 8)}: ${c.conflict_type} (org: ${c.organization_id.substring(0, 8)})`);
      });
    } else if (verifyError) {
      console.log(`   ⚠️  Verification error: ${verifyError.message}`);
    }

    // Test RPC function to see if it returns conflicts
    console.log(`   🧪 Testing get_all_assumption_conflicts RPC function...`);
    const { data: rpcConflicts, error: rpcError } = await supabase
      .rpc('get_all_assumption_conflicts', { include_resolved: true });
    
    if (!rpcError && rpcConflicts) {
      console.log(`   ✅ RPC returned ${rpcConflicts.length} conflicts`);
      if (rpcConflicts.length === 0) {
        console.log(`   ⚠️  WARNING: RPC returned 0 conflicts but direct query found ${verifyConflicts?.length || 0}`);
        console.log(`   💡 This suggests an RLS or auth issue with the RPC function`);
      }
    } else if (rpcError) {
      console.log(`   ❌ RPC error: ${rpcError.message}`);
    }



    // ========================================
    // STEP 11: CREATE DECISION CONFLICTS
    // ========================================
    console.log('⚔️  Step 12: Creating decision conflicts...');
    
    const decisionConflictsData = [
      {
        decisionA: 'Open Downtown Location on Market Street',
        decisionB: 'Open Second Downtown Location (Failed)',
        conflict_type: 'RESOURCE_COMPETITION',
        explanation: 'Two downtown locations compete for same customer base and violate minimum distance policy. Second location cannibalized first location revenue.',
        confidence_score: 0.95,
        resolved: true,
        resolved_at: daysAgo(60),
        resolution_action: 'PRIORITIZE_A',
        resolution_notes: 'Closed second location, maintained Market Street flagship. Learned importance of market analysis and distance policies.'
      },
      {
        decisionA: 'Expand to Suburban Mall Food Court',
        decisionB: 'Transition to 100% Compostable Packaging',
        conflict_type: 'RESOURCE_COMPETITION',
        explanation: 'Both initiatives compete for limited capital budget. Mall expansion at risk due to high sustainability investment.',
        confidence_score: 0.78,
        resolved: false
      },
      {
        decisionA: 'Implement Tiered Loyalty Rewards Program',
        decisionB: 'Cut Employee Discount from 50% to 30%',
        conflict_type: 'CONTRADICTORY',
        explanation: 'Building customer loyalty while cutting employee benefits sends contradictory message. Staff are brand ambassadors.',
        confidence_score: 0.82,
        resolved: true,
        resolved_at: daysAgo(14),
        resolution_action: 'PRIORITIZE_A',
        resolution_notes: 'Reversed employee discount cut. Recognized that happy employees create loyal customers. Employee discount restoration was essential.'
      },
      {
        decisionA: 'Reduce Staff Hours to Cut Costs',
        decisionB: 'Implement Comprehensive Barista Training Program',
        conflict_type: 'OBJECTIVE_UNDERMINING',
        explanation: 'Cannot invest in training while cutting hours. Training requires time investment and signals commitment to staff development.',
        confidence_score: 0.91,
        resolved: true,
        resolved_at: daysAgo(8),
        resolution_action: 'PRIORITIZE_B',
        resolution_notes: 'Abandoned cost-cutting approach. Training program is strategic differentiator. Customer experience requires well-trained, adequately staffed locations.'
      },
      {
        decisionA: 'Establish University District Location',
        decisionB: 'Invest in Equipment Upgrade Program',
        conflict_type: 'RESOURCE_COMPETITION',
        explanation: 'Both require significant capital investment ($320K + $380K = $700K). Combined cost approaches annual budget limit.',
        confidence_score: 0.72,
        resolved: false
      },
      {
        decisionA: 'Offer Health Insurance to Part-Time Staff',
        decisionB: 'Reduce Staff Hours to Cut Costs',
        conflict_type: 'CONTRADICTORY',
        explanation: 'Cannot simultaneously invest in employee benefits and cut staff hours. Fundamentally opposing philosophies on labor management.',
        confidence_score: 0.88,
        resolved: true,
        resolved_at: daysAgo(8),
        resolution_action: 'PRIORITIZE_A',
        resolution_notes: 'Chose to invest in people. Cost-cutting through hour reduction proved counterproductive.'
      }
    ];

    let decisionConflictsCreated = 0;
    for (const conflict of decisionConflictsData) {
      const decisionA = decisions.find(d => d.title.includes(conflict.decisionA.substring(0, 25)));
      const decisionB = decisions.find(d => d.title.includes(conflict.decisionB.substring(0, 25)));
      
      if (decisionA && decisionB) {
        const { error } = await supabase
          .from('decision_conflicts')
          .insert({
            decision_a_id: decisionA.id,
            decision_b_id: decisionB.id,
            conflict_type: conflict.conflict_type,
            explanation: conflict.explanation,
            confidence_score: conflict.confidence_score,
            resolved_at: conflict.resolved_at,
            resolution_action: conflict.resolution_action,
            resolution_notes: conflict.resolution_notes,
            detected_at: daysAgo(40),
            organization_id: organizationId
          });

        if (!error) decisionConflictsCreated++;
      }
    }
    console.log(`   ✅ Created ${decisionConflictsCreated} decision conflicts\n`);

    // ========================================
    // STEP 12: CREATE CONSTRAINT VIOLATIONS
    // ========================================
    console.log('🚫 Step 13: Creating constraint violations...');
    
    const violationsData = [
      {
        decision: 'Open Second Downtown Location (Failed)',
        constraint: 'Location Minimum Distance',
        violation_reason: 'New location was only 0.8 miles from existing downtown store, violating 2-mile minimum distance policy.',
        detected_at: daysAgo(75),
        resolved_at: daysAgo(60)
      },
      {
        decision: 'Expand to Suburban Mall Food Court',
        constraint: 'Annual Budget Cap',
        violation_reason: 'Combined expansion projects (Downtown + University + Mall) total $950K, leaving only $50K buffer against $8M annual cap with other initiatives.',
        detected_at: daysAgo(20),
        resolved_at: null
      },
      {
        decision: 'Invest in Equipment Upgrade Program',
        constraint: 'Annual Budget Cap',
        violation_reason: 'Equipment investment of $380K combined with expansion plans exceeds comfortable budget allocation. Risk of cap violation.',
        detected_at: daysAgo(15),
        resolved_at: null
      },
      {
        decision: 'Offer Health Insurance to Part-Time Staff',
        constraint: 'Labor Cost Ratio',
        violation_reason: 'Adding $185K in health insurance costs pushes labor ratio to 34%, exceeding 28-32% policy range.',
        detected_at: daysAgo(12),
        resolved_at: null
      }
    ];

    let violationsCreated = 0;
    for (const violation of violationsData) {
      const decision = decisions.find(d => d.title.includes(violation.decision.substring(0, 25)));
      const constraint = constraints.find(c => c.name.includes(violation.constraint.substring(0, 20)));
      
      if (decision && constraint) {
        const { error } = await supabase
          .from('constraint_violations')
          .insert({
            decision_id: decision.id,
            constraint_id: constraint.id,
            violation_reason: violation.violation_reason,
            detected_at: violation.detected_at,
            resolved_at: violation.resolved_at,
            organization_id: organizationId
          });

        if (!error) violationsCreated++;
      }
    }
    console.log(`   ✅ Created ${violationsCreated} constraint violations\n`);

    // ========================================
    // STEP 13: CREATE DECISION SIGNALS
    // ========================================
    console.log('📡 Step 14: Creating decision signals...');
    
    const signalsData = [
      // Positive Signals
      { decision: 'Launch Seasonal Specialty Drink Menu', type: 'PROGRESS', impact: 'HIGH', description: 'Spring Floral Collection exceeded sales projections by 35%. Lavender Latte becoming signature drink.' },
      { decision: 'Implement Tiered Loyalty Rewards Program', type: 'PROGRESS', impact: 'HIGH', description: 'Achieved 4,723 members (94% of goal). Gold tier members visit 2.8x more frequently than non-members.' },
      { decision: 'Implement Mobile Ordering System', type: 'PROGRESS', impact: 'MEDIUM', description: 'Mobile orders now represent 28% of transactions. Average wait time reduced by 3.5 minutes.' },
      { decision: 'Automate Inventory Management', type: 'PROGRESS', impact: 'MEDIUM', description: 'Pilot locations showing 18% waste reduction. Expanding to all stores in Q3.' },
      { decision: 'Source 100% Fair Trade Certified Coffee', type: 'SIGNAL', impact: 'MEDIUM', description: 'Featured in local newspaper for ethical sourcing commitment. Brand perception improving among conscious consumers.' },
      
      // Risk Signals
      { decision: 'Expand to Suburban Mall Food Court', type: 'RISK', impact: 'HIGH', description: 'Mall traffic down 22% year-over-year. Three anchor tenants closed in last 6 months. Location viability questionable.' },
      { decision: 'Establish University District Location', type: 'RISK', impact: 'MEDIUM', description: 'Summer semester enrollment dropped 15%. July revenue could be problematic. Need contingency plan.' },
      { decision: 'Invest in Equipment Upgrade Program', type: 'RISK', impact: 'HIGH', description: 'Budget analysis shows potential capital shortage. May need to delay or phase implementation.' },
      { decision: 'Offer Health Insurance to Part-Time Staff', type: 'RISK', impact: 'HIGH', description: 'Cost projections increased to $205K due to premium hikes. Significantly impacts labor cost ratio.' },
      { decision: 'Expand Plant-Based Menu Options', type: 'RISK', impact: 'MEDIUM', description: 'Adoption rate only 12% vs projected 25%. High supplier costs eating into margins. Need strategy pivot.' },
      
      // Notes
      { decision: 'Open Downtown Location on Market Street', type: 'NOTE', impact: 'LOW', description: 'Construction permits approved. Contractor selected. Timeline on track for September opening.' },
      { decision: 'Launch Instagram Influencer Partnerships', type: 'NOTE', impact: 'LOW', description: 'Partnership with @LocalFoodieQueen generated 15K impressions in first week. Strong engagement metrics.' },
      { decision: 'Implement Comprehensive Barista Training Program', type: 'NOTE', impact: 'MEDIUM', description: 'First cohort of 8 baristas achieved certification. Customer satisfaction scores up 12% at trained locations.' },
      
      // Failed Decision Signals
      { decision: 'Reduce Staff Hours to Cut Costs', type: 'SIGNAL', impact: 'HIGH', description: 'Customer complaints increased 180%. Multiple negative online reviews citing slow service and undertrained staff.' },
      { decision: 'Cut Employee Discount from 50% to 30%', type: 'SIGNAL', impact: 'HIGH', description: 'Employee morale survey shows 78% dissatisfaction. Three veteran staff members resigned citing benefit cuts.' },
      { decision: 'Radio Advertising Campaign (Deprecated)', type: 'NOTE', impact: 'LOW', description: 'Attribution analysis shows radio campaign contributed less than 2% to new customer acquisition. Digital channels 10x more effective.' },
      { decision: 'Open Second Downtown Location (Failed)', type: 'SIGNAL', impact: 'HIGH', description: 'Market Street location revenue dropped 30% after Pine Street opening. Clear cannibalization effect.' }
    ];

    let signalsCreated = 0;
    for (const signal of signalsData) {
      const decision = decisions.find(d => d.title.includes(signal.decision.substring(0, 25)));
      
      if (decision) {
        const createdAt = signal.type === 'RISK' ? daysAgo(randomInt(3, 15)) : daysAgo(randomInt(5, 30));
        const { error } = await supabase
          .from('decision_signals')
          .insert({
            decision_id: decision.id,
            type: signal.type,
            impact: signal.impact,
            description: signal.description,
            created_at: createdAt,
            created_by: users[0].email,
            organization_id: organizationId
          });

        if (!error) signalsCreated++;
      }
    }
    console.log(`   ✅ Created ${signalsCreated} decision signals\n`);

    // ========================================
    // STEP 14: CREATE DECISION VERSIONS (Version Control)
    // ========================================
    console.log('📚 Step 15: Creating decision versions (version control)...');
    
    let versionsCreated = 0;
    for (const decision of decisions) {
      // Create initial version (creation)
      await supabase
        .from('decision_versions')
        .insert({
          decision_id: decision.id,
          version_number: 1,
          title: decision.title,
          description: decision.description,
          category: decision.category,
          parameters: decision.parameters,
          lifecycle: decision.lifecycle,
          health_signal: decision.health_signal,
          change_type: 'created',
          change_summary: 'Initial decision created',
          changed_by: userId,
          changed_at: decision.created_at,
          organization_id: organizationId
        });
      versionsCreated++;

      // Add governance changes for locked decisions
      if (decision.governance_mode && decision.locked_at) {
        await supabase
          .from('decision_versions')
          .insert({
            decision_id: decision.id,
            version_number: 2,
            title: decision.title,
            description: decision.description,
            category: decision.category,
            parameters: decision.parameters,
            lifecycle: decision.lifecycle,
            health_signal: decision.health_signal,
            change_type: 'governance_lock',
            change_summary: `Decision locked for governance review. Tier: ${decision.governance_tier}`,
            changed_by: userId,
            changed_at: decision.locked_at,
            organization_id: organizationId,
            metadata: {
              governance_tier: decision.governance_tier,
              requires_second_reviewer: decision.requires_second_reviewer
            }
          });
        versionsCreated++;
      }

      // Add lifecycle changes for decisions that changed state
      if (decision.lifecycle === 'RETIRED' || decision.lifecycle === 'INVALIDATED') {
        const versionNumber = decision.governance_mode ? 3 : 2;
        await supabase
          .from('decision_versions')
          .insert({
            decision_id: decision.id,
            version_number: versionNumber,
            title: decision.title,
            description: decision.description,
            category: decision.category,
            parameters: decision.parameters,
            lifecycle: decision.lifecycle,
            health_signal: decision.health_signal,
            change_type: decision.lifecycle === 'RETIRED' ? 'retirement' : 'deprecation',
            change_summary: decision.invalidated_reason || 'Decision deprecated',
            changed_fields: { lifecycle: 'STABLE → ' + decision.lifecycle, health_signal: '90 → ' + decision.health_signal.toString() },
            changed_by: userId,
            changed_at: decision.last_reviewed_at,
            organization_id: organizationId
          });
        versionsCreated++;
      }

      // Add review changes for under review decisions
      if (decision.lifecycle === 'UNDER_REVIEW' || decision.lifecycle === 'AT_RISK') {
        const prevHealth = decision.health_signal + randomInt(15, 25);
        await supabase
          .from('decision_versions')
          .insert({
            decision_id: decision.id,
            version_number: 2,
            title: decision.title,
            description: decision.description,
            category: decision.category,
            parameters: decision.parameters,
            lifecycle: decision.lifecycle,
            health_signal: decision.health_signal,
            change_type: 'lifecycle_changed',
            change_summary: `Health signal declined from ${prevHealth} to ${decision.health_signal}. Moved to ${decision.lifecycle}.`,
            changed_fields: { 
              lifecycle: 'STABLE → ' + decision.lifecycle, 
              health_signal: `${prevHealth} → ${decision.health_signal}`
            },
            changed_by: userId,
            changed_at: decision.last_reviewed_at,
            organization_id: organizationId,
            review_comment: 'Automatic evaluation triggered lifecycle change due to health degradation'
          });
        versionsCreated++;
      }
    }
    console.log(`   ✅ Created ${versionsCreated} decision versions\n`);

    // ========================================
    // STEP 15: CREATE DECISION REVIEWS
    // ========================================
    console.log('🔍 Step 16: Creating decision reviews...');
    
    const reviewsData = [
      { decision: 'Open Downtown Location on Market Street', type: 'routine', outcome: 'reaffirmed', comment: 'On track. Construction proceeding as planned. Budget within limits.' },
      { decision: 'Establish University District Location', type: 'routine', outcome: 'escalated', comment: 'Summer enrollment concerns require deeper analysis. Deferring final approval pending market study.' },
      { decision: 'Expand to Suburban Mall Food Court', type: 'manual', outcome: 'escalated', comment: 'Significant concerns about mall viability. Recommend delayed decision pending competitor analysis.' },
      { decision: 'Implement Mobile Ordering System', type: 'routine', outcome: 'reaffirmed', comment: 'Exceeding expectations. 28% adoption rate. Customer feedback overwhelmingly positive.' },
      { decision: 'Launch Seasonal Specialty Drink Menu', type: 'routine', outcome: 'reaffirmed', comment: 'Strong performer. Spring collection successful. Continue quarterly rotations.' },
      { decision: 'Implement Tiered Loyalty Rewards Program', type: 'routine', outcome: 'reaffirmed', comment: 'Approaching enrollment goal. Repeat visit metrics excellent. High confidence in program.' },
      { decision: 'Transition to 100% Compostable Packaging', type: 'routine', outcome: 'reaffirmed', comment: 'Implementation on schedule. Customer reception positive. Brand alignment strong.' },
      { decision: 'Source 100% Fair Trade Certified Coffee', type: 'routine', outcome: 'reaffirmed', comment: 'Core to brand identity. Supplier relationships strong. Continue commitment.' },
      { decision: 'Reduce Staff Hours to Cut Costs', type: 'conflict_resolution', outcome: 'revised', comment: 'Decision failed catastrophically. Customer experience degraded. Staff turnover unacceptable. Reversing immediately.' },
      { decision: 'Cut Employee Discount from 50% to 30%', type: 'conflict_resolution', outcome: 'revised', comment: 'Penny-wise, pound-foolish. Staff morale critical. Restored benefits and added monthly allowance.' },
      { decision: 'Invest in Equipment Upgrade Program', type: 'manual', outcome: 'deferred', comment: 'Budget constraints require deferral. Phasing implementation over 18 months instead of immediate deployment.', next_review: 45 },
      { decision: 'Offer Health Insurance to Part-Time Staff', type: 'manual', outcome: 'deferred', comment: 'Cost-benefit analysis needed. Premium increases concerning. Exploring alternative providers before commitment.', next_review: 30 }
    ];

    let reviewsCreated = 0;
    for (const review of reviewsData) {
      const decision = decisions.find(d => d.title.includes(review.decision.substring(0, 25)));
      
      if (decision) {
        const previousHealth = decision.health_signal + randomInt(5, 15);
        const { error } = await supabase
          .from('decision_reviews')
          .insert({
            decision_id: decision.id,
            organization_id: organizationId,
            reviewer_id: userId,
            review_type: review.type,
            review_comment: review.comment,
            previous_lifecycle: 'STABLE',
            previous_health_signal: previousHealth,
            new_lifecycle: decision.lifecycle,
            new_health_signal: decision.health_signal,
            reviewed_at: decision.last_reviewed_at,
            review_outcome: review.outcome,
            deferral_reason: review.outcome === 'deferred' ? review.comment : null,
            next_review_date: review.next_review ? daysFromNow(review.next_review) : null,
            changes_since_last_review: {
              health_change: decision.health_signal - previousHealth,
              signals_added: randomInt(0, 3),
              constraints_checked: true
            }
          });

        if (!error) reviewsCreated++;
      }
    }
    console.log(`   ✅ Created ${reviewsCreated} decision reviews\n`);

    // ========================================
    // STEP 16: CREATE EVALUATION HISTORY
    // ========================================
    console.log('📊 Step 17: Creating evaluation history...');
    
    let evaluationsCreated = 0;
    for (const decision of decisions) {
      if (decision.lifecycle !== 'STABLE') {
        const oldHealth = decision.health_signal + randomInt(20, 35);
        const { error } = await supabase
          .from('evaluation_history')
          .insert({
            decision_id: decision.id,
            old_lifecycle: 'STABLE',
            new_lifecycle: decision.lifecycle,
            old_health_signal: oldHealth,
            new_health_signal: decision.health_signal,
            invalidated_reason: decision.invalidated_reason,
            change_explanation: `Health degraded from ${oldHealth} to ${decision.health_signal} due to identified risks and constraint violations.`,
            triggered_by: 'automatic_evaluation',
            trace: {
              broken_assumptions: randomInt(0, 2),
              active_conflicts: randomInt(0, 3),
              constraint_violations: randomInt(0, 2),
              health_calculation: {
                base_score: 100,
                assumption_penalties: -randomInt(0, 20),
                conflict_penalties: -randomInt(0, 15),
                signal_adjustments: -randomInt(5, 15)
              }
            },
            evaluated_at: decision.last_evaluated_at,
            organization_id: organizationId
          });

        if (!error) evaluationsCreated++;
      }
    }
    console.log(`   ✅ Created ${evaluationsCreated} evaluation history records\n`);

    // ========================================
    // STEP 17: CREATE GOVERNANCE AUDIT LOG
    // ========================================
    console.log('📜 Step 18: Creating governance audit log...');
    
    let auditLogsCreated = 0;
    for (const decision of decisions) {
      if (decision.governance_mode) {
        // Lock event
        await supabase
          .from('governance_audit_log')
          .insert({
            decision_id: decision.id,
            organization_id: organizationId,
            action: 'decision_locked',
            requested_by: userId,
            approved_by: userId,
            justification: `Decision locked for governance review. Classified as ${decision.governance_tier} tier due to strategic importance and financial impact.`,
            previous_state: { governance_mode: false, locked: false },
            new_state: { 
              governance_mode: true, 
              locked: true,
              governance_tier: decision.governance_tier,
              requires_second_reviewer: decision.requires_second_reviewer
            },
            created_at: decision.locked_at || decision.created_at,
            resolved_at: decision.locked_at || decision.created_at
          });
        auditLogsCreated++;

        // If decision had changes (retired/invalidated), log approval
        if (decision.lifecycle === 'RETIRED' || decision.lifecycle === 'INVALIDATED') {
          await supabase
            .from('governance_audit_log')
            .insert({
              decision_id: decision.id,
              organization_id: organizationId,
              action: 'edit_approved',
              requested_by: userId,
              approved_by: userId,
              justification: decision.invalidated_reason || 'Decision lifecycle change approved through governance process',
              previous_state: { lifecycle: 'STABLE', health_signal: 85 },
              new_state: { 
                lifecycle: decision.lifecycle, 
                health_signal: decision.health_signal,
                deprecation_outcome: decision.deprecation_outcome
              },
              created_at: daysAgo(randomInt(10, 30)),
              resolved_at: decision.last_reviewed_at
            });
          auditLogsCreated++;
        }
      }
    }
    console.log(`   ✅ Created ${auditLogsCreated} governance audit log entries\n`);

    // ========================================
    // STEP 18: CREATE DECISION RELATION CHANGES
    // ========================================
    console.log('🔄 Step 19: Creating decision relation changes...');
    
    let relationChangesCreated = 0;
    
    // Log some assumption links
    const sampleDecision = decisions.find(d => d.title.includes('Downtown Location'));
    if (sampleDecision) {
      const linkedAssumptions = assumptions.filter(a => 
        ['Coffee consumption', 'Customers value', 'Downtown locations'].some(keyword => 
          a.description.includes(keyword)
        )
      ).slice(0, 3);

      for (const assumption of linkedAssumptions) {
        await supabase
          .from('decision_relation_changes')
          .insert({
            decision_id: sampleDecision.id,
            relation_type: 'assumption',
            relation_id: assumption.id,
            action: 'linked',
            relation_description: assumption.description,
            changed_by: userId,
            changed_at: sampleDecision.created_at,
            reason: 'Initial decision creation and assumption validation',
            organization_id: organizationId
          });
        relationChangesCreated++;
      }
    }

    // Log constraint link
    const budgetDecision = decisions.find(d => d.title.includes('Equipment Upgrade'));
    if (budgetDecision) {
      const budgetConstraint = constraints.find(c => c.name.includes('Budget Cap'));
      if (budgetConstraint) {
        await supabase
          .from('decision_relation_changes')
          .insert({
            decision_id: budgetDecision.id,
            relation_type: 'constraint',
            relation_id: budgetConstraint.id,
            action: 'linked',
            relation_description: budgetConstraint.description,
            changed_by: userId,
            changed_at: budgetDecision.created_at,
            reason: 'Decision requires budget constraint validation',
            organization_id: organizationId
          });
        relationChangesCreated++;
      }
    }

    console.log(`   ✅ Created ${relationChangesCreated} relation change records\n`);

    // ========================================
    // STEP 19: CREATE NOTIFICATIONS
    // ========================================
    console.log('🔔 Step 20: Creating notifications...');
    
    const notificationsData = [
      {
        type: 'HEALTH_DEGRADED',
        severity: 'WARNING',
        title: 'Health Signal Declined: University District Location',
        message: 'Health signal dropped from 85 to 62. Summer enrollment concerns and barista availability issues detected.',
        decision: 'Establish University District Location'
      },
      {
        type: 'HEALTH_DEGRADED',
        severity: 'CRITICAL',
        title: 'Critical Health Degradation: Mall Food Court',
        message: 'Health signal critically low at 45. Mall traffic declining 22% YoY. Immediate review required.',
        decision: 'Expand to Suburban Mall Food Court'
      },
      {
        type: 'LIFECYCLE_CHANGED',
        severity: 'CRITICAL',
        title: 'Decision Invalidated: Staff Hour Reduction',
        message: 'Decision to reduce staff hours has been invalidated due to severe customer experience degradation and staff turnover.',
        decision: 'Reduce Staff Hours to Cut Costs'
      },
      {
        type: 'LIFECYCLE_CHANGED',
        severity: 'CRITICAL',
        title: 'Decision Invalidated: Employee Discount Cut',
        message: 'Employee discount reduction invalidated. Staff morale impact unacceptable. Benefits restored.',
        decision: 'Cut Employee Discount from 50% to 30%'
      },
      {
        type: 'DECISION_CONFLICT',
        severity: 'WARNING',
        title: 'Resource Competition: Expansion vs Equipment',
        message: 'University District expansion and equipment upgrade compete for limited capital. Combined cost exceeds comfortable budget allocation.',
        decision: 'Establish University District Location'
      },
      {
        type: 'DECISION_CONFLICT',
        severity: 'CRITICAL',
        title: 'Contradictory Decisions: Loyalty vs Employee Benefits',
        message: 'Building customer loyalty while cutting employee benefits sends contradictory message. Resolution required.',
        decision: 'Implement Tiered Loyalty Rewards Program'
      },
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'CRITICAL',
        title: 'Budget Conflict: Q3 2026 Expansion - $800K vs $500K',
        message: 'Critical budget conflict detected: Two assumptions for Q3 2026 expansion disagree on amount ($800K vs $500K). Structured parameters detected mismatch.',
        assumption: 'Q3 2026 expansion budget will be $800,000'
      },
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'CRITICAL',
        title: 'Market Direction Conflict: Premium Coffee Consumption',
        message: 'Contradictory market assumptions: One predicts premium coffee consumption increase, another predicts decrease. Requires resolution for expansion planning.',
        assumption: 'Coffee consumption in premium segment will increase'
      },
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'CRITICAL',
        title: 'Timeline Impossible: 6-Month Minimum vs 4-Month Deadline',
        message: 'Critical timeline conflict: Store setup requires minimum 6 months but deadline is 4 months. Physically impossible to meet.',
        assumption: 'New store setup requires minimum 6 months'
      },
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'WARNING',
        title: 'Barista Availability: Conflicting Labor Market Views',
        message: 'Labor market assumptions conflict: High availability vs shortage requiring premium wages. Both impact hiring and expansion strategies.',
        assumption: 'Skilled baristas are readily available'
      },
      {
        type: 'ASSUMPTION_CONFLICT',
        severity: 'INFO',
        title: 'Assumption Conflict Resolved: Plant-Based Saturation vs Sustainability',
        message: 'Conflict resolved: Market saturation refers to variety, not demand. Sustainability continues to drive usage. Both valid in context.',
        assumption: 'Plant-based milk alternatives'
      },
      {
        type: 'NEEDS_REVIEW',
        severity: 'WARNING',
        title: 'Review Required: Equipment Upgrade Program',
        message: 'Decision has high urgency score (74). Budget constraints and timing require immediate review.',
        decision: 'Invest in Equipment Upgrade Program'
      },
      {
        type: 'NEEDS_REVIEW',
        severity: 'WARNING',
        title: 'Scheduled Review: Part-Time Health Insurance',
        message: 'Decision review scheduled in 15 days. Cost-benefit analysis and alternative providers need evaluation.',
        decision: 'Offer Health Insurance to Part-Time Staff'
      }
    ];

    let notificationsCreated = 0;
    for (const notification of notificationsData) {
      const decision = notification.decision ? 
        decisions.find(d => d.title.includes(notification.decision.substring(0, 25))) : null;
      const assumption = notification.assumption ?
        assumptions.find(a => a.description.includes(notification.assumption)) : null;

      const { error } = await supabase
        .from('notifications')
        .insert({
          type: notification.type,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          decision_id: decision?.id,
          assumption_id: assumption?.id,
          is_read: randomInt(0, 100) > 70, // 30% unread
          is_dismissed: false,
          created_at: daysAgo(randomInt(1, 20)),
          read_at: randomInt(0, 100) > 70 ? daysAgo(randomInt(1, 15)) : null,
          organization_id: organizationId
        });

      if (!error) notificationsCreated++;
    }
    console.log(`   ✅ Created ${notificationsCreated} notifications\n`);

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n🎉 ═══════════════════════════════════════════════════════════');
    console.log('   PLOT ARMOR DATA SEEDING COMPLETE!');
    console.log('   ═══════════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log(`   ✅ Organization: ${orgs[0].name}`);
    console.log(`   ✅ User: ${users[0].full_name}`);
    console.log(`   ✅ Parameter Templates: ${templates.length}`);
    console.log(`   ✅ Assumptions: ${assumptions.length}`);
    console.log(`   ✅ Constraints: ${constraints.length}`);
    console.log(`   ✅ Decisions: ${decisions.length}`);
    console.log(`   ✅ Decision-Assumption Links: ${linksCreated}`);
    console.log(`   ✅ Decision-Constraint Links: ${constraintLinksCreated}`);
    console.log(`   ✅ Dependencies: ${dependenciesCreated}`);
    console.log(`   ✅ Assumption Conflicts: ${conflictsCreated}`);
    console.log(`   ✅ Decision Conflicts: ${decisionConflictsCreated}`);
    console.log(`   ✅ Constraint Violations: ${violationsCreated}`);
    console.log(`   ✅ Decision Signals: ${signalsCreated}`);
    console.log(`   ✅ Decision Versions: ${versionsCreated}`);
    console.log(`   ✅ Decision Reviews: ${reviewsCreated}`);
    console.log(`   ✅ Evaluation History: ${evaluationsCreated}`);
    console.log(`   ✅ Governance Audit Logs: ${auditLogsCreated}`);
    console.log(`   ✅ Relation Changes: ${relationChangesCreated}`);
    console.log(`   ✅ Notifications: ${notificationsCreated}`);
    console.log('\n🎬 Features Demonstrated:');
    console.log('   ✅ Decision Conflicts (resource competition, contradictions)');
    console.log('   ✅ Assumption Conflicts (contradictory, mutually exclusive)');
    console.log('   ✅ Report Generation Data (reviews, evaluations)');
    console.log('   ✅ Time Jump (historical data across 220 days)');
    console.log('   ✅ Version Control (complete change tracking)');
    console.log('   ✅ Reviewing (routine, manual, conflict resolution)');
    console.log('   ✅ Deprecation (failed, succeeded, superseded outcomes)');
    console.log('   ✅ Governance (locks, approvals, audit trails)');
    console.log('   ✅ Evaluation Tracking (health signal trends)');
    console.log('   ✅ Decision Signals (risks, progress, notes)');
    console.log('   ✅ Notifications (all types, multiple severities)');
    console.log('   ✅ Constraint Violations (budget, policy, distance)');
    console.log('   ✅ Dependencies (decision chains)');
    console.log('   ✅ Parameter Templates (structured categories)');
    console.log('\n☕ Context: Plot Armor Coffee Co.');
    console.log('   A growing regional coffee shop chain making strategic');
    console.log('   decisions about expansion, operations, sustainability,');
    console.log('   and customer experience in a competitive market.');
    console.log('\n   All decisions are from a NON-TECHNICAL business perspective.');
    console.log('   ═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error during seeding:', error);
    console.error('\nStack trace:', (error as Error).stack);
    process.exit(1);
  }
}

// ============================================================================
// RUN THE SEEDER
// ============================================================================

seedPlotArmorData()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
