/**
 * Decision Controller
 * Handles HTTP requests for decision operations
 */

import { Request, Response, NextFunction } from 'express';
import { DecisionRepository } from '@data/repositories/decision-repository';
import { getDatabase } from '@data/database';
import { DeterministicEngine } from '@engine/index';
import { eventBus } from '@events/event-bus';
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
}
