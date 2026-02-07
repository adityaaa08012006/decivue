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
   * POST /api/decisions/:id/evaluate
   * Trigger manual evaluation of a decision
   */
  async evaluate(req: Request, res: Response, next: NextFunction) {
    try {
      const decisionId = req.params.id;

      // TODO: Fetch decision, assumptions, dependencies, and constraints
      // For now, return a placeholder

      res.json({
        message: 'Evaluation endpoint - to be implemented',
        decisionId
      });
    } catch (error) {
      next(error);
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

      // When a decision is reviewed, reset health to 100 unless there are actual problems
      // (constraints violated or assumptions broken)
      let newHealth = 100;
      let newLifecycle = 'STABLE';
      let invalidatedReason = null;

      // Only keep degraded state if there are real issues (not just time decay)
      if (result.invalidatedReason === 'constraint_violation' || result.invalidatedReason === 'broken_assumptions') {
        newHealth = result.newHealthSignal;
        newLifecycle = result.newLifecycle;
        invalidatedReason = result.invalidatedReason;
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
