/**
 * Fix Orphaned Assumptions Script
 * 
 * Checks all DECISION_SPECIFIC assumptions (including those with NULL scope)
 * and marks them as BROKEN if ALL their linked decisions are deprecated
 */

import { getAdminDatabase } from '../src/data/database';
import { logger } from '../src/utils/logger';

async function fixOrphanedAssumptions() {
  console.log('🔧 Checking for orphaned assumptions...\n');

  const db = getAdminDatabase();

  try {
    // Get all assumptions that are not UNIVERSAL (including NULL scope)
    const { data: assumptions, error: assumptionsError } = await db
      .from('assumptions')
      .select(`
        id,
        description,
        status,
        scope,
        decision_assumptions (
          decision_id,
          decisions (
            id,
            title,
            lifecycle
          )
        )
      `)
      .or('scope.eq.DECISION_SPECIFIC,scope.is.null');

    if (assumptionsError) {
      console.error('❌ Error fetching assumptions:', assumptionsError);
      return;
    }

    if (!assumptions || assumptions.length === 0) {
      console.log('✅ No decision-specific assumptions found\n');
      return;
    }

    console.log(`📋 Found ${assumptions.length} decision-specific assumptions to check\n`);

    let fixedCount = 0;
    let skippedCount = 0;
    let alreadyBrokenCount = 0;

    for (const assumption of assumptions) {
      const links = assumption.decision_assumptions || [];

      // Skip assumptions with no linked decisions
      if (links.length === 0) {
        console.log(`⚠️  Skipping: "${assumption.description.substring(0, 60)}..."`);
        console.log(`   Reason: No linked decisions\n`);
        skippedCount++;
        continue;
      }

      // Check if ALL linked decisions are deprecated
      const allDeprecated = links.every((link: any) => 
        link.decisions?.lifecycle === 'INVALIDATED' || 
        link.decisions?.lifecycle === 'RETIRED'
      );

      if (allDeprecated && assumption.status !== 'BROKEN') {
        // Mark as BROKEN
        const { error: updateError } = await db
          .from('assumptions')
          .update({ 
            status: 'BROKEN',
            validated_at: new Date().toISOString()
          })
          .eq('id', assumption.id);

        if (updateError) {
          console.error(`❌ Failed to update assumption ${assumption.id}:`, updateError);
        } else {
          console.log(`✅ FIXED: "${assumption.description.substring(0, 60)}..."`);
          console.log(`   Status: ${assumption.status} → BROKEN`);
          console.log(`   Reason: All ${links.length} linked decision(s) are deprecated`);
          console.log(`   Decisions: ${links.map((l: any) => `"${l.decisions?.title}" (${l.decisions?.lifecycle})`).join(', ')}\n`);
          fixedCount++;
        }
      } else if (allDeprecated && assumption.status === 'BROKEN') {
        console.log(`✓ Already correct: "${assumption.description.substring(0, 60)}..."`);
        console.log(`   Status: BROKEN (correct)\n`);
        alreadyBrokenCount++;
      } else {
        // At least one active decision
        const activeDecisions = links.filter((link: any) => 
          link.decisions?.lifecycle !== 'INVALIDATED' && 
          link.decisions?.lifecycle !== 'RETIRED'
        );
        console.log(`✓ OK: "${assumption.description.substring(0, 60)}..."`);
        console.log(`   Status: ${assumption.status}`);
        console.log(`   Active decisions: ${activeDecisions.length}/${links.length}\n`);
        skippedCount++;
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY:');
    console.log(`   Total assumptions checked: ${assumptions.length}`);
    console.log(`   Fixed (VALID → BROKEN): ${fixedCount}`);
    console.log(`   Already correct: ${alreadyBrokenCount}`);
    console.log(`   Skipped (has active decisions): ${skippedCount}`);
    console.log('='.repeat(70) + '\n');

    if (fixedCount > 0) {
      console.log('✅ Fixed orphaned assumptions! Please refresh your frontend to see the changes.\n');
    } else {
      console.log('✅ All assumptions are correctly marked!\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixOrphanedAssumptions();
