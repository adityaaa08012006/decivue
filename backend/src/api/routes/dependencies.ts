/**
 * Dependencies Routes
 * HTTP routes for dependency operations
 */

import { Router, Response, NextFunction } from 'express';
import { getAdminDatabase } from '@data/database';
import { AuthRequest } from '@middleware/auth';

const router = Router();

/**
 * GET /api/dependencies?decisionId=xxx
 * Get all dependencies for a decision (both depends on and blocks)
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    if (!decisionId) {
      return res.status(400).json({ error: 'decisionId is required' });
    }

    const db = getAdminDatabase();

    // Verify decision belongs to user's organization
    const { data: decision } = await db
      .from('decisions')
      .select('organization_id')
      .eq('id', decisionId)
      .single();

    if (!decision || decision.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // 1. Get decisions I BLOCK (I am the Source)
    const { data: blocking, error: error1 } = await db
      .from('dependencies')
      .select(`
        id,
        target_decision_id,
        decisions:target_decision_id (
          id,
          title,
          lifecycle,
          organization_id
        )
      `)
      .eq('source_decision_id', decisionId);

    if (error1) throw error1;

    // Filter to ensure all belong to same organization
    const filteredBlocking = (blocking || []).filter((d: any) =>
      d.decisions?.organization_id === organizationId
    );

    // 2. Get decisions I am BLOCKED BY (I am the Target)
    const { data: blockedBy, error: error2 } = await db
      .from('dependencies')
      .select(`
        id,
        source_decision_id,
        decisions:source_decision_id (
          id,
          title,
          lifecycle,
          organization_id
        )
      `)
      .eq('target_decision_id', decisionId);

    if (error2) throw error2;

    // Filter to ensure all belong to same organization
    const filteredBlockedBy = (blockedBy || []).filter((d: any) =>
      d.decisions?.organization_id === organizationId
    );

    // Check for deprecated decisions and add warnings
    const addDeprecationWarnings = (dependencies: any[]) => {
      return dependencies.map((dep: any) => {
        const isDeprecated = dep.decisions?.lifecycle === 'INVALIDATED' || 
                            dep.decisions?.lifecycle === 'RETIRED';
        return {
          ...dep,
          isDeprecated,
          deprecationWarning: isDeprecated 
            ? `This decision is ${dep.decisions?.lifecycle.toLowerCase()}. Consider unlinking or deprecating both decisions.`
            : undefined
        };
      });
    };

    return res.json({
      blocking: addDeprecationWarnings(filteredBlocking), // Downstream
      blockedBy: addDeprecationWarnings(filteredBlockedBy) // Upstream
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/dependencies
 * Create a new dependency
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { sourceDecisionId, targetDecisionId } = req.body;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    if (!sourceDecisionId || !targetDecisionId) {
      return res.status(400).json({ error: 'sourceDecisionId and targetDecisionId are required' });
    }

    const db = getAdminDatabase();

    // Verify both decisions belong to user's organization AND check lifecycle
    const [sourceCheck, targetCheck] = await Promise.all([
      db.from('decisions').select('organization_id, lifecycle, title').eq('id', sourceDecisionId).single(),
      db.from('decisions').select('organization_id, lifecycle, title').eq('id', targetDecisionId).single()
    ]);

    if (sourceCheck.data?.organization_id !== organizationId ||
        targetCheck.data?.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied: Both decisions must belong to your organization' });
    }

    // Check if either decision is deprecated
    const sourceIsDeprecated = sourceCheck.data?.lifecycle === 'INVALIDATED' || 
                               sourceCheck.data?.lifecycle === 'RETIRED';
    const targetIsDeprecated = targetCheck.data?.lifecycle === 'INVALIDATED' || 
                               targetCheck.data?.lifecycle === 'RETIRED';

    if (sourceIsDeprecated || targetIsDeprecated) {
      const deprecatedDecision = sourceIsDeprecated ? sourceCheck.data : targetCheck.data;
      return res.status(400).json({ 
        error: 'Cannot link to deprecated decision',
        message: `The decision "${deprecatedDecision?.title}" is ${deprecatedDecision?.lifecycle.toLowerCase()}. Deprecated decisions cannot be linked to other decisions.`,
        deprecatedDecisionId: sourceIsDeprecated ? sourceDecisionId : targetDecisionId,
        lifecycle: deprecatedDecision?.lifecycle
      });
    }

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
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    // Verify the dependency involves decisions from user's organization
    const { data: dependency } = await db
      .from('dependencies')
      .select(`
        id,
        source_decision_id,
        target_decision_id,
        source:decisions!dependencies_source_decision_id_fkey(organization_id),
        target:decisions!dependencies_target_decision_id_fkey(organization_id)
      `)
      .eq('id', id)
      .single();

    if (!dependency ||
        (dependency.source as any)?.organization_id !== organizationId ||
        (dependency.target as any)?.organization_id !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

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
