/**
 * Cleanup Duplicate Parameter Templates
 * Removes duplicate templates from Decivue organization
 */

import { getDatabase, getAdminDatabase, initializeDatabase } from '../src/data/database';
import '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function cleanupDuplicates() {
  try {
    console.log('🔧 Cleaning up duplicate parameter templates\n');

    const adminClient = getAdminDatabase();

    // Step 1: Find Decivue organization
    const { data: decivueOrg, error: orgError } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('name', 'Decivue')
      .single();

    if (orgError || !decivueOrg) {
      console.log('❌ Decivue organization not found');
      return;
    }

    console.log(`📋 Organization: ${decivueOrg.name}`);
    console.log(`🆔 ID: ${decivueOrg.id}\n`);

    // Step 2: Get all templates for Decivue
    const { data: templates, error: templatesError } = await adminClient
      .from('parameter_templates')
      .select('*')
      .eq('organization_id', decivueOrg.id)
      .order('category', { ascending: true })
      .order('template_name', { ascending: true })
      .order('created_at', { ascending: true });

    if (templatesError) {
      console.log(`❌ Error fetching templates: ${templatesError.message}`);
      return;
    }

    console.log(`📊 Total templates found: ${templates?.length || 0}\n`);

    // Step 3: Find duplicates (group by category + template_name)
    const templateMap = new Map<string, any[]>();

    templates?.forEach(template => {
      const key = `${template.category}:${template.template_name}`;
      if (!templateMap.has(key)) {
        templateMap.set(key, []);
      }
      templateMap.get(key)!.push(template);
    });

    // Step 4: Identify which ones are duplicates
    const duplicates: string[] = [];
    const toDelete: string[] = [];

    templateMap.forEach((templates, key) => {
      if (templates.length > 1) {
        duplicates.push(key);
        // Keep the first one (oldest), delete the rest
        for (let i = 1; i < templates.length; i++) {
          toDelete.push(templates[i].id);
        }
      }
    });

    console.log(`🔍 Found ${duplicates.length} duplicate template groups:\n`);
    duplicates.forEach(key => {
      const [category, name] = key.split(':');
      const count = templateMap.get(key)!.length;
      console.log(`  - ${category} / ${name} (${count} copies)`);
    });

    console.log(`\n🗑️  Templates to delete: ${toDelete.length}\n`);

    if (toDelete.length === 0) {
      console.log('✅ No duplicates found! Database is clean.\n');
      return;
    }

    // Step 5: Delete duplicates
    const { error: deleteError } = await adminClient
      .from('parameter_templates')
      .delete()
      .in('id', toDelete);

    if (deleteError) {
      console.log(`❌ Error deleting duplicates: ${deleteError.message}`);
      return;
    }

    console.log(`✅ Successfully deleted ${toDelete.length} duplicate templates\n`);

    // Step 6: Verify final count
    const { data: finalTemplates } = await adminClient
      .from('parameter_templates')
      .select('category, template_name')
      .eq('organization_id', decivueOrg.id)
      .order('category');

    console.log(`📊 Final template count: ${finalTemplates?.length || 0}\n`);

    // Group by category for display
    const categoryGroups = new Map<string, number>();
    finalTemplates?.forEach(t => {
      categoryGroups.set(t.category, (categoryGroups.get(t.category) || 0) + 1);
    });

    console.log('Categories:');
    categoryGroups.forEach((count, category) => {
      console.log(`  - ${category}: ${count} templates`);
    });

    console.log('\n✨ Cleanup complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

cleanupDuplicates()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
