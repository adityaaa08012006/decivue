import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function fixAIDecision() {
  console.log('🔧 Fixing AI decision assumptions and conflicts...\n');

  // Get the AI decision
  const { data: aiDecision } = await db
    .from('decisions')
    .select('id')
    .ilike('title', '%AI%')
    .single();

  if (!aiDecision) {
    console.log('❌ AI decision not found');
    return;
  }

  console.log('Found AI decision:', aiDecision.id);

  // Get the conflicting assumptions
  const { data: conflictAssumptions } = await db
    .from('assumptions')
    .select('*')
    .ilike('description', '%CONFLICT:%');

  console.log(`Found ${conflictAssumptions?.length || 0} conflict assumptions\n`);

  if (conflictAssumptions && conflictAssumptions.length >= 2) {
    // Link both conflict assumptions to the decision
    for (const assumption of conflictAssumptions) {
      const { data: existingLink } = await db
        .from('decision_assumptions')
        .select('*')
        .eq('decision_id', aiDecision.id)
        .eq('assumption_id', assumption.id)
        .single();

      if (!existingLink) {
        await db.from('decision_assumptions').insert({
          decision_id: aiDecision.id,
          assumption_id: assumption.id
        });
        console.log(`✅ Linked: ${assumption.description.substring(0, 50)}...`);
      }
    }
  }

  // Get the universal assumptions
  const { data: universalAssumptions } = await db
    .from('assumptions')
    .select('*')
    .eq('scope', 'UNIVERSAL');

  console.log(`\nFound ${universalAssumptions?.length || 0} universal assumptions`);

  if (universalAssumptions) {
    for (const assumption of universalAssumptions) {
      const { data: existingLink } = await db
        .from('decision_assumptions')
        .select('*')
        .eq('decision_id', aiDecision.id)
        .eq('assumption_id', assumption.id)
        .single();

      if (!existingLink) {
        await db.from('decision_assumptions').insert({
          decision_id: aiDecision.id,
          assumption_id: assumption.id
        });
        console.log(`✅ Linked universal: ${assumption.description.substring(0, 50)}...`);
      }
    }
  }

  // Verify conflicts exist
  const { data: conflicts } = await db
    .from('assumption_conflicts')
    .select('*');

  console.log(`\n📊 Total conflicts in database: ${conflicts?.length || 0}`);

  if (conflicts && conflicts.length > 0) {
    conflicts.forEach(c => {
      console.log(`   - ${c.conflict_type}: ${c.description}`);
    });
  }

  console.log('\n✅ Done! Refresh the page to see all assumptions and conflicts.');
}

fixAIDecision().catch(console.error);
