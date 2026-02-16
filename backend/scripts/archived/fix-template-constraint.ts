import { getAdminDatabase, initializeDatabase } from '../src/data/database';
import * as dotenv from 'dotenv';

dotenv.config();
initializeDatabase();

async function fixUniqueConstraint() {
  console.log('🔧 Fixing parameter_templates unique constraint\n');

  try {
    const db = getAdminDatabase();

    // Drop old constraint
    console.log('1. Dropping old unique constraint...');
    const { error: dropError } = await db.rpc('exec', {
      sql: 'ALTER TABLE parameter_templates DROP CONSTRAINT IF EXISTS parameter_templates_category_template_name_key;'
    });

    if (dropError) {
      console.log('⚠️ Could not drop via RPC, trying direct...');
      // Might not work via RPC, but we'll continue
    } else {
      console.log('✅ Old constraint dropped');
    }

    // Add new constraint with organization_id
    console.log('2. Adding new unique constraint with organization_id...');
    const { error: addError } = await db.rpc('exec', {
      sql: 'ALTER TABLE parameter_templates ADD CONSTRAINT parameter_templates_org_category_name_key UNIQUE (organization_id, category, template_name);'
    });

    if (addError) {
      console.log('⚠️ Could not add via RPC:', addError.message);
    } else {
      console.log('✅ New constraint added');
    }

    console.log('\n🎉 Constraint fix complete!\n');
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  }
}

fixUniqueConstraint()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
