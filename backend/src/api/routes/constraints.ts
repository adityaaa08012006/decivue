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
 * Get all organizational constraints (auto-apply to all decisions)
 *
 * NOTE: decisionId parameter is kept for API compatibility but ignored.
 * All organizational constraints automatically apply to ALL decisions.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Auto-apply: Return ALL organizational constraints regardless of decision
    const db = getDatabase();
    const { data, error } = await db
      .from('constraints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return res.json(data || []);
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

/**
 * POST /api/constraints
 * Create a new organizational constraint
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, constraintType, ruleExpression, isImmutable, validationConfig } = req.body;

    // Validate required fields
    if (!name || !constraintType) {
      return res.status(400).json({ error: 'name and constraintType are required' });
    }

    const db = getDatabase();

    // Create the constraint
    const { data, error } = await db
      .from('constraints')
      .insert({
        name,
        description: description || null,
        constraint_type: constraintType,
        rule_expression: ruleExpression || null,
        is_immutable: isImmutable || false,
        validation_config: validationConfig || {}
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
 * POST /api/constraints/link
 * Link an existing constraint to a decision
 */
router.post('/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { constraintId, decisionId } = req.body;

    if (!constraintId || !decisionId) {
      return res.status(400).json({ error: 'constraintId and decisionId are required' });
    }

    const db = getDatabase();

    // Check if link already exists
    const { data: existing } = await db
      .from('decision_constraints')
      .select('*')
      .eq('constraint_id', constraintId)
      .eq('decision_id', decisionId)
      .single();

    if (existing) {
      return res.status(200).json({ message: 'Already linked', data: existing });
    }

    // Create the link
    const { data, error } = await db
      .from('decision_constraints')
      .insert({
        constraint_id: constraintId,
        decision_id: decisionId
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
 * DELETE /api/constraints/:id
 * Delete a constraint
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const db = getDatabase();

    // Delete the constraint (cascade will handle decision_constraints)
    const { error } = await db
      .from('constraints')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
