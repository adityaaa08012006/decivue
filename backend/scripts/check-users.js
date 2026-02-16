/**
 * Check users in PLOT ARMOR organization
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsers() {
  try {
    // Get PLOT ARMOR organization
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('name', 'PLOT ARMOR -_-')
      .limit(1);

    if (!orgs || orgs.length === 0) {
      console.error('❌ Organization "PLOT ARMOR -_-" not found');
      return;
    }

    const orgId = orgs[0].id;
    console.log(`\n📋 Organization: ${orgs[0].name} (${orgId})\n`);

    // Get users in this organization
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', orgId);

    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No users found in this organization\n');
      
      // Show all users
      const { data: allUsers } = await supabase
        .from('users')
        .select('*');
      
      console.log('All users in database:');
      allUsers.forEach(user => {
        console.log(`  • ${user.first_name} ${user.last_name} (${user.email}) - Org: ${user.organization_id}`);
      });
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach(user => {
      console.log(`  • ${user.first_name} ${user.last_name} (${user.email})`);
      console.log(`    ID: ${user.id}`);
      console.log(`    Org: ${user.organization_id}\n`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkUsers().then(() => {
  console.log('✅ Done!');
  process.exit(0);
});
