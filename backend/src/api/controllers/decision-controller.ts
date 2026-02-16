/**
 * Decision Controller
 * Handles HTTP requests for decision operations
 */

import { Response, NextFunction } from 'express';
import { DecisionRepository } from '@data/repositories/decision-repository';
import { getAdminDatabase } from '@data/database';
import { DeterministicEngine } from '@engine/index';
import { eventBus } from '@events/event-bus';
import { getCurrentTime } from '@api/routes/time-simulation';
import { EventType } from '@events/event-types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logger';
import { AuthRequest } from '@middleware/auth';
import { AssumptionValidationService } from '@services/assumption-validation-service';
import { EvaluationService } from '@services/evaluation-service';

export class DecisionController {
  private engine: DeterministicEngine;

  constructor() {
    this.engine = new DeterministicEngine();
  }

  /**
   * GET /api/decisions
   * Get all decisions (filtered by organization)
   */
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required'});
      }

      const db = getAdminDatabase();
      const repository = new DecisionRepository(db);
      const allDecisions = await repository.findAll();

      // Filter by organization
      const decisions = allDecisions.filter((d: any) => d.organizationId === organizationId);
      return res.json(decisions);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/decisions/:id
   * Get a single decision by ID (filtered by organization)
   */
  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      const repository = new DecisionRepository(db);
      const decision = await repository.findById(req.params.id);

      // Verify organization ownership
      if ((decision as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      return res.json(decision);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/decisions
   * Create a new decision
   */
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const db = getAdminDatabase();

      // Add organization_id and created_by from authenticated user
      const decisionData = {
        ...req.body,
        organization_id: req.user?.organizationId,
        created_by: req.user?.id,
      };

      const repository = new DecisionRepository(db);
      const decision = await repository.create(decisionData);

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.DECISION_CREATED,
        timestamp: new Date(),
        decision
      });

      logger.info(`Decision created: ${decision.id}`);
      res.status(201).json(decision);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/decisions/:id
   * Update a decision (with version control)
   */
  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      const userId = req.user?.id;

      if (!organizationId || !userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const db = getAdminDatabase();
      const repository = new DecisionRepository(db);

      // Verify ownership before update
      const existing = await repository.findById(req.params.id);
      if ((existing as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Track which fields changed
      const changedFields: string[] = [];
      const trackableFields = ['title', 'description', 'category', 'parameters'];
      
      trackableFields.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== (existing as any)[field]) {
          changedFields.push(field);
        }
      });

      // Update decision with modified_at and modified_by
      const updateData = {
        ...req.body,
        modified_at: new Date().toISOString(),
        modified_by: userId
      };
      
      const decision = await repository.update(req.params.id, updateData);

      // Create version snapshot if fields changed
      if (changedFields.length > 0) {
        const changeSummary = this.generateChangeSummary(changedFields);
        
        await db.rpc('create_decision_version', {
          p_decision_id: req.params.id,
          p_change_type: 'field_updated',
          p_change_summary: changeSummary,
          p_changed_fields: changedFields,
          p_changed_by: userId
        });

        logger.info(`Decision version created: ${decision.id}, changed: ${changedFields.join(', ')}`);
      }

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.DECISION_UPDATED,
        timestamp: new Date(),
        decisionId: decision.id,
        changes: req.body,
      });

      logger.info(`Decision updated: ${decision.id}`);
      return res.json(decision);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Generate a human-readable summary of what changed
   */
  private generateChangeSummary(changedFields: string[]): string {
    if (changedFields.length === 0) return 'No changes';
    if (changedFields.length === 1) {
      const field = changedFields[0];
      return `Updated ${field}`;
    }
    if (changedFields.length === 2) {
      return `Updated ${changedFields[0]} and ${changedFields[1]}`;
    }
    return `Updated ${changedFields.slice(0, -1).join(', ')}, and ${changedFields[changedFields.length - 1]}`;
  }

  /**
   * DELETE /api/decisions/:id
   * Delete a decision
   */
  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      const repository = new DecisionRepository(db);

      // Verify ownership before delete
      const existing = await repository.findById(req.params.id);
      if ((existing as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await repository.delete(req.params.id);
      logger.info(`Decision deleted: ${req.params.id}`);
      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  }

  /**
   * PUT /api/decisions/:id/retire
   * Retire a decision (mark as deprecated/final)
   */
  async retire(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const organizationId = req.user?.organizationId;

      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();

      // Update decision to RETIRED lifecycle
      const { data: decision, error } = await db
        .from('decisions')
        .update({
          lifecycle: 'RETIRED',
          invalidated_reason: reason || 'manually_retired',
          health_signal: 0
        })
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      if (!decision) {
        return res.status(404).json({ error: 'Decision not found' });
      }

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.DECISION_UPDATED,
        timestamp: getCurrentTime(),
        decisionId: id,
        changes: { lifecycle: 'RETIRED' as any, invalidatedReason: reason || 'manually_retired' }
      });

      // Check and deprecate orphaned decision-specific assumptions
      await AssumptionValidationService.deprecateOrphanedAssumptions(id);

      logger.info(`Decision retired: ${id}`);
      return res.json(decision);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/decisions/:id/evaluate
   * Trigger manual evaluation of a decision
   * 
   * Query params:
   * - force: boolean (optional) - Force evaluation even if not needed
   * - check: boolean (optional) - Only check if evaluation is needed, don't evaluate
   */
  async evaluate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const decisionId = req.params.id;
      const force = req.query.force === 'true';
      const checkOnly = req.query.check === 'true';
      const db = getAdminDatabase();

      logger.info(`🔄 Evaluation request for decision: ${decisionId}`, { force, checkOnly });

      // If check-only mode, just return whether evaluation is needed
      if (checkOnly) {
        const check = await EvaluationService.needsEvaluation(decisionId);
        return res.json({
          needsEvaluation: check.needsEvaluation,
          reason: check.reason,
          lastEvaluatedAt: check.lastEvaluatedAt,
          hoursSinceEval: check.hoursSinceEval
        });
      }

      // Fetch decision for verification
      const { data: decision, error: decisionError } = await db
        .from('decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (decisionError || !decision) {
        logger.error(`Decision not found: ${decisionId}`);
        return res.status(404).json({ error: 'Decision not found' });
      }

      // Use smart evaluation service
      const result = await EvaluationService.evaluateIfNeeded(decisionId, force);

      // If evaluation was skipped (not needed)
      if (result === null) {
        logger.info(`Evaluation skipped for decision ${decisionId} (not needed)`);
        return res.json({
          decision,
          skipped: true,
          message: 'Evaluation not needed - decision is fresh'
        });
      }

      logger.info(`Decision ${decisionId} evaluated successfully`);

      // Record in evaluation history
      await db.from('evaluation_history').insert({
        decision_id: decisionId,
        old_lifecycle: decision.lifecycle,
        new_lifecycle: result.newLifecycle,
        old_health_signal: decision.health_signal,
        new_health_signal: result.newHealthSignal,
        invalidated_reason: result.invalidatedReason || null,
        trace: result.trace || {},
        evaluated_at: getCurrentTime().toISOString()
      });

      logger.info(`Decision ${decisionId} evaluated`, {
        oldHealth: decision.health_signal,
        newHealth: result.newHealthSignal,
        oldLifecycle: decision.lifecycle,
        newLifecycle: result.newLifecycle
      });

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.DECISION_EVALUATED,
        timestamp: getCurrentTime(),
        decisionId,
        evaluationResult: result
      });

      // If decision was truly retired, check and deprecate orphaned assumptions
      // Note: INVALIDATED decisions can recover, so we don't deprecate their assumptions
      if (result.newLifecycle === 'RETIRED') {
        await AssumptionValidationService.deprecateOrphanedAssumptions(decisionId);
      }

      // Return updated decision
      const { data: updatedDecision } = await db
        .from('decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

      return res.json({
        decision: updatedDecision,
        evaluation: {
          oldHealth: decision.health_signal,
          newHealth: result.newHealthSignal,
          healthChange: result.newHealthSignal - decision.health_signal,
          oldLifecycle: decision.lifecycle,
          newLifecycle: result.newLifecycle,
          lifecycleChanged: decision.lifecycle !== result.newLifecycle,
          invalidatedReason: result.invalidatedReason,
          trace: result.trace
        }
      });
    } catch (error) {
      logger.error('Evaluation failed', { error });
      return next(error);
    }
  }

  /**
   * PUT /api/decisions/:id/mark-reviewed
   * Mark a decision as reviewed (updates last_reviewed_at to now and re-evaluates to restore health)
   * 
   * Request body:
   * - reviewComment: string (optional) - User's review notes/comments
   * - reviewType: 'routine' | 'conflict_resolution' | 'expiry_check' | 'manual' (optional, defaults to 'routine')
   */
  async markReviewed(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reviewComment, reviewType = 'routine' } = req.body;
      const userId = req.user?.id;
      const db = getAdminDatabase();

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' });
      }

      // First, check the decision's current state
      const { data: currentDecision } = await db
        .from('decisions')
        .select('*')
        .eq('id', id)
        .single();

      if (!currentDecision) {
        return res.status(404).json({ error: 'Decision not found' });
      }

      // Prevent reviewing RETIRED decisions
      if (currentDecision.lifecycle === 'RETIRED') {
        return res.status(400).json({ 
          error: 'Cannot review a retired decision',
          message: 'This decision has been retired and cannot be reviewed. Retired decisions are final.'
        });
      }

      // Prevent reviewing significantly expired decisions (30+ days past expiry)
      if (currentDecision.expiry_date) {
        const expiryDate = new Date(currentDecision.expiry_date);
        const now = getCurrentTime();
        const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysUntilExpiry < -30) {
          return res.status(400).json({
            error: 'Cannot review an expired decision',
            message: `This decision expired ${Math.floor(Math.abs(daysUntilExpiry))} days ago and should be retired.`
          });
        }
      }

      // Create review record BEFORE updating decision
      const { data: reviewRecord, error: reviewError } = await db.rpc('create_decision_review', {
        p_decision_id: id,
        p_reviewer_id: userId,
        p_review_type: reviewType,
        p_review_comment: reviewComment || null,
        p_metadata: {}
      });

      if (reviewError) {
        logger.error(`Failed to create review record: ${reviewError.message}`);
      }

      // Update last_reviewed_at to current timestamp
      const { data: decision, error } = await db
        .from('decisions')
        .update({ last_reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!decision) {
        return res.status(404).json({ error: 'Decision not found' });
      }

      logger.info(`Decision marked as reviewed: ${id}, triggering re-evaluation`);

      // Re-evaluate the decision to restore health
      // Fetch related data for evaluation
      const [assumptionsResult, constraintsResult, dependenciesResult] = await Promise.all([
        db.from('decision_assumptions')
          .select('assumptions(*)')
          .eq('decision_id', id),
        db.from('decision_constraints')
          .select('constraints(*)')
          .eq('decision_id', id),
        db.from('dependencies')
          .select('blocking_decision_id, decisions!dependencies_blocking_decision_id_fkey(id, title, description, health_signal, lifecycle, created_at, last_reviewed_at, expiry_date, metadata)')
          .eq('blocked_decision_id', id)
      ]);

      const assumptions = (assumptionsResult.data || [])
        .map((da: any) => da.assumptions)
        .filter(Boolean);

      const constraints = (constraintsResult.data || [])
        .map((dc: any) => dc.constraints)
        .filter(Boolean);

      const dependencies = (dependenciesResult.data || [])
        .map((dep: any) => ({
          id: dep.decisions?.id,
          title: dep.decisions?.title || '',
          description: dep.decisions?.description || '',
          healthSignal: dep.decisions?.health_signal || 100,
          lifecycle: dep.decisions?.lifecycle || 'STABLE',
          createdAt: dep.decisions?.created_at ? new Date(dep.decisions.created_at) : new Date(),
          lastReviewedAt: dep.decisions?.last_reviewed_at ? new Date(dep.decisions.last_reviewed_at) : new Date(),
          expiryDate: dep.decisions?.expiry_date ? new Date(dep.decisions.expiry_date) : undefined,
          metadata: dep.decisions?.metadata || {}
        }))
        .filter((dep: any) => dep.id);

      // Evaluate with updated review timestamp
      const evaluationInput = {
        decision: {
          id: decision.id,
          title: decision.title,
          description: decision.description,
          lifecycle: decision.lifecycle,
          healthSignal: decision.health_signal,
          lastReviewedAt: new Date(decision.last_reviewed_at), // Now updated
          createdAt: new Date(decision.created_at),
          expiryDate: decision.expiry_date ? new Date(decision.expiry_date) : undefined,
          metadata: decision.metadata || {}
        },
        assumptions: assumptions.map((a: any) => ({
          id: a.id,
          description: a.description,
          status: a.status,
          createdAt: a.created_at ? new Date(a.created_at) : new Date(),
          validatedAt: a.validated_at ? new Date(a.validated_at) : undefined,
          metadata: a.metadata || {}
        })) as any,
        constraints: constraints.map((c: any) => ({
          id: c.id,
          name: c.constraint_name || '',
          description: c.description || '',
          constraintType: c.constraint_type || 'OTHER',
          ruleExpression: c.rule_definition,
          isImmutable: c.is_immutable !== false,
          createdAt: c.created_at ? new Date(c.created_at) : new Date(),
          constraint_name: c.constraint_name,
          constraint_type: c.constraint_type,
          rule_definition: c.rule_definition,
          scope: c.scope
        })) as any,
        dependencies: dependencies,
        currentTimestamp: getCurrentTime()
      };

      const result = this.engine.evaluate(evaluationInput);

      // Check for assumption conflicts
      const assumptionIds = assumptions.map((a: any) => a.id);
      const { data: allConflicts } = await db.rpc('get_all_assumption_conflicts', {
        unresolved_only: true
      });
      
      const conflictsForDecision = (allConflicts || []).filter((conflict: any) => 
        assumptionIds.includes(conflict.assumption1_id) || 
        assumptionIds.includes(conflict.assumption2_id)
      );
      const hasConflicts = conflictsForDecision.length > 0;

      // When a decision is reviewed, reset health to 100 unless there are actual blocking problems
      // Reviewing acknowledges broken assumptions and accepts the current state
      // Only hard violations (constraints or conflicts) should prevent the reset
      let newHealth = 100;
      let newLifecycle = 'STABLE';
      let invalidatedReason = null;

      // Only keep degraded state for constraint violations (hard failures)
      if (result.invalidatedReason === 'constraint_violation') {
        newHealth = result.newHealthSignal;
        newLifecycle = result.newLifecycle;
        invalidatedReason = result.invalidatedReason;
        logger.info(`Decision ${id} has constraint violations - cannot restore health via review`);
      } else if (hasConflicts) {
        // Decision has conflicts - keep it in UNDER_REVIEW
        newHealth = 70; // Moderate health penalty for conflicts
        newLifecycle = 'UNDER_REVIEW';
        logger.info(`Decision ${id} has ${conflictsForDecision.length} assumption conflict(s) - keeping in UNDER_REVIEW`);
      } else {
        // Review successfully acknowledges any broken assumptions
        logger.info(`Decision ${id} reviewed - health restored to 100 (any broken assumptions acknowledged)`);
      }

      // Update decision with restored health
      const { error: updateError } = await db
        .from('decisions')
        .update({
          health_signal: newHealth,
          lifecycle: newLifecycle,
          invalidated_reason: invalidatedReason
        })
        .eq('id', id);

      if (updateError) {
        logger.error(`Failed to update decision after review: ${updateError.message}`);
      } else {
        logger.info(`Decision ${id} reviewed and health restored to ${newHealth}`);
      }

      // Update review record with post-review state
      if (reviewRecord) {
        await db.rpc('update_review_outcome', {
          p_review_id: reviewRecord,
          p_new_lifecycle: newLifecycle,
          p_new_health_signal: newHealth
        });
      }

      // Dismiss any "NEEDS_REVIEW" notifications for this decision
      await db
        .from('notifications')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('decision_id', id)
        .eq('type', 'NEEDS_REVIEW')
        .eq('is_dismissed', false);

      // Return the updated decision
      const { data: updatedDecision } = await db
        .from('decisions')
        .select()
        .eq('id', id)
        .single();

      return res.json(updatedDecision || decision);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/decisions/:id/versions
   * Get version history for a decision
   */
  async getVersionHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      
      // Verify ownership
      const repository = new DecisionRepository(db);
      const decision = await repository.findById(req.params.id);
      if ((decision as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data, error } = await db.rpc('get_decision_version_history', {
        p_decision_id: req.params.id
      });

      if (error) throw error;
      return res.json(data || []);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/decisions/:id/relation-history
   * Get assumption/constraint/dependency change history
   */
  async getRelationHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      
      // Verify ownership
      const repository = new DecisionRepository(db);
      const decision = await repository.findById(req.params.id);
      if ((decision as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data, error } = await db.rpc('get_decision_relation_history', {
        p_decision_id: req.params.id
      });

      if (error) throw error;
      return res.json(data || []);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/decisions/:id/health-history
   * Get health signal change history with explanations
   */
  async getHealthHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      
      // Verify ownership
      const repository = new DecisionRepository(db);
      const decision = await repository.findById(req.params.id);
      if ((decision as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data, error } = await db.rpc('get_decision_health_history', {
        p_decision_id: req.params.id
      });

      if (error) throw error;
      return res.json(data || []);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * GET /api/decisions/:id/timeline
   * Get comprehensive change timeline (all history types combined)
   */
  async getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const db = getAdminDatabase();
      
      // Verify ownership
      const repository = new DecisionRepository(db);
      const decision = await repository.findById(req.params.id);
      if ((decision as any).organizationId !== organizationId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const { data, error } = await db.rpc('get_decision_change_timeline', {
        p_decision_id: req.params.id
      });

      if (error) throw error;
      return res.json(data || []);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * POST /api/decisions/batch-evaluate
   * Batch evaluate multiple decisions
   * 
   * Request body:
   * - decisionIds: string[] (optional) - Specific decision IDs to evaluate
   * - force: boolean (optional) - Force evaluation even if not needed
   * 
   * If decisionIds not provided, evaluates all decisions  that need it for the org
   */
  async batchEvaluate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user?.organizationId;
      if (!organizationId) {
        return res.status(401).json({ error: 'Organization ID required' });
      }

      const { decisionIds, force } = req.body;

      let idsToEvaluate: string[];

      if (decisionIds && Array.isArray(decisionIds)) {
        // Evaluate specific decisions
        idsToEvaluate = decisionIds;
      } else {
        // Get all decisions needing evaluation for this org
        const needsEval = await EvaluationService.getDecisionsNeedingEvaluation(
          organizationId,
          24, // stale after 24 hours
          100 // max 100 at once
        );
        idsToEvaluate = needsEval.map(d => d.decisionId);
      }

      if (idsToEvaluate.length === 0) {
        return res.json({
          evaluated: 0,
          skipped: 0,
          failed: 0,
          message: 'No decisions need evaluation'
        });
      }

      logger.info(`Batch evaluating ${idsToEvaluate.length} decision(s)`, {
        organizationId,
        force: force || false
      });

      // Run batch evaluation
      const result = await EvaluationService.evaluateBatch(idsToEvaluate, force);

      return res.json({
        ...result,
        total: idsToEvaluate.length
      });
    } catch (error) {
      logger.error('Batch evaluation failed', { error });
      return next(error);
    }
  }
}
