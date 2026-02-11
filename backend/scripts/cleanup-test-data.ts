import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...\n');

  // Delete test decisions (cascades to decision_assumptions, decision_constraints, etc.)
  const { data: testDecisions } = await db
    .from('decisions')
    .select('id, title')
    .or('title.eq.Launch Mobile App Beta,title.eq.Expand to European Market,title.eq.Acquire Competitor StartupXYZ,title.eq.Migrate to Cloud Infrastructure');

  if (testDecisions && testDecisions.length > 0) {
    console.log(`Found ${testDecisions.length} test decisions:`);
    testDecisions.forEach(d => console.log(`  - ${d.title}`));
    
    const ids = testDecisions.map(d => d.id);
    
    // Delete decision_assumptions links first
    await db.from('decision_assumptions').delete().in('decision_id', ids);
    
    // Delete decision_constraints links
    await db.from('decision_constraints').delete().in('decision_id', ids);
    
    // Delete the decisions
    await db.from('decisions').delete().in('id', ids);
    
    console.log('\n✅ Deleted test decisions');
  } else {
    console.log('No test decisions found');
  }

  // Delete test assumptions
  const { data: testAssumptions } = await db
    .from('assumptions')
    .select('id, description')
    .ilike('description', '%TEST:%');

  if (testAssumptions && testAssumptions.length > 0) {
    console.log(`\nFound ${testAssumptions.length} test assumptions`);
    const assumptionIds = testAssumptions.map(a => a.id);
    
    // Delete links first
    await db.from('decision_assumptions').delete().in('assumption_id', assumptionIds);
    
    // Delete the assumptions
    await db.from('assumptions').delete().in('id', assumptionIds);
    
    console.log('✅ Deleted test assumptions');
  } else {
    console.log('\nNo test assumptions found');
  }

  console.log('\n🎉 Cleanup complete!\n');
}

cleanupTestData().catch(console.error);
