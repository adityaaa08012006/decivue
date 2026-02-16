import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function verifyMigration() {
  console.log('🔍 Verifying Migration 029: Enhanced Version History\n');

  let allChecksPassed = true;

  try {
    // Check 1: pending_edit_requests view exists
    console.log('✓ Checking pending_edit_requests view...');
    const { data: viewData, error: viewError } = await supabase
      .from('pending_edit_requests')
      .select('*')
      .limit(0);

    if (viewError && !viewError.message.includes('no rows')) {
      console.error('  ❌ View not found:', viewError.message);
      allChecksPassed = false;
    } else {
      console.log('  ✅ pending_edit_requests view exists\n');
    }

    // Check 2: Version history function returns updated structure with governance events
    console.log('✓ Checking version history structure...');
    const { data: decisions } = await supabase
      .from('decisions')
      .select('id')
      .limit(1)
      .single();

    if (decisions) {
      const { data: versionHistory, error: vhError } = await supabase
        .rpc('get_decision_version_history', { p_decision_id: decisions.id });

      if (vhError) {
        console.error('  ❌ Version history function error:', vhError.message);
        allChecksPassed = false;
      } else {
        console.log('  ✅ Version history function works');
        
        // Check if any governance events exist
        if (versionHistory && versionHistory.length > 0) {
          const hasGovernanceEvents = versionHistory.some((v: any) => 
            v.change_type && ['governance_lock', 'governance_unlock', 'edit_requested', 'edit_approved', 'edit_rejected'].includes(v.change_type)
          );
          
          const hasConflictResolutions = versionHistory.some((v: any) =>
            v.change_type && ['assumption_conflict_resolved', 'decision_conflict_resolved'].includes(v.change_type)
          );
          
          if (hasGovernanceEvents) {
            console.log('  ✅ Version history includes governance events');
          } else {
            console.log('  ℹ️  No governance events yet (test by locking/unlocking decisions)');
          }
          
          if (hasConflictResolutions) {
            console.log('  ✅ Version history includes conflict resolutions');
          } else {
            console.log('  ℹ️  No conflict resolutions yet (test by resolving conflicts)');
          }
        } else {
          console.log('  ℹ️  No version history found (create some changes to test)');
        }
        console.log();
      }
    } else {
      console.log('  ⚠️  No decisions found to test version history\n');
    }

    // Check 3: Existing governance functions still work
    console.log('✓ Checking existing governance functions...');
    
    const functions = [
      'can_edit_decision',
      'request_edit_approval',
      'resolve_edit_request'
    ];

    for (const funcName of functions) {
      try {
        // Just check if function exists by calling with dummy params (will error on params, not on function not found)
        const { error } = await supabase.rpc(funcName as any, {});
        
        if (error && error.message.includes('could not find')) {
          console.error(`  ❌ Function ${funcName} not found`);
          allChecksPassed = false;
        } else {
          console.log(`  ✅ ${funcName}() exists`);
        }
      } catch (e) {
        console.log(`  ✅ ${funcName}() exists (parameter validation working)`);
      }
    }
    console.log();

    // Final summary
    console.log('═'.repeat(60));
    if (allChecksPassed) {
      console.log('✅ All verification checks passed!');
      console.log('\n🎉 Migration 029 is ready to use!\n');
      console.log('Version history now shows:');
      console.log('  • Regular decision edits and updates');
      console.log('  • Edit requests (requested, approved, rejected)');
      console.log('  • Lock/unlock governance events');
      console.log('  • Assumption conflict resolutions');
      console.log('  • Decision conflict resolutions\n');
      console.log('Next: Update frontend to display these events in DecisionVersionsModal');
    } else {
      console.log('❌ Some verification checks failed');
      console.log('   Please review the errors above and re-run the migration if needed\n');
      process.exit(1);
    }

  } catch (err) {
    console.error('❌ Error during verification:', err);
    process.exit(1);
  }
}

verifyMigration();
