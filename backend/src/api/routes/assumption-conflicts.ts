/**
 * Assumption Conflicts Routes
 * HTTP routes for assumption conflict detection and resolution operations
 */

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';
import { AssumptionConflictDetector } from '../../services/assumption-conflict-detector';
import { logger } from '@utils/logger';
import { getCurrentTime } from './time-simulation';

const router = Router();
const detector = new AssumptionConflictDetector();

/**
 * GET /api/assumption-conflicts
 * Get all assumption conflicts (optionally filter by unresolved)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeResolved = req.query.includeResolved === 'true';
    const db = getDatabase();

    const { data, error } = await db.rpc('get_all_assumption_conflicts', {
      include_resolved: includeResolved,
    });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/assumption-conflicts/:assumptionId
 * Get all conflicts for a specific assumption
 */
router.get('/:assumptionId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assumptionId } = req.params;
    const db = getDatabase();

    const { data, error } = await db.rpc('get_assumption_conflicts', {
      target_assumption_id: assumptionId,
    });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumption-conflicts/detect
 * Run conflict detection on all assumptions or specific ones
 */
router.post('/detect', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { assumptionIds } = req.body; // Optional: specific assumptions to check
    const db = getDatabase();

    // Fetch assumptions
    let query = db.from('assumptions').select('*');

    if (assumptionIds && Array.isArray(assumptionIds)) {
      query = query.in('id', assumptionIds);
    }

    const { data: assumptions, error: fetchError } = await query;

    if (fetchError) throw fetchError;

    if (!assumptions || assumptions.length === 0) {
      return res.json({ message: 'No assumptions to check', conflictsDetected: 0, conflicts: [] });
    }

    // Detect conflicts
    const detectedConflicts = detector.detectConflictsInList(
      assumptions.map(a => ({
        id: a.id,
        text: a.description,
        status: a.status,
        scope: a.scope,
      }))
    );

    // Record new conflicts in database (only if confidence > 0.7)
    const newConflicts: any[] = [];

    for (const { assumptionA, assumptionB, conflict } of detectedConflicts) {
      // Ensure proper ordering for unique constraint
      const [minId, maxId] = [assumptionA.id, assumptionB.id].sort();

      // Check if conflict already exists
      const { data: existing } = await db.rpc('conflict_exists', {
        assumption_id_1: minId,
        assumption_id_2: maxId,
      });

      if (!existing) {
        // Create new conflict record
        const { data: newConflict, error: insertError } = await db
          .from('assumption_conflicts')
          .insert({
            assumption_a_id: minId,
            assumption_b_id: maxId,
            conflict_type: conflict.conflictType,
            confidence_score: conflict.confidenceScore,
            metadata: { reason: conflict.reason },
          })
          .select()
          .single();

        if (!insertError && newConflict) {
          newConflicts.push(newConflict);
          logger.info('Assumption conflict detected and recorded', {
            conflictId: newConflict.id,
            assumptionA: minId,
            assumptionB: maxId,
            confidence: conflict.confidenceScore,
          });
        }
      }
    }

    return res.json({
      message: `Conflict detection complete`,
      conflictsDetected: newConflicts.length,
      totalConflictsFound: detectedConflicts.length,
      conflicts: newConflicts,
    });
  } catch (error) {
    logger.error('Conflict detection failed', { error });
    return next(error);
  }
});

/**
 * PUT /api/assumption-conflicts/:id/resolve
 * Resolve a conflict with a specific action
 */
router.put('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { resolutionAction, resolutionNotes } = req.body;

    if (!resolutionAction) {
      return res.status(400).json({ error: 'resolutionAction is required' });
    }

    const validActions = ['VALIDATE_A', 'VALIDATE_B', 'MERGE', 'DEPRECATE_BOTH', 'KEEP_BOTH'];
    if (!validActions.includes(resolutionAction)) {
      return res.status(400).json({ error: `Invalid resolution action. Must be one of: ${validActions.join(', ')}` });
    }

    const db = getDatabase();

    // Fetch the conflict to get assumption IDs
    const { data: conflict, error: fetchError } = await db
      .from('assumption_conflicts')
      .select('assumption_a_id, assumption_b_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!conflict) {
      return res.status(404).json({ error: 'Conflict not found' });
    }

    // Update conflict as resolved
    const { data: resolvedConflict, error: updateError } = await db
      .from('assumption_conflicts')
      .update({
        resolved_at: getCurrentTime().toISOString(),
        resolution_action: resolutionAction,
        resolution_notes: resolutionNotes || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // Apply the resolution action to assumptions
    if (resolutionAction === 'VALIDATE_A') {
      await db
        .from('assumptions')
        .update({ status: 'VALID' }) // Valid status
        .eq('id', conflict.assumption_a_id);
      
      // Mark the other assumption as BROKEN
      await db
        .from('assumptions')
        .update({ status: 'BROKEN' })
        .eq('id', conflict.assumption_b_id);
    } else if (resolutionAction === 'VALIDATE_B') {
      await db
        .from('assumptions')
        .update({ status: 'VALID' }) // Valid status
        .eq('id', conflict.assumption_b_id);
      
      // Mark the other assumption as BROKEN
      await db
        .from('assumptions')
        .update({ status: 'BROKEN' })
        .eq('id', conflict.assumption_a_id);
    } else if (resolutionAction === 'DEPRECATE_BOTH') {
      await db
        .from('assumptions')
        .update({ status: 'BROKEN' })
        .in('id', [conflict.assumption_a_id, conflict.assumption_b_id]);
    } else if (resolutionAction === 'MERGE') {
      // Mark both as needs review for manual merge
      await db
        .from('assumptions')
        .update({ status: 'VALID' })
        .in('id', [conflict.assumption_a_id, conflict.assumption_b_id]);
    }
    // KEEP_BOTH - no status changes needed

    // Find all decisions affected by these assumptions and trigger re-evaluation
    const { data: affectedDecisions } = await db
      .from('decision_assumptions')
      .select('decision_id')
      .in('assumption_id', [conflict.assumption_a_id, conflict.assumption_b_id]);

    if (affectedDecisions && affectedDecisions.length > 0) {
      const uniqueDecisionIds = [...new Set(affectedDecisions.map(d => d.decision_id))];
      
      logger.info('Triggering re-evaluation for affected decisions', {
        conflictId: id,
        decisionCount: uniqueDecisionIds.length,
        decisionIds: uniqueDecisionIds
      });

      // Trigger evaluation for each affected decision
      for (const decisionId of uniqueDecisionIds) {
        try {
          await fetch(`http://localhost:3001/api/decisions/${decisionId}/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          logger.info(`Re-evaluated decision ${decisionId}`);
        } catch (evalError) {
          logger.error(`Failed to re-evaluate decision ${decisionId}`, { error: evalError });
        }
      }
    }

    logger.info('Assumption conflict resolved', {
      conflictId: id,
      action: resolutionAction,
      affectedDecisions: affectedDecisions?.length || 0
    });

    return res.json(resolvedConflict);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/assumption-conflicts/:id
 * Delete a conflict (mark as false positive)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const { error } = await db
      .from('assumption_conflicts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    logger.info('Assumption conflict deleted', { conflictId: id });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
