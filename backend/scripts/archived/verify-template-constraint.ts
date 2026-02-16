/**
 * Verify Parameter Templates Constraint
 * Checks if the constraint includes organization_id
 */

import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function verifyConstraint() {
  try {
    console.log('🔍 Verifying parameter_templates constraint configuration\n');

    const adminClient = getAdminDatabase();

    // Get Decivue org
    const { data: decivueOrg } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('name', 'Decivue')
      .single();

    if (!decivueOrg) {
      console.log('❌ Decivue organization not found');
      return;
    }

    console.log(`📋 Organization: ${decivueOrg.name} (${decivueOrg.id})\n`);

    // Test 1: Try to add a custom category
    console.log('📝 Test 1: Adding a test category...');
    const testCategory = `Test Category ${Date.now()}`;
    
    const { data: addResult, error: addError } = await adminClient
      .from('parameter_templates')
      .insert({
        organization_id: decivueOrg.id,
        category: 'assumption_category',
        template_name: testCategory,
        display_order: 1000,
        is_active: true
      })
      .select()
      .single();

    if (addError) {
      console.log(`  ❌ Failed to add category: ${addError.message}`);
      console.log(`  Error code: ${addError.code}`);
      
      if (addError.code === '23505') {
        console.log('\n⚠️  This is a unique constraint violation.');
        console.log('   The constraint might not include organization_id.');
      }
    } else {
      console.log(`  ✅ Successfully added: "${testCategory}"`);
      console.log(`  Template ID: ${addResult.id}\n`);
      
      // Clean up - delete the test category
      await adminClient
        .from('parameter_templates')
        .delete()
        .eq('id', addResult.id);
      
      console.log('  🧹 Cleaned up test category\n');
    }

    // Test 2: Check existing categories
    console.log('📋 Test 2: Current categories for Decivue:');
    const { data: templates } = await adminClient
      .from('parameter_templates')
      .select('category, template_name')
      .eq('organization_id', decivueOrg.id)
      .eq('category', 'assumption_category')
      .eq('is_active', true)
      .order('display_order');

    if (templates && templates.length > 0) {
      templates.forEach(t => {
        console.log(`  - ${t.template_name}`);
      });
      console.log(`\n  Total: ${templates.length} categories\n`);
    } else {
      console.log('  No categories found\n');
    }

    // Test 3: Try to add a duplicate in same org (should fail)
    if (templates && templates.length > 0) {
      const existingCategory = templates[0].template_name;
      console.log(`📝 Test 3: Try adding duplicate "${existingCategory}" (should fail)...`);
      
      const { error: dupError } = await adminClient
        .from('parameter_templates')
        .insert({
          organization_id: decivueOrg.id,
          category: 'assumption_category',
          template_name: existingCategory,
          display_order: 1000,
          is_active: true
        });

      if (dupError && dupError.code === '23505') {
        console.log('  ✅ Correctly rejected duplicate (as expected)\n');
      } else if (dupError) {
        console.log(`  ❌ Unexpected error: ${dupError.message}\n`);
      } else {
        console.log('  ⚠️  Duplicate was allowed (this is wrong!)\n');
      }
    }

    // Test 4: Get another org and try to add same category
    const { data: otherOrg } = await adminClient
      .from('organizations')
      .select('id, name')
      .neq('id', decivueOrg.id)
      .limit(1)
      .single();

    if (otherOrg && templates && templates.length > 0) {
      const categoryToTest = templates[0].template_name;
      console.log(`📝 Test 4: Adding "${categoryToTest}" to ${otherOrg.name} (different org)...`);
      
      const { data: crossOrgResult, error: crossOrgError } = await adminClient
        .from('parameter_templates')
        .insert({
          organization_id: otherOrg.id,
          category: 'assumption_category',
          template_name: categoryToTest,
          display_order: 1000,
          is_active: true
        })
        .select()
        .single();

      if (crossOrgError) {
        if (crossOrgError.code === '23505') {
          console.log('  ❌ FAILED: Category blocked across organizations');
          console.log('  ⚠️  The constraint is NOT organization-scoped!\n');
          console.log('🔴 ACTION REQUIRED: You need to fix the constraint.');
          console.log('   Run the updated SQL in Supabase SQL Editor.\n');
        } else {
          console.log(`  ❌ Unexpected error: ${crossOrgError.message}\n`);
        }
      } else {
        console.log('  ✅ Successfully added to different org (constraint is working!)\n');
        
        // Clean up
        await adminClient
          .from('parameter_templates')
          .delete()
          .eq('id', crossOrgResult.id);
        
        console.log('  🧹 Cleaned up test category\n');
      }
    }

    console.log('✅ Verification complete!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

verifyConstraint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
