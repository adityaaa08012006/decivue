import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function seedMissingTemplates() {
  try {
    console.log('🔍 Finding organization...');
    
    const supabase = getAdminDatabase();
    
    // Get Decivue organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'Decivue')
      .single();

    if (orgError || !org) {
      console.error('❌ Organization not found:', orgError);
      process.exit(1);
    }

    console.log(`✅ Found organization: ${org.name} (${org.id})`);

    // Check what templates already exist
    const { data: existingTemplates } = await supabase
      .from('parameter_templates')
      .select('category, template_name')
      .eq('organization_id', org.id);

    console.log('\n📋 Existing templates:');
    const existingByCategory = (existingTemplates || []).reduce((acc: any, t: any) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t.template_name);
      return acc;
    }, {});
    
    Object.entries(existingByCategory).forEach(([cat, names]) => {
      console.log(`  ${cat}: ${(names as string[]).length} templates`);
    });

    // Define all default templates
    const allTemplates = [
      // Impact Areas
      { category: 'impact_area', name: 'Revenue', order: 1 },
      { category: 'impact_area', name: 'Cost', order: 2 },
      { category: 'impact_area', name: 'Timeline', order: 3 },
      { category: 'impact_area', name: 'Quality', order: 4 },
      { category: 'impact_area', name: 'Compliance', order: 5 },
      { category: 'impact_area', name: 'Customer Experience', order: 6 },
      { category: 'impact_area', name: 'Team Capacity', order: 7 },
      
      // Timeframes
      { category: 'timeframe', name: 'Immediate (< 1 month)', order: 1 },
      { category: 'timeframe', name: 'Short-term (1-3 months)', order: 2 },
      { category: 'timeframe', name: 'Medium-term (3-6 months)', order: 3 },
      { category: 'timeframe', name: 'Long-term (6-12 months)', order: 4 },
      { category: 'timeframe', name: 'Extended (> 1 year)', order: 5 },
      
      // Outcome Types
      { category: 'outcome_type', name: 'Budget Available', order: 1 },
      { category: 'outcome_type', name: 'Budget Exceeded', order: 2 },
      { category: 'outcome_type', name: 'On Schedule', order: 3 },
      { category: 'outcome_type', name: 'Delayed', order: 4 },
      { category: 'outcome_type', name: 'Resource Available', order: 5 },
      { category: 'outcome_type', name: 'Resource Unavailable', order: 6 },
      
      // Priority Levels
      { category: 'priority_level', name: 'Critical', order: 1 },
      { category: 'priority_level', name: 'High', order: 2 },
      { category: 'priority_level', name: 'Medium', order: 3 },
      { category: 'priority_level', name: 'Low', order: 4 },
    ];

    // Filter out templates that already exist
    const templatesToAdd = allTemplates.filter(t => {
      const existing = existingByCategory[t.category] || [];
      return !existing.includes(t.name);
    });

    if (templatesToAdd.length === 0) {
      console.log('\n✅ All templates already exist! Nothing to add.');
      return;
    }

    console.log(`\n➕ Adding ${templatesToAdd.length} missing templates...`);

    // Insert missing templates
    const insertData = templatesToAdd.map(t => ({
      organization_id: org.id,
      category: t.category,
      template_name: t.name,
      display_order: t.order,
      is_active: true
    }));

    const { data: inserted, error: insertError } = await supabase
      .from('parameter_templates')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('❌ Failed to insert templates:', insertError);
      process.exit(1);
    }

    console.log(`\n✅ Successfully added ${inserted?.length || 0} templates!`);

    // Show summary by category
    const addedByCategory = templatesToAdd.reduce((acc: any, t: any) => {
      if (!acc[t.category]) acc[t.category] = [];
      acc[t.category].push(t.name);
      return acc;
    }, {});

    console.log('\n📊 Added templates by category:');
    Object.entries(addedByCategory).forEach(([cat, names]) => {
      console.log(`  ${cat}:`);
      (names as string[]).forEach(name => console.log(`    - ${name}`));
    });

    console.log('\n🎉 Done!');

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  }
}

seedMissingTemplates();
