import { Router, Response, NextFunction } from 'express';
import { getAdminDatabase } from '@data/database';
import { AssumptionValidationService } from '../../services/assumption-validation-service';
import { AssumptionConflictDetector } from '../../services/assumption-conflict-detector';
import { logger } from '../../utils/logger';
import { AuthRequest } from '@middleware/auth';

const router = Router();
const conflictDetector = new AssumptionConflictDetector();

/**
 * Helper: Re-check conflicts for an assumption after it's been updated
 * Resolves conflicts that no longer exist
 */
async function recheckConflictsForAssumption(assumptionId: string, updatedAssumption: any) {
  try {
    console.log(`🔍 recheckConflictsForAssumption called for ${assumptionId}`);
    console.log('Updated assumption data:', {
      id: updatedAssumption.id,
      description: updatedAssumption.description?.substring(0, 50),
      category: updatedAssumption.category,
      parameters: updatedAssumption.parameters
    });

    const db = getAdminDatabase();

    // Get all unresolved conflicts involving this assumption
    const { data: conflicts, error: conflictsError } = await db
      .from('assumption_conflicts')
      .select('*')
      .or(`assumption_a_id.eq.${assumptionId},assumption_b_id.eq.${assumptionId}`)
      .is('resolved_at', null);

    if (conflictsError) {
      logger.error('Failed to fetch conflicts for re-checking:', conflictsError);
      return;
    }

    if (!conflicts || conflicts.length === 0) {
      return; // No conflicts to re-check
    }

    logger.info(`Re-checking ${conflicts.length} conflicts for assumption ${assumptionId}`);

    // For each conflict, re-run detection
    for (const conflict of conflicts) {
      // Get the other assumption in the conflict
      const otherAssumptionId = conflict.assumption_a_id === assumptionId 
        ? conflict.assumption_b_id 
        : conflict.assumption_a_id;

      const { data: otherAssumption } = await db
        .from('assumptions')
        .select('*')
        .eq('id', otherAssumptionId)
        .single();

      if (!otherAssumption) continue;

      // Re-run conflict detection
      const detectionResult = conflictDetector.detectConflict(
        {
          id: updatedAssumption.id,
          text: updatedAssumption.description,
          status: updatedAssumption.status,
          scope: updatedAssumption.scope,
          category: updatedAssumption.category,
          parameters: updatedAssumption.parameters || {}
        },
        {
          id: otherAssumption.id,
          text: otherAssumption.description,
          status: otherAssumption.status,
          scope: otherAssumption.scope,
          category: otherAssumption.category,
          parameters: otherAssumption.parameters || {}
        }
      );

      // If no conflict detected or confidence is too low, mark as auto-resolved
      if (!detectionResult || detectionResult.confidenceScore < 0.7) {
        console.log(`✅ Auto-resolving conflict ${conflict.id} - no longer detected or low confidence`);
        await db
          .from('assumption_conflicts')
          .update({
            resolved_at: new Date().toISOString(),
            resolution_action: 'AUTO_RESOLVED',
            resolution_notes: 'Automatically resolved after assumption update - conflict no longer detected'
          })
          .eq('id', conflict.id);

        logger.info(`Auto-resolved conflict ${conflict.id} after assumption update`);
      } else {
        // Conflict still exists but might have changed - update metadata
        console.log(`⚠️ Conflict ${conflict.id} still exists - confidence: ${detectionResult.confidenceScore}`);
        await db
          .from('assumption_conflicts')
          .update({
            conflict_type: detectionResult.conflictType,
            confidence_score: detectionResult.confidenceScore,
            metadata: { 
              reason: detectionResult.reason,
              last_rechecked_at: new Date().toISOString()
            }
          })
          .eq('id', conflict.id);

        logger.info(`Updated conflict ${conflict.id} after re-check - still exists with ${detectionResult.confidenceScore} confidence`);
      }
    }
  } catch (error) {
    logger.error('Error during conflict re-checking:', error);
    // Don't throw - this is a background task
  }
}

