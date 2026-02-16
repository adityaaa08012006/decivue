import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkAssumptions() {
  console.log('🔍 Checking assumptions for Open New Store decision...\n');
  
  const { data, error } = await db
    .from('decision_assumptions')
    .select(`
      *,
      assumptions (
        id,
        description,
        status
      )
    `)
    .eq('decision_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  if (error) {
    console.error('Error:', error);
    process.exit(1);
  }

  console.log(`Found ${data.length} linked assumptions:\n`);
  data.forEach((link: any, idx: number) => {
    const assumption = link.assumptions;
    console.log(`${idx + 1}. [${assumption.status}] ${assumption.description.substring(0, 100)}...`);
    console.log(`   ID: ${assumption.id}\n`);
  });

  // Check if CFO assumption is in the list
  const cfoAssumption = data.find((link: any) => 
    link.assumptions.id === '33333333-cccc-cccc-cccc-cccccccccccc'
  );

  if (cfoAssumption) {
    console.log('✅ CFO assumption IS linked to this decision');
  } else {
    console.log('❌ CFO assumption is NOT linked to this decision!');
    console.log('   This is why the health didn\'t change - the broken assumption isn\'t being evaluated!\n');
  }

  process.exit(0);
}

checkAssumptions();
