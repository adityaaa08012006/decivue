#!/usr/bin/env node

/**
 * Quick Test Script for Assumption Conflicts
 * Tests the conflict API endpoints and displays results
 * 
 * Usage: node test-conflicts.js
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

async function testConflictEndpoints() {
  console.log('🔍 Testing Assumption Conflict Endpoints\n');
  console.log('API Base:', API_BASE);
  console.log('─'.repeat(60));

  try {
    // Test 1: Get all unresolved conflicts
    console.log('\n📋 Test 1: GET /assumption-conflicts');
    const response1 = await fetch(`${API_BASE}/assumption-conflicts`);
    const conflicts = await response1.json();
    
    console.log(`Status: ${response1.status}`);
    console.log(`Conflicts found: ${conflicts.length}`);
    
    if (conflicts.length > 0) {
      console.log('\n✅ Sample Conflict:');
      const sample = conflicts[0];
      console.log({
        id: sample.id,
        type: sample.conflict_type,
        confidence: `${Math.round(sample.confidence_score * 100)}%`,
        assumptionA: sample.assumption_a?.description,
        assumptionB: sample.assumption_b?.description,
        resolved: sample.resolved_at ? 'Yes' : 'No'
      });
    } else {
      console.log('⚠️  No conflicts found. Run the SQL script first:');
      console.log('   backend/test-data/create_assumption_conflict.sql');
    }

    // Test 2: Get conflicts including resolved
    console.log('\n─'.repeat(60));
    console.log('\n📋 Test 2: GET /assumption-conflicts?includeResolved=true');
    const response2 = await fetch(`${API_BASE}/assumption-conflicts?includeResolved=true`);
    const allConflicts = await response2.json();
    
    console.log(`Status: ${response2.status}`);
    console.log(`Total conflicts (including resolved): ${allConflicts.length}`);
    const resolved = allConflicts.filter(c => c.resolved_at).length;
    const unresolved = allConflicts.length - resolved;
    console.log(`  - Unresolved: ${unresolved}`);
    console.log(`  - Resolved: ${resolved}`);

    // Test 3: Get assumptions
    console.log('\n─'.repeat(60));
    console.log('\n📋 Test 3: GET /assumptions');
    const response3 = await fetch(`${API_BASE}/assumptions`);
    const assumptions = await response3.json();
    
    console.log(`Status: ${response3.status}`);
    console.log(`Total assumptions: ${assumptions.length}`);
    
    const testAssumptions = assumptions.filter(a => 
      a.id === '11111111-1111-1111-1111-111111111111' || 
      a.id === '22222222-2222-2222-2222-222222222222'
    );
    
    if (testAssumptions.length > 0) {
      console.log('\n✅ Test assumptions found:');
      testAssumptions.forEach(a => {
        console.log(`  - ${a.description}`);
        console.log(`    Scope: ${a.scope}, Status: ${a.status}`);
      });
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 Summary:');
    console.log(`✅ API is responding: ${response1.ok ? 'Yes' : 'No'}`);
    console.log(`✅ Conflicts table accessible: ${response1.ok ? 'Yes' : 'No'}`);
    console.log(`✅ Test data present: ${conflicts.length > 0 ? 'Yes' : 'No'}`);
    
    if (conflicts.length === 0) {
      console.log('\n⚠️  Next Steps:');
      console.log('1. Run the SQL script in Supabase:');
      console.log('   backend/test-data/create_assumption_conflict.sql');
      console.log('2. Refresh your Assumptions page in the browser');
    } else {
      console.log('\n🎉 Ready to view in frontend!');
      console.log('Navigate to: Assumptions Section');
      console.log('Look for: "Detected Conflicts" section');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure backend is running (npm run dev)');
    console.error('2. Check that API_URL is correct:', API_BASE);
    console.error('3. Verify Supabase connection is working');
  }
}

// Run the tests
testConflictEndpoints();
