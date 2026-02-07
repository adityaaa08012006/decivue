/**
 * Dependencies Routes
 * HTTP routes for dependency operations
 */

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/dependencies?decisionId=xxx
 * Get all dependencies for a decision (both depends on and blocks)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.query;

    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }

    const db = getDatabase();

    // 1. Get decisions I BLOCK (I am the Source)
    const { data: blocking, error: error1 } = await db
      .from('dependencies')
      .select(`
        id,
        target_decision_id,
        decisions:target_decision_id (
          id,
          title,
          lifecycle
        )
      `)
      .eq('source_decision_id', decisionId);

    if (error1) throw error1;

    // 2. Get decisions I am BLOCKED BY (I am the Target)
    const { data: blockedBy, error: error2 } = await db
      .from('dependencies')
      .select(`
        id,
        source_decision_id,
        decisions:source_decision_id (
          id,
          title,
          lifecycle
        )
      `)
      .eq('target_decision_id', decisionId);

    if (error2) throw error2;

    return res.json({
      blocking: blocking || [], // Downstream
      blockedBy: blockedBy || [] // Upstream
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/dependencies
 * Create a new dependency
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceDecisionId, targetDecisionId } = req.body;

    if (!sourceDecisionId || !targetDecisionId) {
      return res.status(400).json({ error: 'sourceDecisionId and targetDecisionId are required' });
    }

    const db = getDatabase();
    const { data, error } = await db
      .from('dependencies')
      .insert({
        source_decision_id: sourceDecisionId,
        target_decision_id: targetDecisionId
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/dependencies/:id
 * Remove a dependency
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const { error } = await db
      .from('dependencies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
