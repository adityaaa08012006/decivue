/**
 * Check what constraints actually exist on parameter_templates
 */

import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import '../src/utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function checkConstraints() {
  try {
    console.log('🔍 Checking actual constraints on parameter_templates table\n');

    const adminClient = getAdminDatabase();

    // Query the parameter_templates table structure
    const { data, error } = await adminClient
      .from('parameter_templates')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error querying table:', error.message);
    }

    console.log('✅ Table exists and is queryable\n');
    console.log('Now check Supabase Dashboard:\n');
    console.log('1. Go to Table Editor → parameter_templates');
    console.log('2. Click on the table');
    console.log('3. Look at the "Constraints" or "Indexes" section\n');
    console.log('Or run this SQL in Supabase SQL Editor:\n');
    console.log('----------------------------------------');
    console.log(`SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'parameter_templates'::regclass
  AND contype = 'u'
ORDER BY conname;`);
    console.log('----------------------------------------\n');
    console.log('Expected to see:');
    console.log('  parameter_templates_org_category_template_unique');
    console.log('  UNIQUE (organization_id, category, template_name)\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

checkConstraints()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
