import { getAdminDatabase } from '../src/data/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  console.log('🔧 Running migration 011: Restore Parameter Templates\n');

  try {
    const db = getAdminDatabase();
    const migrationPath = path.join(__dirname, '../migrations/011_restore_parameter_templates.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await db.rpc('exec', { sql: statement + ';' });
          if (error) {
            // Try direct execution if RPC fails
            console.log('Executing statement directly...');
            const { error: directError } = await (db as any).raw(statement);
            if (directError) {
              console.error('⚠️ Warning:', directError.message);
            }
          }
        } catch (err: any) {
          console.log('⏩ Skipping:', err.message.substring(0, 100));
        }
      }
    }

    // Verify templates were seeded
    console.log('\n✅ Migration completed! Checking templates...\n');
    
    const { data: orgs, error: orgError } = await db
      .from('organizations')
      .select('id, name');

    if (orgError) throw orgError;

    for (const org of orgs || []) {
      const { data: templates, error: templateError } = await db
        .from('parameter_templates')
        .select('*')
        .eq('organization_id', org.id)
        .eq('category', 'assumption_category');

      if (templateError) {
        console.error(`❌ Error checking templates for ${org.name}:`, templateError);
      } else {
        console.log(`📋 ${org.name}: ${templates?.length || 0} assumption categories`);
      }
    }

    console.log('\n🎉 Migration complete!\n');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
