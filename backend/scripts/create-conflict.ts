import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;
const db = createClient(supabaseUrl, supabaseKey);

async function createConflict() {
  console.log('⚔️ Creating assumption conflict...\n');

  // Get the two conflicting assumptions
  const { data: assumptions } = await db
    .from('assumptions')
    .select('*')
    .ilike('description', '%CONFLICT:%')
    .order('created_at', { ascending: true });

  if (!assumptions || assumptions.length < 2) {
    console.log('❌ Need at least 2 conflict assumptions');
    return;
  }

  const assumptionA = assumptions[0];
  const assumptionB = assumptions[1];

  console.log('Assumption A:', assumptionA.description);
  console.log('Assumption B:', assumptionB.description);
  console.log('');

  // Create the conflict
  const conflictId = uuidv4();
  const { error } = await db.from('assumption_conflicts').insert({
    id: conflictId,
    assumption_a_id: assumptionA.id < assumptionB.id ? assumptionA.id : assumptionB.id,
    assumption_b_id: assumptionA.id < assumptionB.id ? assumptionB.id : assumptionA.id,
    conflict_type: 'CONTRADICTORY',
    confidence_score: 0.95,
    detected_at: new Date().toISOString(),
    metadata: {
      description: 'Timeline estimates conflict: 3 months vs 6 weeks for AI model deployment',
      severity: 'HIGH'
    }
  });

  if (error) {
    console.error('❌ Error creating conflict:', error);
  } else {
    console.log('✅ Conflict created successfully!');
    console.log(`   ID: ${conflictId}`);
    console.log(`   Type: CONTRADICTORY`);
    console.log(`   Confidence: 95%`);
    console.log(`   Status: UNRESOLVED`);
  }
}

createConflict().catch(console.error);
