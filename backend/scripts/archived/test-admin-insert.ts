/**
 * Check RLS policies on parameter_templates
 */

import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function checkRLS() {
  try {
    console.log('🔍 Testing parameter_templates with admin client\n');

    const adminClient = getAdminDatabase();

    // Get two different organizations
    const { data: orgs } = await adminClient
      .from('organizations')
      .select('id, name')
      .limit(2);

    if (!orgs || orgs.length < 2) {
      console.log('❌ Need at least 2 organizations');
      return;
    }

    const [org1, org2] = orgs;
    console.log(`📋 Org 1: ${org1.name} (${org1.id})`);
    console.log(`📋 Org 2: ${org2.name} (${org2.id})\n`);

    // Test: Add same template to both orgs using ADMIN client (bypasses RLS)
    const testName = `Test ${Date.now()}`;

    console.log('📝 Test: Adding template to Org 1...');
    const { data: result1, error: error1 } = await adminClient
      .from('parameter_templates')
      .insert({
        organization_id: org1.id,
        category: 'assumption_category',
        template_name: testName,
        display_order: 1000,
        is_active: true
      })
      .select()
      .single();

    if (error1) {
      console.log(`  ❌ Failed: ${error1.message} (${error1.code})`);
    } else {
      console.log(`  ✅ Success! ID: ${result1.id}`);
    }

    console.log('\n📝 Test: Adding SAME template to Org 2...');
    const { data: result2, error: error2 } = await adminClient
      .from('parameter_templates')
      .insert({
        organization_id: org2.id,
        category: 'assumption_category',
        template_name: testName,
        display_order: 1000,
        is_active: true
      })
      .select()
      .single();

    if (error2) {
      console.log(`  ❌ Failed: ${error2.message} (${error2.code})`);
      console.log('\n🔴 PROBLEM: Admin client is blocked!');
      console.log('   This suggests there might be:');
      console.log('   - An additional unique constraint without organization_id');
      console.log('   - A trigger preventing the insert');
      console.log('   - Something else blocking it\n');
    } else {
      console.log(`  ✅ Success! ID: ${result2.id}`);
      console.log('\n✅ CONSTRAINT IS WORKING CORRECTLY!');
      console.log('   Both organizations can have templates with the same name.\n');
      
      // Cleanup
      await adminClient.from('parameter_templates').delete().eq('id', result1.id);
      await adminClient.from('parameter_templates').delete().eq('id', result2.id);
      console.log('🧹 Cleaned up test data\n');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkRLS()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
