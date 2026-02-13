/**
 * Decision Controller
 * Handles HTTP requests for decision operations
 */

import { Request, Response, NextFunction } from 'express';
import { DecisionRepository } from '@data/repositories/decision-repository';
import { getDatabase } from '@data/database';
import { DeterministicEngine } from '@engine/index';
import { eventBus } from '@events/event-bus';
import { getCurrentTime } from '@api/routes/time-simulation';
import { EventType } from '@events/event-types';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@utils/logger';

export class DecisionController {
  private _repository?: DecisionRepository;
  // @ts-expect-error - Engine will be used for evaluation endpoint
  private engine: DeterministicEngine;

  constructor() {
    this.engine = new DeterministicEngine();
  }

  /**
   * Lazy-load repository to avoid initialization order issues
   */
  private get repository(): DecisionRepository {
    if (!this._repository) {
      this._repository = new DecisionRepository(getDatabase());
    }
    return this._repository;
  }

  /**
   * GET /api/decisions
   * Get all decisions
   */
  async getAll(_req: Request, res: Response, next: NextFunction) {
    try {
      const decisions = await this.repository.findAll();
      res.json(decisions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/decisions/:id
   * Get a single decision by ID
   */
  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const decision = await this.repository.findById(req.params.id);
      res.json(decision);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/decisions
   * Create a new decision
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const decision = await this.repository.create(req.body);

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
   * Update a decision
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const decision = await this.repository.update(req.params.id, req.body);

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.DECISION_UPDATED,
        timestamp: new Date(),
        decisionId: decision.id,
        changes: req.body
      });

      logger.info(`Decision updated: ${decision.id}`);
      res.json(decision);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/decisions/:id
   * Delete a decision
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await this.repository.delete(req.params.id);
      logger.info(`Decision deleted: ${req.params.id}`);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/decisions/:id/retire
   * Retire a decision (mark as deprecated/final)
   */
  async retire(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const db = getDatabase();

      // Update decision to RETIRED lifecycle
      const { data: decision, error } = await db
        .from('decisions')
        .update({
          lifecycle: 'RETIRED',
          invalidated_reason: reason || 'manually_retired',
          health_signal: 0
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!decision) {
        return res.status(404).json({ error: 'Decision not found' });
      }

      // Emit event
      await eventBus.emit({
        id: uuidv4(),
        type: EventType.LIFECYCLE_CHANGED,
        timestamp: getCurrentTime(),
        decisionId: id,
        oldLifecycle: decision.lifecycle,
        newLifecycle: 'RETIRED'
      });

      logger.info(`Decision retired: ${id}`);
      return res.json(decision);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/decisions/:id/evaluate
   * Trigger manual evaluation of a decision
   */
  async evaluate(req: Request, res: Response, next: NextFunction) {
    try {
      const decisionId = req.params.id;
      const db = getDatabase();

      logger.info(`🔄 Starting evaluation for decision: ${decisionId}`);

      // Fetch decision
      const { data: decision, error: decisionError } = await db
        .from('decisions')
        .select('*')
        .eq('id', decisionId)
        .single();

      if (decisionError || !decision) {
        logger.error(`Decision not found: ${decisionId}`);
        return res.status(404).json({ error: 'Decision not found' });
      }

      logger.info(`Found decision: ${decision.title}`);

      // Fetch assumptions linked to this decision
      const { data: decisionAssumptions } = await db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          assumptions (
            id,
            description,
            status,
            scope,
            created_at,
            validated_at,
            metadata
          )
        `)
        .eq('decision_id', decisionId);

      const assumptions = (decisionAssumptions || [])
        .map((da: any) => da.assumptions)
        .filter(Boolean)
        .map((a: any) => ({
          ...a,
          scope: a.scope || 'DECISION_SPECIFIC', // Default to decision-specific if not set
          isUniversal: false
        }));

      // Fetch universal assumptions (they apply to all decisions)
      const { data: universalAssumptions } = await db
        .from('assumptions')
        .select('*')
        .eq('scope', 'UNIVERSAL');

      const universalWithFlag = (universalAssumptions || []).map(a => ({
        ...a,
        isUniversal: true
      }));

      const allAssumptions = [...assumptions, ...universalWithFlag];

      // Fetch constraints
      const { data: decisionConstraints } = await db
        .from('decision_constraints')
        .select(`
          constraint_id,
          constraints (
            id,
            name,
            description,
            constraint_type,
            rule_expression,
            is_immutable,
            created_at
          )
        `)
        .eq('decision_id', decisionId);

      const constraints = (decisionConstraints || [])
        .map((dc: any) => dc.constraints)
        .filter(Boolean);

      logger.info(`📋 Evaluation context:`);
      logger.info(`   - Decision-specific assumptions: ${assumptions.length}`);
      logger.info(`   - Universal assumptions: ${(universalAssumptions || []).length}`);
      logger.info(`   - Total assumptions: ${allAssumptions.length}`);
      logger.info(`   - Broken assumptions: ${allAssumptions.filter(a => a.status === 'BROKEN').length}`);
      logger.info(`   - VALID assumptions: ${allAssumptions.filter(a => a.status === 'VALID').length}`);
      logger.info(`   - SHAKY assumptions: ${allAssumptions.filter(a => a.status === 'SHAKY').length}`);
      allAssumptions.forEach(a => {
        logger.info(`     → ${a.scope || 'DECISION_SPECIFIC'}: ${a.status} - ${a.description.substring(0, 50)}...`);
      });
      logger.info(`   - Constraints: ${constraints.length}`);

      // Fetch dependencies
      const { data: dependencies } = await db
        .from('dependencies')
        .select('*')
        .or(`source_decision_id.eq.${decisionId},target_decision_id.eq.${decisionId}`);

      // Build evaluation input
      const evaluationInput = {
        decision: {
          id: decision.id,
          title: decision.title,
          description: decision.description,
          lifecycle: decision.lifecycle,
          healthSignal: decision.health_signal,
          lastReviewedAt: decision.last_reviewed_at ? new Date(decision.last_reviewed_at) : undefined,
          createdAt: new Date(decision.created_at),
          expiryDate: decision.expiry_date ? new Date(decision.expiry_date) : undefined,
          metadata: decision.metadata || {}
        },
        assumptions: allAssumptions.map((a: any) => ({
          id: a.id,
          description: a.description,
          status: a.status,
          scope: a.scope || 'DECISION_SPECIFIC',
          isUniversal: a.isUniversal || false,
          createdAt: a.created_at ? new Date(a.created_at) : new Date(),
          validatedAt: a.validated_at ? new Date(a.validated_at) : undefined,
          metadata: a.metadata || {}
        })),
        constraints: constraints.map((c: any) => ({
          id: c.id,
          name: c.name || c.constraint_name || '',
          description: c.description || '',
          constraintType: c.constraint_type || 'OTHER',
          ruleExpression: c.rule_expression || c.rule_definition,
          isImmutable: c.is_immutable !== false,
          createdAt: c.created_at ? new Date(c.created_at) : new Date(),
          constraint_name: c.name || c.constraint_name,
          constraint_type: c.constraint_type,
          rule_definition: c.rule_expression || c.rule_definition,
          scope: c.scope
        })),
        dependencies: (dependencies || []).map((d: any) => ({
          id: d.id,
          sourceDecisionId: d.source_decision_id,
          targetDecisionId: d.target_decision_id,
          dependencyType: d.dependency_type,
          description: d.description,
          isBlocking: d.is_blocking,
          createdAt: d.created_at ? new Date(d.created_at) : new Date()
        })),
        currentTimestamp: getCurrentTime()
      };

      // Run evaluation engine
      const result = this.engine.evaluate(evaluationInput);

      logger.info(`📊 Evaluation result:`);
      logger.info(`   - Old health: ${decision.health_signal}`);
      logger.info(`   - New health: ${result.newHealthSignal}`);
      logger.info(`   - Health change: ${result.newHealthSignal - decision.health_signal}`);
      logger.info(`   - Old lifecycle: ${decision.lifecycle}`);
      logger.info(`   - New lifecycle: ${result.newLifecycle}`);
      logger.info(`   - Invalidated reason: ${result.invalidatedReason || 'none'}`);
      logger.info(`   - Changes detected: ${result.changesDetected}`);

      // Update decision with new health and lifecycle
      const { error: updateError } = await db
        .from('decisions')
        .update({
          health_signal: result.newHealthSignal,
          lifecycle: result.newLifecycle,
          invalidated_reason: result.invalidatedReason || null
        })
        .eq('id', decisionId);

      if (updateError) {
        logger.error(`Failed to update decision after evaluation: ${updateError.message}`);
        return res.status(500).json({ error: 'Failed to update decision' });
      }

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
        oldHealth: decision.health_signal,
        newHealth: result.newHealthSignal,
        healthChange: result.newHealthSignal - decision.health_signal
      });

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
   */
  async markReviewed(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const db = getDatabase();

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
}
