import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function testAPIQuery() {
  console.log('🧪 Testing the exact query the API uses...\n');

  // Get a decision ID
  const { data: decisions } = await db
    .from('decisions')
    .select('id, title')
    .limit(1);

  if (!decisions || decisions.length === 0) {
    console.log('No decisions found');
    return;
  }

  const decisionId = decisions[0].id;
  console.log(`Testing with decision: ${decisions[0].title}`);
  console.log(`Decision ID: ${decisionId}\n`);

  // This is the EXACT query from the backend
  const { data, error } = await db
    .from('decision_assumptions')
    .select(`
      assumption_id,
      assumptions (
        id,
        description,
        status,
        scope,
        validated_at,
        metadata,
        created_at
      )
    `)
    .eq('decision_id', decisionId);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`✅ Query successful!`);
  console.log(`   Found ${data?.length || 0} links\n`);

  if (data && data.length > 0) {
    console.log('📋 Assumptions:');
    data.forEach((link: any, i: number) => {
      const assumption = link.assumptions;
      if (assumption) {
        console.log(`\n   ${i + 1}. ${assumption.status} - ${assumption.scope}`);
        console.log(`      ${assumption.description.substring(0, 70)}...`);
      } else {
        console.log(`\n   ${i + 1}. ❌ NULL assumption (broken link!)`);
      }
    });
  } else {
    console.log('❌ No assumptions found!');
    
    // Debug: Check if links exist
    const { data: links } = await db
      .from('decision_assumptions')
      .select('*')
      .eq('decision_id', decisionId);
    
    console.log(`\n   Debug: Raw links in decision_assumptions: ${links?.length || 0}`);
    if (links && links.length > 0) {
      console.log('   Links exist but join failed! This might be a Supabase RLS issue.');
    }
  }
}

testAPIQuery().catch(console.error);
