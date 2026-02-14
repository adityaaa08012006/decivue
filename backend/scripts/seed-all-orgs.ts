import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function seedAllOrganizations() {
  console.log('🌱 Seeding Templates for All Organizations\n');

  const db = getAdminDatabase();

  try {
    const { data: orgs, error: orgError } = await db
      .from('organizations')
      .select('id, name')
      .order('created_at');

    if (orgError) throw orgError;

    console.log(`Found ${orgs?.length || 0} organizations\n`);

    for (const org of orgs || []) {
      console.log(`📦 ${org.name}...`);
      
      const { data: result, error } = await db
        .rpc('seed_default_parameter_templates', {
          p_organization_id: org.id
        });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log(`   ✅ Seeded ${result || 'successfully'}`);
      }

      // Verify
      const { data: templates } = await db
        .from('parameter_templates')
        .select('id')
        .eq('organization_id', org.id)
        .eq('category', 'assumption_category');

      console.log(`   📊 Total categories: ${templates?.length || 0}`);
    }

    console.log('\n✅ All organizations seeded!\n');

    // Final verification
    console.log('📊 Final Verification:\n');
    for (const org of orgs || []) {
      const { data: categories } = await db
        .from('parameter_templates')
        .select('template_name')
        .eq('organization_id', org.id)
        .eq('category', 'assumption_category')
        .order('display_order');

      console.log(`${org.name}:`);
      if (categories && categories.length > 0) {
        categories.forEach(c => console.log(`  ✓ ${c.template_name}`));
      } else {
        console.log(`  ⚠️  No categories found!`);
      }
      console.log('');
    }

    console.log('🎉 Done! Structured assumption forms should now show categories.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

seedAllOrganizations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