/**
 * GET /api/assumptions
 * Get assumptions - supports filtering by decision and scope
 * Query params:
 *   - decisionId: Get assumptions for specific decision (includes universal + decision-specific)
 *   - scope: Filter by UNIVERSAL or DECISION_SPECIFIC
 *   - includeConflicts: If true, includes conflict information
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { decisionId, scope, includeConflicts } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

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
      // Get all assumptions with their linked decisions (filtered by organization)
      const { data: assumptions, error: assumptionsError } = await db
        .from('assumptions')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (assumptionsError) throw assumptionsError;

      // Get all decision links
      const { data: links, error: linksError } = await db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          decisions (
            id,
            title,
            lifecycle
          )
        `);

      if (linksError) throw linksError;

      // Filter by scope if requested
      let filteredAssumptions = assumptions || [];
      if (scope) {
        filteredAssumptions = filteredAssumptions.filter((a: any) => a.scope === scope);
      }

      // Build a map of assumption_id -> decision objects
      const linkMap = new Map<string, Array<{ id: string; title: string; lifecycle: string }>>();
      (links || []).forEach((link: any) => {
        if (link.decisions) {
          const existing = linkMap.get(link.assumption_id) || [];
          existing.push({
            id: link.decisions.id,
            title: link.decisions.title,
            lifecycle: link.decisions.lifecycle
          });
          linkMap.set(link.assumption_id, existing);
        }
      });

      // Transform data to include decision count, titles, and impacted decisions
      const enrichedData = filteredAssumptions.map((a: any) => {
        const impactedDecisions = linkMap.get(a.id) || [];
        const decisionTitles = impactedDecisions.map(d => d.title);

        // Check if any linked decisions are deprecated
        const deprecatedDecisions = impactedDecisions.filter(d => 
          d.lifecycle === 'INVALIDATED' || d.lifecycle === 'RETIRED'
        );
        const hasDeprecatedDecisions = deprecatedDecisions.length > 0;
        const allDecisionsDeprecated = impactedDecisions.length > 0 && 
                                        deprecatedDecisions.length === impactedDecisions.length;

        return {
          ...a,
          decisionCount: impactedDecisions.length,
          linkedDecisionTitle: a.scope === 'UNIVERSAL'
            ? 'All Decisions'
            : decisionTitles.length > 0
              ? decisionTitles.join(', ')
              : 'Unlinked',
          impactedDecisions: impactedDecisions,
          hasDeprecatedDecisions,
          allDecisionsDeprecated,
          deprecatedDecisionCount: deprecatedDecisions.length,
          deprecationWarning: hasDeprecatedDecisions 
            ? allDecisionsDeprecated
              ? `All ${deprecatedDecisions.length} linked decision(s) are deprecated. This assumption should be marked as BROKEN.`
              : `${deprecatedDecisions.length} of ${impactedDecisions.length} linked decision(s) are deprecated.`
            : undefined
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
 * Body: { description, status?, scope?, linkToDecisionId?, metadata?, category?, parameters? }
 */
