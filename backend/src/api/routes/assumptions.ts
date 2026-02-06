/**
 * Assumptions Routes
 * HTTP routes for assumption operations
 */

import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/assumptions?decisionId=xxx
 * Get all assumptions for a decision
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.query;

    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }

    const db = getDatabase();
    const { data, error } = await db
      .from('assumptions')
      .select('*')
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumptions
 * Create a new assumption
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId, description, status, validatedAt, confidence } = req.body;

    if (!decisionId || !description) {
      return res.status(400).json({ error: 'decisionId and description are required' });
    }

    const db = getDatabase();
    const { data, error } = await db
      .from('assumptions')
      .insert({
        decision_id: decisionId,
        description,
        status: status || 'UNKNOWN',
        validated_at: validatedAt || null,
        metadata: { confidence: confidence || 0 }
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

export default router;
