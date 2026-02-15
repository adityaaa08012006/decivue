/**
 * Constraints Routes
 * HTTP routes for organizational constraint operations
 */

import { Router, Response, NextFunction } from 'express';
import { getAdminDatabase } from '@data/database';
import { AuthRequest } from '@middleware/auth';

const router = Router();

/**
 * GET /api/constraints?decisionId=xxx
 * Get all organizational constraints (auto-apply to all decisions)
 *
 * NOTE: decisionId parameter is kept for API compatibility but ignored.
 * All organizational constraints automatically apply to ALL decisions.
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    // Auto-apply: Return ALL organizational constraints for this organization
    const db = getAdminDatabase();
    const { data, error } = await db
      .from('constraints')
      .select('*')
      .eq('organization_id', organizationId)
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
router.get('/all', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();
    const { data, error} = await db
      .from('constraints')
      .select('*')
      .eq('organization_id', organizationId)
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
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, description, constraintType, ruleExpression, isImmutable, validationConfig } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    // Validate required fields
    if (!name || !constraintType) {
      return res.status(400).json({ error: 'name and constraintType are required' });
    }

    const db = getAdminDatabase();

    // Create the constraint with organization_id
    const { data, error } = await db
      .from('constraints')
      .insert({
        name,
        description: description || null,
        constraint_type: constraintType,
        rule_expression: ruleExpression || null,
        is_immutable: isImmutable || false,
        validation_config: validationConfig || {},
        organization_id: organizationId
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
router.post('/link', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { constraintId, decisionId } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    if (!constraintId || !decisionId) {
      return res.status(400).json({ error: 'constraintId and decisionId are required' });
    }

    const db = getAdminDatabase();

    // Verify both constraint and decision belong to user's organization
    const [constraintCheck, decisionCheck] = await Promise.all([
      db.from('constraints').select('organization_id').eq('id', constraintId).single(),
      db.from('decisions').select('organization_id').eq('id', decisionId).single()
    ]);

    if (constraintCheck.data?.organization_id !== organizationId ||
        decisionCheck.data?.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    // Delete the constraint (cascade will handle decision_constraints)
    // Only delete if it belongs to user's organization
    const { error } = await db
      .from('constraints')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
