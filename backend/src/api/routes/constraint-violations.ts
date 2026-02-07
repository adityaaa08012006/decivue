/**
 * Constraint Violations API Routes
 * Endpoints for managing constraint violations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';
import { ConstraintViolationRepository } from '@data/repositories/constraint-violation-repository';
import { logger } from '@utils/logger';

const router = Router();

/**
 * GET /api/constraint-violations?decisionId=xxx
 * Get violations for a decision (or all violations if no decisionId)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId, includeResolved } = req.query;
    const db = getDatabase();
    const repo = new ConstraintViolationRepository(db);

    if (decisionId) {
      const violations = includeResolved === 'true'
        ? await repo.getAllViolations(decisionId as string)
        : await repo.getActiveViolations(decisionId as string);

      res.json(violations);
    } else {
      // Get all violations (admin view)
      const { data, error } = await db
        .from('constraint_violations')
        .select('*, constraints!constraint_violations_constraint_id_fkey(*), decisions!constraint_violations_decision_id_fkey(id, title, lifecycle)')
        .order('detected_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      res.json(data || []);
    }
  } catch (error) {
    logger.error('Failed to fetch constraint violations', { error });
    next(error);
  }
});

/**
 * GET /api/constraint-violations/:id
 * Get a single violation by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const { data, error } = await db
      .from('constraint_violations')
      .select('*, constraints!constraint_violations_constraint_id_fkey(*), decisions!constraint_violations_decision_id_fkey(id, title, lifecycle)')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Violation not found' });
    }

    return res.json(data);
  } catch (error) {
    logger.error('Failed to fetch violation', { error });
    return next(error);
  }
});

/**
 * PUT /api/constraint-violations/:id/resolve
 * Mark a violation as resolved
 */
router.put('/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const repo = new ConstraintViolationRepository(db);

    await repo.resolveViolation(id);

    // Fetch updated violation
    const { data } = await db
      .from('constraint_violations')
      .select('*, constraints!constraint_violations_constraint_id_fkey(*)')
      .eq('id', id)
      .single();

    logger.info('Constraint violation resolved', { violationId: id });

    res.json({
      message: 'Violation resolved successfully',
      violation: data
    });
  } catch (error) {
    logger.error('Failed to resolve violation', { error });
    next(error);
  }
});

/**
 * DELETE /api/constraint-violations/:id
 * Delete a violation
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const repo = new ConstraintViolationRepository(db);

    await repo.deleteViolation(id);

    logger.info('Constraint violation deleted', { violationId: id });

    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete violation', { error });
    next(error);
  }
});

/**
 * GET /api/constraint-violations/by-constraint/:constraintId
 * Get all violations for a specific constraint
 */
router.get('/by-constraint/:constraintId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { constraintId } = req.params;
    const db = getDatabase();
    const repo = new ConstraintViolationRepository(db);

    const violations = await repo.getViolationsByConstraint(constraintId);

    res.json(violations);
  } catch (error) {
    logger.error('Failed to fetch violations by constraint', { error });
    next(error);
  }
});

export default router;
