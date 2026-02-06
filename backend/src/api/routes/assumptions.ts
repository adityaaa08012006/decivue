import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/assumptions
 * Get all global assumptions with their linked decision counts (Blast Radius)
 * Optional query: ?decisionId=uuid (to get assumptions for a specific decision)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decisionId } = req.query;
    const db = getDatabase();

    let query = db
      .from('assumptions')
      .select(`
        *,
        decisions:decision_assumptions(count),
        decision_details:decision_assumptions(
          decision:decisions(id, title)
        )
      `)
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    // Transform data to include friendly "blast radius" count
    const enrichedData = data?.map((a: any) => ({
      ...a,
      decisionCount: a.decisions?.[0]?.count || 0,
      impactedDecisions: a.decision_details?.map((d: any) => d.decision) || []
    }));

    return res.json(enrichedData || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * POST /api/assumptions
 * Create a new global assumption
 * Optional: link to a decisionId immediately
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { description, status, linkToDecisionId, metadata } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const db = getDatabase();

    // Upsert assumption by description to effectively "get or create"
    const { data: assumption, error: createError } = await db
      .from('assumptions')
      .upsert({
        description,
        status: status || 'HOLDING',
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

export default router;
