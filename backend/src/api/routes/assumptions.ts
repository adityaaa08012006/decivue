import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/assumptions
 * Get assumptions - supports filtering by decision and scope
 * Query params:
 *   - decisionId: Get assumptions for specific decision (includes universal + decision-specific)
 *   - scope: Filter by UNIVERSAL or DECISION_SPECIFIC
 *   - includeConflicts: If true, includes conflict information
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId, scope, includeConflicts } = req.query;
    const db = getDatabase();

    if (decisionId) {
      // Get assumptions for a specific decision (only explicitly linked via decision_assumptions)
      const { data, error } = await db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          assumptions (
            id,
            description,
            status,
            scope,
            validated_at,
            metadata,
            created_at
          )
        `)
        .eq('decision_id', decisionId);

      if (error) throw error;

      const assumptions = (data || []).map((da: any) => da.assumptions);

      // Optionally fetch conflicts
      if (includeConflicts === 'true') {
        for (const assumption of assumptions) {
          const { data: conflicts } = await db.rpc('get_assumption_conflicts', {
            p_assumption_id: assumption.id
          });
          assumption.conflicts = conflicts || [];
        }
      }

      return res.json(assumptions);
    } else {
      // Get all assumptions with their linked decisions
      const { data: assumptions, error: assumptionsError } = await db
        .from('assumptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (assumptionsError) throw assumptionsError;

      // Get all decision links
      const { data: links, error: linksError } = await db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          decisions (
            id,
            title
          )
        `);

      if (linksError) throw linksError;

      // Filter by scope if requested
      let filteredAssumptions = assumptions || [];
      if (scope) {
        filteredAssumptions = filteredAssumptions.filter((a: any) => a.scope === scope);
      }

      // Build a map of assumption_id -> decision titles
      const linkMap = new Map<string, string[]>();
      (links || []).forEach((link: any) => {
        if (link.decisions) {
          const existing = linkMap.get(link.assumption_id) || [];
          existing.push(link.decisions.title);
          linkMap.set(link.assumption_id, existing);
        }
      });

      // Transform data to include decision count and titles
      const enrichedData = filteredAssumptions.map((a: any) => {
        const decisionTitles = linkMap.get(a.id) || [];
        
        return {
          ...a,
          decisionCount: decisionTitles.length,
          linkedDecisionTitle: a.scope === 'UNIVERSAL' 
            ? 'All Decisions' 
            : decisionTitles.length > 0 
              ? decisionTitles.join(', ')
              : 'Unlinked'
        };
      });

      return res.json(enrichedData);
    }
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumptions
 * Create a new assumption (universal or decision-specific)
 * Body: { description, status?, scope?, linkToDecisionId?, metadata? }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, status, scope, linkToDecisionId, metadata } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const db = getDatabase();

    // Create or get existing assumption
    const { data: assumption, error: createError } = await db
      .from('assumptions')
      .upsert({
        description,
        status: status || 'HOLDING',
        scope: scope || 'DECISION_SPECIFIC',
        metadata: metadata || {}
      }, { onConflict: 'description' })
      .select()
      .single();

    if (createError) throw createError;

    // Link to decision if requested
    if (linkToDecisionId && assumption) {
      const { error: linkError } = await db
        .from('decision_assumptions')
        .insert({
          decision_id: linkToDecisionId,
          assumption_id: assumption.id
        })
        .select();

      // Ignore unique constraint violation if already linked
      if (linkError && linkError.code !== '23505') {
        throw linkError;
      }
    }

    return res.status(201).json(assumption);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumptions/:id/link
 * Link an existing assumption to a decision
 */
router.post('/:id/link', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decisionId } = req.body;

    if (!decisionId) {
      return res.status(400).json({ error: 'Decision ID is required' });
    }

    const db = getDatabase();
    const { data, error } = await db
      .from('decision_assumptions')
      .insert({
        decision_id: decisionId,
        assumption_id: id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        return res.status(200).json({ message: 'Already linked' });
      }
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumptions/:id/conflicts
 * Report a conflict between two assumptions
 * Body: { conflictingAssumptionId: string, reason: string }
 */
router.post('/:id/conflicts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { conflictingAssumptionId, reason } = req.body;

    if (!conflictingAssumptionId) {
      return res.status(400).json({ error: 'conflictingAssumptionId is required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'conflict reason is required' });
    }

    const db = getDatabase();

    // Ensure IDs are ordered to prevent duplicates
    const [aId, bId] = [id, conflictingAssumptionId].sort();

    const { data, error } = await db
      .from('assumption_conflicts')
      .insert({
        assumption_a_id: aId,
        assumption_b_id: bId,
        conflict_reason: reason
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation - conflict already reported
        return res.status(200).json({ message: 'Conflict already reported' });
      }
      throw error;
    }

    return res.status(201).json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/assumptions/:id/conflicts
 * Get all conflicts for a specific assumption
 */
router.get('/:id/conflicts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const { data, error } = await db.rpc('get_assumption_conflicts', {
      p_assumption_id: id
    });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/assumptions/:id
 * Update an existing assumption
 * Body: { description?, status?, scope?, metadata? }
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, status, scope, metadata } = req.body;

    const db = getDatabase();

    // Build update object with only provided fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (scope !== undefined) updateData.scope = scope;
    if (metadata !== undefined) updateData.metadata = metadata;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await db
      .from('assumptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Assumption not found' });
    }

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/assumptions/:id
 * Delete an assumption
 * Note: This will also delete all decision_assumptions links (CASCADE)
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const { error } = await db
      .from('assumptions')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
