import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:3001';

async function testEvaluate() {
  console.log('🧪 Testing evaluation endpoint...\n');

  // Get a decision
  const response = await fetch(`${API_BASE}/decisions?limit=1`);
  const result = await response.json();
  const decisions = result.decisions || result;
  
  if (!decisions || decisions.length === 0) {
    console.log('No decisions found');
    console.log('Response:', result);
    return;
  }

  const decision = decisions[0];
  console.log(`Testing with: ${decision.title}`);
  console.log(`Current health: ${decision.health_signal}`);
  console.log(`Current lifecycle: ${decision.lifecycle}\n`);

  // Get assumptions for this decision
  const assumptionsResponse = await fetch(`${API_BASE}/assumptions?decisionId=${decision.id}`);
  const assumptions = await assumptionsResponse.json();
  console.log(`Assumptions: ${assumptions.length}`);
  assumptions.forEach((a: any) => {
    console.log(`  - ${a.status} (${a.scope}): ${a.description.substring(0, 50)}...`);
  });

  // Evaluate
  console.log(`\n📊 Evaluating decision...`);
  const evalResponse = await fetch(`${API_BASE}/decisions/${decision.id}/evaluate`, {
    method: 'POST'
  });

  if (!evalResponse.ok) {
    const error = await evalResponse.text();
    console.error('❌ Evaluation failed:', error);
    return;
  }

  const evalResult = await evalResponse.json();
  console.log('\n✅ Evaluation result:');
  console.log(`   Old health: ${evalResult.oldHealth || 'N/A'}`);
  console.log(`   New health: ${evalResult.newHealth}`);
  console.log(`   Old lifecycle: ${evalResult.oldLifecycle || 'N/A'}`);
  console.log(`   New lifecycle: ${evalResult.newLifecycle}`);
  console.log(`   Changes detected: ${evalResult.changesDetected}`);
  console.log(`   Message: ${evalResult.message}`);

  // Fetch the decision again to see if it updated
  console.log('\n🔍 Fetching decision again...');
  const updatedResponse = await fetch(`${API_BASE}/decisions/${decision.id}`);
  const updated = await updatedResponse.json();
  console.log(`   Updated health: ${updated.health_signal}`);
  console.log(`   Updated lifecycle: ${updated.lifecycle}`);
}

testEvaluate().catch(console.error);
