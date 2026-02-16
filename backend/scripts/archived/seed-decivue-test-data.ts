import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function seedDecivueAndCreateTestData() {
  console.log('🔧 Seeding Decivue Organization and Creating Test Data\n');

  const db = getAdminDatabase();

  try {
    // ============================================================================
    // STEP 1: Get Decivue organization
    // ============================================================================
    console.log('📋 Step 1: Finding Decivue organization...');
    
    const { data: decivueOrg, error: orgError } = await db
      .from('organizations')
      .select('id, name')
      .eq('name', 'Decivue')
      .single();

    if (orgError || !decivueOrg) {
      throw new Error('Decivue organization not found');
    }

    console.log(`  ✅ Found: ${decivueOrg.name} (ID: ${decivueOrg.id})\n`);

    // ============================================================================
    // STEP 2: Manually seed templates for Decivue
    // ============================================================================
    console.log('📋 Step 2: Seeding parameter templates...');
    
    const templates = [
      { category: 'assumption_category', name: 'Budget & Financial', order: 1 },
      { category: 'assumption_category', name: 'Timeline & Schedule', order: 2 },
      { category: 'assumption_category', name: 'Resource & Staffing', order: 3 },
      { category: 'assumption_category', name: 'Technical & Infrastructure', order: 4 },
      { category: 'assumption_category', name: 'Market & Business', order: 5 },
      { category: 'assumption_category', name: 'Compliance & Legal', order: 6 },
      { category: 'assumption_category', name: 'Other', order: 99 },
      { category: 'priority_level', name: 'Critical', order: 1 },
      { category: 'priority_level', name: 'High', order: 2 },
      { category: 'priority_level', name: 'Medium', order: 3 },
      { category: 'priority_level', name: 'Low', order: 4 },
      { category: 'timeframe', name: 'Q1 2026', order: 1 },
      { category: 'timeframe', name: 'Q2 2026', order: 2 },
      { category: 'timeframe', name: 'Q3 2026', order: 3 },
      { category: 'timeframe', name: 'Q4 2026', order: 4 },
      { category: 'timeframe', name: 'H1 2026', order: 5 },
      { category: 'timeframe', name: 'H2 2026', order: 6 },
      { category: 'timeframe', name: '2026', order: 7 },
      { category: 'timeframe', name: '2027', order: 8 },
      { category: 'outcome_type', name: 'Approval Required', order: 1 },
      { category: 'outcome_type', name: 'Funding Secured', order: 2 },
      { category: 'outcome_type', name: 'Resource Available', order: 3 },
      { category: 'outcome_type', name: 'Deadline Met', order: 4 },
      { category: 'outcome_type', name: 'Milestone Achieved', order: 5 },
      { category: 'outcome_type', name: 'Condition Satisfied', order: 6 },
    ];

    let successCount = 0;
    for (const template of templates) {
      const { error: insertError } = await db
        .from('parameter_templates')
        .insert({
          organization_id: decivueOrg.id,
          category: template.category,
          template_name: template.name,
          display_order: template.order,
          is_active: true
        });

      if (!insertError) {
        successCount++;
      } else if (!insertError.message.includes('duplicate')) {
        console.log(`  ⚠️ ${template.name}: ${insertError.message}`);
      }
    }
    
    console.log(`  ✅ Created ${successCount} templates\n`);

    // Verify
    const { data: categories } = await db
      .from('parameter_templates')
      .select('template_name')
      .eq('organization_id', decivueOrg.id)
      .eq('category', 'assumption_category')
      .order('display_order');

    console.log('  Categories available:');
    categories?.forEach(c => console.log(`    - ${c.template_name}`));
    console.log('');

    // ============================================================================
    // STEP 3: Get a user from Decivue org for creating test data
    // ============================================================================
    console.log('📋 Step 3: Finding Decivue user...');
    
    const { data: decivueUser, error: userError } = await db
      .from('users')
      .select('id, full_name, email')
      .eq('organization_id', decivueOrg.id)
      .limit(1)
      .single();

    if (userError || !decivueUser) {
      console.log('  ⚠️ No users found in Decivue organization');
      console.log('  Skipping test data creation (need a user)\n');
      return;
    }

    console.log(`  ✅ Found user: ${decivueUser.full_name} (${decivueUser.email})\n`);

    // ============================================================================
    // STEP 4: Create test decisions
    // ============================================================================
    console.log('📋 Step 4: Creating test decisions...');
    
    const testDecisions = [
      {
        title: 'Migrate to Cloud Infrastructure',
        description: 'Move all services from on-premise to AWS cloud infrastructure to improve scalability and reduce maintenance costs.',
        lifecycle: 'STABLE',
        health_signal: 85,
        created_by: decivueUser.id,
        organization_id: decivueOrg.id,
        expiry_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
        metadata: { category: 'technical', priority: 'high' }
      },
      {
        title: 'Implement New CRM System',
        description: 'Replace legacy CRM with modern cloud-based solution to improve customer relationship management and sales tracking.',
        lifecycle: 'STABLE',
        health_signal: 90,
        created_by: decivueUser.id,
        organization_id: decivueOrg.id,
        expiry_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days
        metadata: { category: 'business', priority: 'medium' }
      },
      {
        title: 'Expand to European Market',
        description: 'Establish presence in 3 European countries by Q4 2026, including hiring local teams and setting up operations.',
        lifecycle: 'STABLE',
        health_signal: 95,
        created_by: decivueUser.id,
        organization_id: decivueOrg.id,
        expiry_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString(), // 270 days
        metadata: { category: 'strategic', priority: 'critical' }
      }
    ];

    const createdDecisions = [];
    for (const decision of testDecisions) {
      const { data, error } = await db
        .from('decisions')
        .insert(decision)
        .select()
        .single();

      if (error) {
        console.log(`  ❌ Failed to create "${decision.title}": ${error.message}`);
      } else {
        console.log(`  ✅ Created decision: "${decision.title}"`);
        createdDecisions.push(data);
      }
    }
    console.log('');

    // ============================================================================
    // STEP 5: Create organizational assumptions
    // ============================================================================
    console.log('📋 Step 5: Creating organizational assumptions..');
    
    const orgAssumptions = [
      {
        description: 'Annual IT budget will not exceed $2.5M for 2026',
        status: 'VALID',
        metadata: { 
          category: 'Budget & Financial', 
          parameters: { amount: '2500000', timeframe: '2026', outcome: 'Funding Secured' },
          scope: 'organizational'
        },
        organization_id: decivueOrg.id,
      },
      {
        description: 'All cloud services must comply with SOC 2 Type II certification',
        status: 'VALID',
        metadata: { 
          category: 'Compliance & Legal', 
          parameters: { outcome: 'Condition Satisfied' },
          scope: 'organizational'
        },
        organization_id: decivueOrg.id,
      },
      {
        description: 'Q3 2026 hiring plan for 5 senior engineers will be approved',
        status: 'VALID',
        metadata: { 
          category: 'Resource & Staffing', 
          parameters: { timeframe: 'Q3 2026', outcome: 'Approval Required' },
          scope: 'organizational'
        },
        organization_id: decivueOrg.id,
      }
    ];

    const createdAssumptions = [];
    for (const assumption of orgAssumptions) {
      const { data, error } = await db
        .from('assumptions')
        .insert(assumption)
        .select()
        .single();

      if (error) {
        console.log(`  ❌ Failed to create org assumption: ${error.message}`);
      } else {
        createdAssumptions.push(data);
        console.log(`  ✅ Created: "${assumption.description.substring(0, 50)}..."`);
      }
    }
    console.log('');

    // ============================================================================
    // STEP 6: Create decision-specific assumptions
    // ============================================================================
    console.log('📋 Step 6: Creating decision-specific assumptions...');
    
    if (createdDecisions.length >= 2) {
      const cloudDecision = createdDecisions[0]; // Cloud migration
      const crmDecision = createdDecisions[1]; // CRM system
      
      const decisionAssumptions = [
        {
          assumption: {
            description: 'AWS migration can be completed within 6 months',
            status: 'VALID',
            metadata: { 
              category: 'Timeline & Schedule', 
              parameters: { timeframe: 'H2 2026', outcome: 'Milestone Achieved' },
              scope: 'decision'
            },
            organization_id: decivueOrg.id,
          },
          decisionId: cloudDecision.id
        },
        {
          assumption: {
            description: 'Current development team has AWS expertise',
            status: 'VALID',
            metadata: { 
              category: 'Resource & Staffing', 
              parameters: { resourceType: 'AWS Engineers', outcome: 'Resource Available' },
              scope: 'decision'
            },
            organization_id: decivueOrg.id,
          },
          decisionId: cloudDecision.id
        },
        {
          assumption: {
            description: 'CRM vendor will provide 6 months of free support',
            status: 'VALID',
            metadata: { 
              category: 'Budget & Financial', 
              parameters: { timeframe: 'H1 2026', outcome: 'Condition Satisfied' },
              scope: 'decision'
            },
            organization_id: decivueOrg.id,
          },
          decisionId: crmDecision.id
        },
        {
          assumption: {
            description: 'Sales team training will be completed by Q2 2026',
            status: 'VALID',
            metadata: { 
              category: 'Timeline & Schedule', 
              parameters: { timeframe: 'Q2 2026', outcome: 'Deadline Met' },
              scope: 'decision'
            },
            organization_id: decivueOrg.id,
          },
          decisionId: crmDecision.id
        }
      ];

      for (const { assumption, decisionId } of decisionAssumptions) {
        // Create assumption
        const { data: createdAssumption, error: assumptionError } = await db
          .from('assumptions')
          .insert(assumption)
          .select()
          .single();

        if (assumptionError) {
          console.log(`  ❌ Failed to create assumption: ${assumptionError.message}`);
          continue;
        }

        // Link to decision
        const { error: linkError } = await db
          .from('decision_assumptions')
          .insert({
            decision_id: decisionId,
            assumption_id: createdAssumption.id
          });

        if (linkError) {
          console.log(`  ❌ Failed to link assumption to decision: ${linkError.message}`);
        } else {
          console.log(`  ✅ Created & linked: "${assumption.description.substring(0, 50)}..."`);
        }
      }
    }
    console.log('');

    // ============================================================================
    // STEP 7: Summary
    // ============================================================================
    console.log('📊 Summary:\n');
    
    const { count: decisionCount } = await db
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', decivueOrg.id);

    const { count: assumptionCount } = await db
      .from('assumptions')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', decivueOrg.id);

    const { count: templateCount } = await db
      .from('parameter_templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', decivueOrg.id);

    console.log(`  Organization: ${decivueOrg.name}`);
    console.log(`  📋 Templates: ${templateCount || 0}`);
    console.log(`  📌 Decisions: ${decisionCount || 0}`);
    console.log(`  💭 Assumptions: ${assumptionCount || 0}`);
    console.log('');
    console.log('🎉 Test data created successfully!\n');
    console.log('You can now:');
    console.log('  - View decisions in the Decision Monitoring page');
    console.log('  - Create assumptions using structured mode');
    console.log('  - Test conflict detection\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

seedDecivueAndCreateTestData()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
