import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize database
initializeDatabase();

async function seedTemplates() {
  console.log('🔧 Seeding parameter templates for all organizations\n');
  console.log('ENV check:', {
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasUrl: !!process.env.SUPABASE_URL
  });

  try {
    const db = getAdminDatabase();

    // Get all organizations
    const { data: orgs, error: orgError } = await db
      .from('organizations')
      .select('id, name');

    if (orgError) throw orgError;

    console.log(`Found ${orgs?.length || 0} organizations\n`);

    for (const org of orgs || []) {
      console.log(`📋 Seeding templates for: ${org.name}`);
      
      // Call the seed function
      const { data, error } = await db.rpc('seed_default_parameter_templates', {
        p_organization_id: org.id
      });

      if (error) {
        console.error(`❌ Error for ${org.name}:`, error.message);
        
        // If function doesn't exist, create templates manually
        if (error.message.includes('does not exist') || error.message.includes('could not find') || error.message.includes('Could not find')) {
          console.log('⚠️ Function not found, creating templates manually...');
          
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

          for (const template of templates) {
            const { data, error: insertError } = await db
              .from('parameter_templates')
              .insert({
                organization_id: org.id,
                category: template.category,
                template_name: template.name,
                display_order: template.order,
                is_active: true
              })
              .select()
              .single();

            if (insertError) {
              console.error(`  ❌ ${template.category}/${template.name}: ${insertError.message}`);
            }
          }
          
          console.log(`  ✅ Manually created templates for ${org.name}`);
        }
      } else {
        console.log(`  ✅ Seeded ${data || 'templates'} for ${org.name}`);
      }
    }

    // Verify
    console.log('\n📊 Verification:');
    for (const org of orgs || []) {
      const { data: templates, error: checkError } = await db
        .from('parameter_templates')
        .select('category, template_name')
        .eq('organization_id', org.id)
        .eq('category', 'assumption_category');

      if (!checkError) {
        console.log(`  ${org.name}: ${templates?.length || 0} categories`);
        templates?.forEach(t => console.log(`    - ${t.template_name}`));
      }
    }

    console.log('\n🎉 Seeding complete!\n');
  } catch (error: any) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

seedTemplates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
