import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function verifyLinking() {
  console.log('🔍 Verifying decision-assumption linking...\n');

  // Get all decisions
  const { data: decisions, error: decisionsError } = await db
    .from('decisions')
    .select('id, title')
    .order('created_at', { ascending: true });

  if (decisionsError) {
    console.error('Error fetching decisions:', decisionsError);
    return;
  }

  console.log(`Found ${decisions?.length || 0} decisions:\n`);

  for (const decision of decisions || []) {
    console.log(`📋 ${decision.title}`);
    
    // Get linked assumptions via decision_assumptions table
    const { data: links, error: linksError } = await db
      .from('decision_assumptions')
      .select('assumption_id')
      .eq('decision_id', decision.id);

    if (linksError) {
      console.error('   ❌ Error fetching links:', linksError);
      continue;
    }

    if (!links || links.length === 0) {
      console.log('   ❌ No assumptions linked!\n');
      continue;
    }

    console.log(`   ✅ ${links.length} assumptions linked`);

    // Get the actual assumptions
    const assumptionIds = links.map(l => l.assumption_id);
    const { data: assumptions, error: assumptionsError } = await db
      .from('assumptions')
      .select('id, description, status, scope')
      .in('id', assumptionIds);

    if (assumptionsError) {
      console.error('   ❌ Error fetching assumptions:', assumptionsError);
      continue;
    }

    if (assumptions) {
      assumptions.forEach(a => {
        const statusIcon = a.status === 'VALID' ? '✅' : a.status === 'SHAKY' ? '⚠️' : '❌';
        const scopeIcon = a.scope === 'UNIVERSAL' ? '🌍' : '📍';
        console.log(`      ${statusIcon} ${scopeIcon} ${a.status} - ${a.description.substring(0, 60)}...`);
      });
    }
    console.log('');
  }

  // Summary
  const { data: allAssumptions } = await db.from('assumptions').select('id, status');
  const { data: allLinks } = await db.from('decision_assumptions').select('*');

  console.log('📊 SUMMARY:');
  console.log(`   Decisions: ${decisions?.length || 0}`);
  console.log(`   Assumptions: ${allAssumptions?.length || 0}`);
  console.log(`   Links: ${allLinks?.length || 0}`);
  
  if (allAssumptions) {
    const statusCounts = allAssumptions.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('\n   Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count}`);
    });
  }
}

verifyLinking().catch(console.error);
