/**
 * Check Parameter Templates Constraint
 * Verifies the constraint on parameter_templates table
 */

import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function checkConstraint() {
  try {
    console.log('🔍 Checking parameter_templates constraint\n');

    const adminClient = getAdminDatabase();

    // Check constraint using raw SQL
    const { data, error } = await adminClient.rpc('exec_sql', {
      sql: `
        SELECT 
          con.conname AS constraint_name,
          pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'parameter_templates'
        AND con.contype = 'u'
        ORDER BY con.conname;
      `
    });

    if (error) {
      console.log('❌ Error checking constraint:', error.message);
      console.log('\nTrying alternative method...\n');
      
      // Try getting all templates to see the current state
      const { data: templates, error: templatesError } = await adminClient
        .from('parameter_templates')
        .select('*')
        .limit(5);

      if (templatesError) {
        console.log('❌ Error fetching templates:', templatesError.message);
      } else {
        console.log('Sample templates:', JSON.stringify(templates, null, 2));
      }
      
      return;
    }

    console.log('Constraints on parameter_templates:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    // Get Decivue templates
    const { data: decivueOrg } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('name', 'Decivue')
      .single();

    if (decivueOrg) {
      const { data: templates } = await adminClient
        .from('parameter_templates')
        .select('*')
        .eq('organization_id', decivueOrg.id);

      console.log(`\n📋 Decivue templates: ${templates?.length || 0}`);
      
      if (templates && templates.length > 0) {
        // Group by category
        const categories = new Map<string, number>();
        templates.forEach(t => {
          categories.set(t.category, (categories.get(t.category) || 0) + 1);
        });

        console.log('\nBy category:');
        categories.forEach((count, category) => {
          console.log(`  - ${category}: ${count}`);
        });
      }
    }

    console.log('\n✅ Check complete\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkConstraint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
