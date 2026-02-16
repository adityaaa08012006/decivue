import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function completeTemplateFix() {
  console.log('🔧 Complete Parameter Templates Fix\n');
  
  const db = getAdminDatabase();

  try {
    // ============================================================================
    // STEP 1: Delete old templates that were created without proper org isolation
    // ============================================================================
    console.log('📋 Step 1: Cleaning up templates...');
    
    const { data: beforeCount } = await db
      .from('parameter_templates')
      .select('id', { count: 'exact', head: true });
    
    console.log(`  Found ${beforeCount} existing templates`);

    // Check if there are templates from the first org that are blocking others
    const { data: firstOrg } = await db
      .from('organizations')
      .select('id, name')
      .order('created_at')
      .limit(1)
      .single();

    if (firstOrg) {
      const { data: firstOrgTemplates } = await db
        .from('parameter_templates')
        .select('id')
        .eq('organization_id', firstOrg.id);

      console.log(`  ${firstOrg.name} has ${firstOrgTemplates?.length || 0} templates`);
    }

    // ============================================================================
    // STEP 2: Show SQL to run manually
    // ============================================================================
    console.log('\n📋 Step 2: Database Schema Fix Required\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Please run this SQL in your Supabase SQL Editor:');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('-- Fix the unique constraint to include organization_id');
    console.log('ALTER TABLE parameter_templates');
    console.log('DROP CONSTRAINT IF EXISTS parameter_templates_category_template_name_key;');
    console.log('');
    console.log('ALTER TABLE parameter_templates');
    console.log('ADD CONSTRAINT parameter_templates_org_category_name_key');
    console.log('UNIQUE (organization_id, category, template_name);');
    console.log('');
    console.log('-- Create the seed function for new organizations');
    console.log(`CREATE OR REPLACE FUNCTION seed_default_parameter_templates(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER := 0;
BEGIN
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'assumption_category', 'Budget & Financial', 1),
    (p_organization_id, 'assumption_category', 'Timeline & Schedule', 2),
    (p_organization_id, 'assumption_category', 'Resource & Staffing', 3),
    (p_organization_id, 'assumption_category', 'Technical & Infrastructure', 4),
    (p_organization_id, 'assumption_category', 'Market & Business', 5),
    (p_organization_id, 'assumption_category', 'Compliance & Legal', 6),
    (p_organization_id, 'assumption_category', 'Other', 99),
    (p_organization_id, 'priority_level', 'Critical', 1),
    (p_organization_id, 'priority_level', 'High', 2),
    (p_organization_id, 'priority_level', 'Medium', 3),
    (p_organization_id, 'priority_level', 'Low', 4),
    (p_organization_id, 'timeframe', 'Q1 2026', 1),
    (p_organization_id, 'timeframe', 'Q2 2026', 2),
    (p_organization_id, 'timeframe', 'Q3 2026', 3),
    (p_organization_id, 'timeframe', 'Q4 2026', 4),
    (p_organization_id, 'timeframe', 'H1 2026', 5),
    (p_organization_id, 'timeframe', 'H2 2026', 6),
    (p_organization_id, 'timeframe', '2026', 7),
    (p_organization_id, 'timeframe', '2027', 8),
    (p_organization_id, 'outcome_type', 'Approval Required', 1),
    (p_organization_id, 'outcome_type', 'Funding Secured', 2),
    (p_organization_id, 'outcome_type', 'Resource Available', 3),
    (p_organization_id, 'outcome_type', 'Deadline Met', 4),
    (p_organization_id, 'outcome_type', 'Milestone Achieved', 5),
    (p_organization_id, 'outcome_type', 'Condition Satisfied', 6)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;`);
    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // ============================================================================
   // STEP 3: After SQL is run, seed templates for all orgs
    // ============================================================================
    console.log('📋 Step 3: After running the SQL above...\n');
    console.log('Run this command to seed templates for all organizations:');
    console.log('  npx tsx scripts/seed-all-orgs.ts\n');

    console.log('Or run this to seed for existing orgs right now:');
    console.log('  (Press any key to continue after running the SQL, or Ctrl+C to exit)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

completeTemplateFix()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
