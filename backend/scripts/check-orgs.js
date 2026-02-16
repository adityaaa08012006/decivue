const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkOrgs() {
  const { data, error } = await supabase
    .from('organizations')
    .select('*');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n📋 Organizations:\n');
  data.forEach(org => {
    console.log(`ID: ${org.id}`);
    console.log(`Name: ${org.name}`);
    console.log(`Org Code: ${org.org_code}`);
    console.log(`Created: ${org.created_at}`);
    console.log('---');
  });
}

checkOrgs();
