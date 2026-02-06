/**
 * Constraints Routes
 * HTTP routes for organizational constraint operations
 */

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/constraints?decisionId=xxx
 * Get all constraints for a decision
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.query;

    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }

    const db = getDatabase();
    const { data, error } = await db
      .from('decision_constraints')
      .select(`
        constraint_id,
        constraints (
          id,
          name,
          description,
          rule_expression,
          is_immutable
        )
      `)
      .eq('decision_id', decisionId);

    if (error) throw error;

    // Extract constraints from nested structure
    const constraints = (data || []).map((dc: any) => dc.constraints);

    return res.json(constraints);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/constraints/all
 * Get all organizational constraints
 */
router.get('/all', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDatabase();
    const { data, error} = await db
      .from('constraints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

export default router;