router.post('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { description, status, scope, linkToDecisionId, metadata, category, parameters } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    // Create or get existing assumption
    const assumptionData: any = {
      description,
      status: status || 'VALID',
      scope: scope || 'DECISION_SPECIFIC',
      metadata: metadata || {},
      organization_id: req.user?.organizationId, // Add organization_id
    };

    // Add structured fields if provided
    if (category) assumptionData.category = category;
    if (parameters) assumptionData.parameters = parameters;

    const { data: assumption, error: createError } = await db
      .from('assumptions')
      .upsert(assumptionData, { onConflict: 'description' })
      .select()
      .single();

    if (createError) throw createError;

    // Link to decision if requested
    if (linkToDecisionId && assumption) {
      // Validate decision is not deprecated
      const { data: decision } = await db
        .from('decisions')
        .select('lifecycle, title')
        .eq('id', linkToDecisionId)
        .single();

      if (decision && (decision.lifecycle === 'INVALIDATED' || decision.lifecycle === 'RETIRED')) {
        return res.status(400).json({
          error: 'Cannot link to deprecated decision',
          message: `The decision "${decision.title}" is ${decision.lifecycle.toLowerCase()}. Deprecated decisions cannot have new assumptions linked.`
        });
      }

      const { error: linkError } = await db
        .from('decision_assumptions')
        .insert({
          decision_id: linkToDecisionId,
          assumption_id: assumption.id,
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
router.post('/:id/link', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { decisionId } = req.body;

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    if (!decisionId) {
      return res.status(400).json({ error: 'Decision ID is required' });
    }

    const db = getAdminDatabase();

    // Get assumption details including all linked decisions
    const { data: assumption } = await db
      .from('assumptions')
      .select(`
        id,
        status,
        description,
        scope,
        decision_assumptions (
          decision_id,
          decisions (
            id,
            lifecycle
          )
        )
      `)
      .eq('id', id)
      .single();

    if (!assumption) {
      return res.status(404).json({ error: 'Assumption not found' });
    }

    // Check if this is a DECISION_SPECIFIC assumption with only deprecated decisions  
    if (assumption.scope === 'DECISION_SPECIFIC' && assumption.status === 'BROKEN') {
      // If it's BROKEN, check if we're linking to an active decision to "revive" it
      const { data: targetDecision } = await db
        .from('decisions')
        .select('lifecycle')
        .eq('id', decisionId)
        .single();

      if (targetDecision && (targetDecision.lifecycle === 'INVALIDATED' || targetDecision.lifecycle === 'RETIRED')) {
        return res.status(400).json({
          error: 'Cannot link deprecated assumption to deprecated decision',
          message: `Both the assumption and decision are deprecated. Cannot create this link.`
        });
      }

      // Target decision is active - allow the link and revive the assumption
      await db
        .from('assumptions')
        .update({ 
          status: 'VALID',
          validated_at: new Date().toISOString()
        })
        .eq('id', id);
    } else if (assumption.status === 'BROKEN') {
      // BROKEN non-DECISION_SPECIFIC assumptions shouldn't be linkable
      return res.status(400).json({
        error: 'Cannot link deprecated assumption',
        message: `The assumption "${assumption.description}" is BROKEN/deprecated and cannot be linked to decisions.`
      });
    }

    // Also check if all existing linked decisions are deprecated (auto-deprecate if needed)
    if (assumption.scope === 'DECISION_SPECIFIC' && assumption.status !== 'BROKEN') {
      const linkedDecisions = assumption.decision_assumptions || [];
      
      if (linkedDecisions.length > 0) {
        const allDeprecated = linkedDecisions.every((da: any) => 
          da.decisions?.lifecycle === 'INVALIDATED' || 
          da.decisions?.lifecycle === 'RETIRED'
        );

        // If all existing decisions are deprecated, check the target decision
        if (allDeprecated) {
          const { data: targetDecision } = await db
            .from('decisions')
            .select('lifecycle')
            .eq('id', decisionId)
            .single();

          if (targetDecision && (targetDecision.lifecycle === 'INVALIDATED' || targetDecision.lifecycle === 'RETIRED')) {
            // Target is also deprecated - mark assumption as BROKEN and block
            await db
              .from('assumptions')
              .update({ 
                status: 'BROKEN',
                validated_at: new Date().toISOString()
              })
              .eq('id', id);

            return res.status(400).json({
              error: 'Cannot link deprecated assumption',
              message: `The assumption "${assumption.description}" was auto-deprecated because all its linked decisions are deprecated.`
            });
          }
          // Target is active - allow the link (assumption will have an active decision)
        }
      }
    }

    // Validate decision is not deprecated
    const { data: decision } = await db
      .from('decisions')
      .select('lifecycle, title')
      .eq('id', decisionId)
      .single();

    if (decision && (decision.lifecycle === 'INVALIDATED' || decision.lifecycle === 'RETIRED')) {
      return res.status(400).json({
        error: 'Cannot link to deprecated decision',
        message: `The decision "${decision.title}" is ${decision.lifecycle.toLowerCase()}. Deprecated decisions cannot have new assumptions linked.`
      });
    }

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
router.post('/:id/conflicts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { conflictingAssumptionId, reason } = req.body;

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    if (!conflictingAssumptionId) {
      return res.status(400).json({ error: 'conflictingAssumptionId is required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'conflict reason is required' });
    }

    const db = getAdminDatabase();

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
router.get('/:id/conflicts', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const db = getAdminDatabase();

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
router.put('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { description, status, scope, metadata, category, parameters } = req.body;

    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    // Get current assumption state for validation
    const { data: currentAssumption } = await db
      .from('assumptions')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentAssumption) {
      return res.status(404).json({ error: 'Assumption not found' });
    }

    // Validate status change if status is being updated
    let validationResult = null;
    if (status !== undefined && status !== currentAssumption.status) {
      validationResult = await AssumptionValidationService.validateStatusChange(
        id,
        status,
        currentAssumption.status
      );
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      updateData.validated_at = new Date().toISOString(); // Update validation timestamp
    }
    if (scope !== undefined) updateData.scope = scope;
    if (metadata !== undefined) updateData.metadata = metadata;
    if (category !== undefined) updateData.category = category;
    if (parameters !== undefined) updateData.parameters = parameters;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Perform the update
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

    // If status changed, trigger re-evaluation of linked decisions
    if (status !== undefined && status !== currentAssumption.status) {
      // Fire and forget - don't wait for re-evaluation
      AssumptionValidationService.reEvaluateLinkedDecisions(id).catch((err) => {
        console.error('Failed to re-evaluate linked decisions:', err);
      });
    }

    // Re-check conflicts after any update that could affect conflict detection
    if (category !== undefined || parameters !== undefined || description !== undefined) {
      console.log(`🔄 Re-checking conflicts for assumption ${id} after update`);
      console.log('Updated fields:', { category, parameters, description: description?.substring(0, 50) });
      // Wait for conflict re-checking to complete before responding
      try {
        await recheckConflictsForAssumption(id, data);
      } catch (err) {
        console.error('Failed to re-check conflicts:', err);
        // Don't fail the update if conflict re-checking fails
      }
    }

    // Return response with validation warning if applicable
    return res.json({
      ...data,
      validation: validationResult && !validationResult.isValid ? {
        warning: true,
        suggestedStatus: validationResult.suggestedStatus,
        reason: validationResult.reason,
        confidence: validationResult.confidence
      } : null
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/assumptions/:id
 * Delete an assumption
 * Note: This will also delete all decision_assumptions links (CASCADE)
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { error } = await db
      .from('assumptions')
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
