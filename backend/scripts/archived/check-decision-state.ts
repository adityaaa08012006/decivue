import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

async function checkDecisionState() {
  console.log('🔍 Checking current decision state...\n');
  
  const { data: decision } = await db
    .from('decisions')
    .select('*')
    .eq('id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    .single();

  console.log('📋 Decision State:');
  console.log(`   - Title: ${decision.title}`);
  console.log(`   - Lifecycle: ${decision.lifecycle}`);
  console.log(`   - Health: ${decision.health_signal}/100`);
  console.log(`   - Last reviewed: ${decision.last_reviewed_at}\n`);

  // Check assumptions
  const { data: links } = await db
    .from('decision_assumptions')
    .select(`
      *,
      assumptions (
        id,
        description,
        status,
        scope
      )
    `)
    .eq('decision_id', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

  console.log('🔍 Linked Assumptions:');
  const universal = links.filter(l => l.assumptions.scope === 'UNIVERSAL');
  const specific = links.filter(l => l.assumptions.scope === 'DECISION_SPECIFIC');

  console.log(`\n   UNIVERSAL (${universal.length}):`);
  universal.forEach(l => {
    const a = l.assumptions;
    console.log(`   [${a.status}] ${a.description.substring(0, 80)}...`);
  });

  console.log(`\n   DECISION-SPECIFIC (${specific.length}):`);
  specific.forEach(l => {
    const a = l.assumptions;
    console.log(`   [${a.status}] ${a.description.substring(0, 80)}...`);
  });

  const brokenUniversal = universal.filter(l => l.assumptions.status === 'BROKEN');
  const brokenSpecific = specific.filter(l => l.assumptions.status === 'BROKEN');

  console.log(`\n📊 Analysis:`);
  console.log(`   - Broken universal: ${brokenUniversal.length}`);
  console.log(`   - Broken specific: ${brokenSpecific.length}/${specific.length}`);
  
  if (brokenUniversal.length > 0) {
    console.log(`\n   ❌ Decision should be INVALIDATED (universal broken)`);
  } else if (brokenSpecific.length > 0) {
    const percent = (brokenSpecific.length / specific.length) * 100;
    const penalty = Math.floor((brokenSpecific.length / specific.length) * 60);
    console.log(`\n   ⚠️  Decision should be AT_RISK`);
    console.log(`   - ${Math.round(percent)}% of specific assumptions broken`);
    console.log(`   - Expected health penalty: -${penalty} points`);
    console.log(`   - Expected health: ${Math.max(0, decision.health_signal - penalty)}/100`);
  } else {
    console.log(`\n   ✅ All assumptions holding - decision should be healthy`);
  }

  process.exit(0);
}

checkDecisionState();
