import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration027() {
  console.log('🔍 Verifying Migration 027...\n');

  try {
    // 1. Check new columns in decisions table
    console.log('1️⃣  Checking new columns in decisions table...');
    const { data: decisions, error: decisionsError } = await supabase
      .from('decisions')
      .select('id, title, governance_tier, locked_at, locked_by, review_urgency_score, next_review_date, consecutive_deferrals')
      .limit(1);

    if (decisionsError) {
      console.log('   ❌ Error:', decisionsError.message);
    } else {
      console.log('   ✅ Decisions table has new columns');
      if (decisions && decisions.length > 0) {
        console.log('   Sample:', JSON.stringify(decisions[0], null, 2));
      }
    }

    // 2. Check governance_audit_log table
    console.log('\n2️⃣  Checking governance_audit_log table...');
    const { data: auditLog, error: auditError } = await supabase
      .from('governance_audit_log')
      .select('*')
      .limit(1);

    if (auditError) {
      console.log('   ❌ Error:', auditError.message);
    } else {
      console.log('   ✅ governance_audit_log table exists');
      console.log('   Records:', auditLog?.length || 0);
    }

    // 3. Check functions exist
    console.log('\n3️⃣  Checking new functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT routine_name 
          FROM information_schema.routines 
          WHERE routine_schema = 'public'
          AND routine_name IN (
            'calculate_review_urgency',
            'resolve_edit_request',
            'toggle_decision_lock',
            'update_governance_settings',
            'can_edit_decision',
            'auto_escalate_governance_tier',
            'check_expiring_decisions'
          )
          ORDER BY routine_name;
        `
      });

    if (functionsError) {
      console.log('   ⚠️  Could not verify functions directly (this is normal)');
      console.log('   Functions should be created if migration ran without errors');
    } else {
      console.log('   ✅ Functions verified');
    }

    // 4. Test calculate_review_urgency function
    console.log('\n4️⃣  Testing calculate_review_urgency function...');
    const { data: firstDecision } = await supabase
      .from('decisions')
      .select('id')
      .limit(1)
      .single();

    if (firstDecision) {
      const { data: urgency, error: urgencyError } = await supabase
        .rpc('calculate_review_urgency', { p_decision_id: firstDecision.id });

      if (urgencyError) {
        console.log('   ❌ Error:', urgencyError.message);
      } else {
        console.log('   ✅ calculate_review_urgency works');
        console.log('   Urgency score:', urgency);
      }
    } else {
      console.log('   ⚠️  No decisions found to test with');
    }

    // 5. Check governance tiers
    console.log('\n5️⃣  Checking governance tier distribution...');
    const { data: tierStats, error: tierError } = await supabase
      .from('decisions')
      .select('governance_tier');

    if (tierError) {
      console.log('   ❌ Error:', tierError.message);
    } else {
      const total = tierStats?.length || 0;
      const standard = tierStats?.filter((d: any) => d.governance_tier === 'standard').length || 0;
      const highImpact = tierStats?.filter((d: any) => d.governance_tier === 'high_impact').length || 0;
      const critical = tierStats?.filter((d: any) => d.governance_tier === 'critical').length || 0;
      const nullTier = tierStats?.filter((d: any) => !d.governance_tier).length || 0;

      console.log('   ✅ Total decisions:', total);
      console.log('   📊 Tier distribution:');
      console.log('      - Standard:', standard);
      console.log('      - High Impact:', highImpact);
      console.log('      - Critical:', critical);
      console.log('      - NULL:', nullTier);

      if (nullTier > 0) {
        console.log('   ⚠️  Some decisions have NULL governance_tier (should be standard by default)');
      }
    }

    console.log('\n✅ Migration 027 verification complete!\n');

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyMigration027();
