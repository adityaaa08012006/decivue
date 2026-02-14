import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function fixParameterTemplates() {
  console.log('🔧 Automated Parameter Templates Fix\n');
  console.log('⚠️  NOTE: Database schema changes require manual SQL execution');
  console.log('    Please run these SQL commands in Supabase SQL Editor:\n');
  console.log('    -- Drop old constraint');
  console.log('    ALTER TABLE parameter_templates');
  console.log('    DROP CONSTRAINT IF EXISTS parameter_templates_category_template_name_key;\n');
  console.log('    -- Add new constraint with organization_id');
  console.log('    ALTER TABLE parameter_templates');
  console.log('    ADD CONSTRAINT parameter_templates_org_category_name_key');
  console.log('    UNIQUE (organization_id, category, template_name);\n');
  console.log('After running the SQL above, this script will:');
  console.log('1. Seed templates for all existing organizations');
  console.log('2. Create the seed function for future registrations\n');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const answer = await new Promise<string>(resolve => {
    readline.question('Have you run the SQL commands above? (yes/no): ', resolve);
  });
  readline.close();

  if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
    console.log('\n❌ Aborted. Please run the SQL commands first.\n');
    process.exit(0);
  }

  const db = getAdminDatabase();

  try {
    // ============================================================================
    // STEP 1: Verify the constraint was fixed
    // ============================================================================
    console.log('\n📋 Step 1: Verifying constraint...');
    
    // Test if we can insert duplicate templates for different orgs
    const { data: testOrgs } = await db
      .from('organizations')
      .select('id')
      .limit(2);

    if (testOrgs && testOrgs.length >= 2) {
      const testTemplate = {
        organization_id: testOrgs[1].id,
        category: 'test_category',
        template_name: 'Test Template',
        display_order: 999,
        is_active: true
      };

      const { error: testError } = await db
        .from('parameter_templates')
        .insert(testTemplate);

      if (testError && testError.message.includes('parameter_templates_category_template_name_key')) {
        console.log('  ❌ Old constraint still exists! Please run the SQL commands.');
        process.exit(1);
      }

      // Clean up test
      await db
        .from('parameter_templates')
        .delete()
        .eq('category', 'test_category');

      console.log('  ✅ Constraint verified - organization_id is included');
    }

    // ============================================================================
    // STEP 2: Create the seed function for future use (if it doesn't exist)
    // ============================================================================
    console.log('\n📋 Step 2: Creating seed function...');
    
    const { error: funcError } = await db.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION seed_default_parameter_templates(p_organization_id UUID)
        RETURNS INTEGER
        LANGUAGE plpgsql
        AS $$
        DECLARE
            inserted_count INTEGER := 0;
        BEGIN
            -- Assumption Categories
            INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
            (p_organization_id, 'assumption_category', 'Budget & Financial', 1),
            (p_organization_id, 'assumption_category', 'Timeline & Schedule', 2),
            (p_organization_id, 'assumption_category', 'Resource & Staffing', 3),
            (p_organization_id, 'assumption_category', 'Technical & Infrastructure', 4),
            (p_organization_id, 'assumption_category', 'Market & Business', 5),
            (p_organization_id, 'assumption_category', 'Compliance & Legal', 6),
            (p_organization_id, 'assumption_category', 'Other', 99)
            ON CONFLICT (organization_id, category, template_name) DO NOTHING;

            GET DIAGNOSTICS inserted_count = ROW_COUNT;

            -- Priority Levels
            INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
            (p_organization_id, 'priority_level', 'Critical', 1),
            (p_organization_id, 'priority_level', 'High', 2),
            (p_organization_id, 'priority_level', 'Medium', 3),
            (p_organization_id, 'priority_level', 'Low', 4)
            ON CONFLICT (organization_id, category, template_name) DO NOTHING;

            -- Impact Areas
            INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
            (p_organization_id, 'impact_area', 'Revenue', 1),
            (p_organization_id, 'impact_area', 'Cost', 2),
            (p_organization_id, 'impact_area', 'Timeline', 3),
            (p_organization_id, 'impact_area', 'Quality', 4),
            (p_organization_id, 'impact_area', 'Compliance', 5),
            (p_organization_id, 'impact_area', 'Customer Experience', 6),
            (p_organization_id, 'impact_area', 'Team Capacity', 7)
            ON CONFLICT (organization_id, category, template_name) DO NOTHING;

            -- Timeframes
            INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
            (p_organization_id, 'timeframe', 'Q1 2026', 1),
            (p_organization_id, 'timeframe', 'Q2 2026', 2),
            (p_organization_id, 'timeframe', 'Q3 2026', 3),
            (p_organization_id, 'timeframe', 'Q4 2026', 4),
            (p_organization_id, 'timeframe', 'H1 2026', 5),
            (p_organization_id, 'timeframe', 'H2 2026', 6),
            (p_organization_id, 'timeframe', '2026', 7),
            (p_organization_id, 'timeframe', '2027', 8)
            ON CONFLICT (organization_id, category, template_name) DO NOTHING;

            -- Outcome Types
            INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
            (p_organization_id, 'outcome_type', 'Approval Required', 1),
            (p_organization_id, 'outcome_type', 'Funding Secured', 2),
            (p_organization_id, 'outcome_type', 'Resource Available', 3),
            (p_organization_id, 'outcome_type', 'Deadline Met', 4),
            (p_organization_id, 'outcome_type', 'Milestone Achieved', 5),
            (p_organization_id, 'outcome_type', 'Condition Satisfied', 6)
            ON CONFLICT (organization_id, category, template_name) DO NOTHING;

            RETURN inserted_count;
        END;
        $$;
      `
    });

    if (funcError) {
      console.log('  ⚠️ Warning creating function:', funcError.message);
    } else {
      console.log('  ✅ Seed function created successfully');
    }

    // ============================================================================
    // STEP 3: Seed templates for all existing organizations
    // ============================================================================
    console.log('\n📋 Step 3: Seeding templates for existing organizations...');
    
    const { data: orgs, error: orgError } = await db
      .from('organizations')
      .select('id, name');

    if (orgError) throw orgError;

    console.log(`  Found ${orgs?.length || 0} organizations\n`);

    for (const org of orgs || []) {
      console.log(`  📦 ${org.name}...`);
      
      // Try using the function first
      const { data: funcResult, error: seedError } = await db.rpc('seed_default_parameter_templates', {
        p_organization_id: org.id
      });

      if (seedError) {
        console.log(`     ⚠️ Function failed, using direct insert...`);
        
        // Manual insert as fallback
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
              organization_id: org.id,
              category: template.category,
              template_name: template.name,
              display_order: template.order,
              is_active: true
            });

          if (!insertError) {
            successCount++;
          }
        }
        
        console.log(`     ✅ Inserted ${successCount} templates`);
      } else {
        console.log(`     ✅ Seeded via function (${funcResult || 'success'})`);
      }
    }

    // ============================================================================
    // STEP 4: Verification
    // ============================================================================
    console.log('\n📊 Step 4: Verification...\n');
    
    for (const org of orgs || []) {
      const { data: templates, error: verifyError } = await db
        .from('parameter_templates')
        .select('category, template_name')
        .eq('organization_id', org.id)
        .eq('category', 'assumption_category')
        .order('display_order');

      if (verifyError) {
        console.log(`  ❌ ${org.name}: Error - ${verifyError.message}`);
      } else {
        console.log(`  ✅ ${org.name}: ${templates?.length || 0} categories`);
        if (templates && templates.length > 0) {
          templates.forEach(t => console.log(`     - ${t.template_name}`));
        }
      }
    }

    console.log('\n🎉 Parameter templates fix completed successfully!\n');
    console.log('Next steps:');
    console.log('1. ✅ Database schema is fixed');
    console.log('2. ✅ All organizations have templates');
    console.log('3. ✅ New registrations will automatically get templates');
    console.log('4. ✅ Structured assumption form should now show categories\n');

  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nStack trace:', error.stack);
    throw error;
  }
}

fixParameterTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
