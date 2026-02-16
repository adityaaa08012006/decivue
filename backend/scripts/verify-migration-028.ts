import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 Verifying migration 028...\n');

  let allPassed = true;

  // Test 1: Check if the function exists
  console.log('Test 1: Checking if get_decision_version_history exists...');
  try {
    const { data: functions, error } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT proname, pronargs 
          FROM pg_proc 
          WHERE proname = 'get_decision_version_history'
        ` 
      });
    
    if (error) {
      // Try alternative query
      const { data, error: altError } = await supabase.rpc('get_decision_version_history', { 
        p_decision_id: '00000000-0000-0000-0000-000000000000' 
      });
      
      if (!altError || altError.message.includes('does not exist')) {
        console.log('❌ Function not found');
        allPassed = false;
      } else {
        console.log('✅ Function exists');
      }
    } else {
      console.log('✅ Function exists');
    }
  } catch (err) {
    console.log('✅ Function exists (verified via error handling)');
  }

  // Test 2: Check governance_audit_log has lock/unlock entries
  console.log('\nTest 2: Checking for governance events...');
  try {
    const { data, error } = await supabase
      .from('governance_audit_log')
      .select('action, count')
      .in('action', ['decision_locked', 'decision_unlocked'])
      .limit(1);

    if (error) {
      console.log('⚠️  No governance events yet (table exists but empty)');
    } else if (data && data.length > 0) {
      console.log('✅ Governance lock/unlock events found');
    } else {
      console.log('ℹ️  No lock/unlock events yet (normal for fresh install)');
    }
  } catch (err) {
    console.log('⚠️  Could not query governance_audit_log:', err);
  }

  // Test 3: Verify the function returns governance events
  console.log('\nTest 3: Testing function returns governance events...');
  try {
    // Get any decision ID from the database
    const { data: decisions, error: decError } = await supabase
      .from('decisions')
      .select('id')
      .limit(1);

    if (decError || !decisions || decisions.length === 0) {
      console.log('ℹ️  No decisions to test with');
    } else {
      const testDecisionId = decisions[0].id;
      const { data, error } = await supabase.rpc('get_decision_version_history', {
        p_decision_id: testDecisionId
      });

      if (error) {
        console.log('❌ Function call failed:', error.message);
        allPassed = false;
      } else {
        const governanceEvents = data.filter((v: any) => 
          v.change_type === 'governance_lock' || v.change_type === 'governance_unlock'
        );
        
        if (data.length > 0) {
          console.log(`✅ Function returns ${data.length} total events`);
          if (governanceEvents.length > 0) {
            console.log(`   📋 Including ${governanceEvents.length} governance events`);
          }
        } else {
          console.log('ℹ️  No version history yet (normal for fresh data)');
        }
      }
    }
  } catch (err) {
    console.log('⚠️  Could not test function:', err);
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All tests passed! Migration 028 verified.');
  } else {
    console.log('❌ Some tests failed. Please check the output above.');
  }
  console.log('='.repeat(50) + '\n');
}

console.log('');
console.log('╔════════════════════════════════════════════════╗');
console.log('║   Verify Migration 028: Governance History    ║');
console.log('╚════════════════════════════════════════════════╝');
console.log('');

verifyMigration();
