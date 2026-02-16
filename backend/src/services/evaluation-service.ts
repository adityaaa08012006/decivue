/**
 * Evaluation Service
 * Smart evaluation logic that only re-evaluates when needed
 * 
 * Philosophy: The evaluation engine is deterministic (same inputs → same outputs).
 * Re-evaluating without input changes is wasted computation and can cause
 * unexpected auto-retirement.
 * 
 * This service tracks when evaluations are needed and prevents unnecessary work.
 */

import { getAdminDatabase } from '@data/database';
import { DeterministicEngine } from '@engine/index';
import { EvaluationInput, EvaluationOutput } from '@engine/types';
import { logger } from '@utils/logger';
import { getCurrentTime } from '@api/routes/time-simulation';

export interface EvaluationCheckResult {
  needsEvaluation: boolean;
  reason?: string;
  lastEvaluatedAt?: Date;
  hoursSinceEval?: number;
}

export class EvaluationService {
  private static engine = new DeterministicEngine();

  /**
   * Check if a decision needs re-evaluation
   * 
   * A decision needs evaluation if:
   * - needs_evaluation flag is explicitly set (by event handlers)
   * - Never been evaluated before
   * - More than 24 hours since last evaluation (for time decay)
   * - Within ±30 days of expiry date (check daily for auto-retirement)
   */
  static async needsEvaluation(
    decisionId: string,
    staleHours: number = 24
  ): Promise<EvaluationCheckResult> {
    const db = getAdminDatabase();

    const { data: decision, error } = await db
      .from('decisions')
      .select('needs_evaluation, last_evaluated_at, expiry_date, lifecycle')
      .eq('id', decisionId)
      .single();

    if (error || !decision) {
      return { needsEvaluation: false, reason: 'decision_not_found' };
    }

    // Terminal state - no need to evaluate
    if (decision.lifecycle === 'RETIRED') {
      return { needsEvaluation: false, reason: 'terminal_state' };
    }

    // Explicit flag set by event handlers
    if (decision.needs_evaluation) {
      return { 
        needsEvaluation: true, 
        reason: 'explicit_flag',
        lastEvaluatedAt: decision.last_evaluated_at
      };
    }

    // Never evaluated
    if (!decision.last_evaluated_at) {
      return { needsEvaluation: true, reason: 'never_evaluated' };
    }

    const lastEvaluatedAt = new Date(decision.last_evaluated_at);
    const hoursSinceEval = 
      (getCurrentTime().getTime() - lastEvaluatedAt.getTime()) / (1000 * 60 * 60);

    // Stale evaluation (time decay accumulates)
    if (hoursSinceEval > staleHours) {
      return { 
        needsEvaluation: true, 
        reason: 'stale',
        lastEvaluatedAt,
        hoursSinceEval: Math.round(hoursSinceEval)
      };
    }

    // Check expiry window (±30 days)
    if (decision.expiry_date) {
      const expiryDate = new Date(decision.expiry_date);
      const daysUntilExpiry = 
        (expiryDate.getTime() - getCurrentTime().getTime()) / (1000 * 60 * 60 * 24);
      
      // In critical expiry window - evaluate daily
      if (daysUntilExpiry >= -30 && daysUntilExpiry <= 30 && hoursSinceEval > 24) {
        return { 
          needsEvaluation: true, 
          reason: 'expiry_window',
          lastEvaluatedAt,
          hoursSinceEval: Math.round(hoursSinceEval)
        };
      }
    }

    // No need to evaluate
    return { 
      needsEvaluation: false, 
      reason: 'fresh',
      lastEvaluatedAt,
      hoursSinceEval: Math.round(hoursSinceEval)
    };
  }

  /**
   * Mark decisions for re-evaluation
   * Called by event handlers when evaluation inputs change
   */
  static async markForEvaluation(
    decisionIds: string[],
    reason?: string
  ): Promise<number> {
    if (decisionIds.length === 0) {
      return 0;
    }

    const db = getAdminDatabase();

    const { error, count } = await db
      .from('decisions')
      .update({ needs_evaluation: true })
      .in('id', decisionIds)
      .neq('lifecycle', 'RETIRED'); // Don't mark retired decisions

    if (error) {
      logger.error('Failed to mark decisions for evaluation', { error, decisionIds });
      throw error;
    }

    logger.info(`Marked ${count || 0} decision(s) for re-evaluation`, {
      decisionCount: count || 0,
      reason: reason || 'manual',
      decisionIds: decisionIds.slice(0, 5) // Log first 5 IDs
    });

    return count || 0;
  }

  /**
   * Evaluate a decision only if needed
   * Returns null if evaluation was skipped
   */
  static async evaluateIfNeeded(
    decisionId: string,
    force: boolean = false
  ): Promise<EvaluationOutput | null> {
    // Check if evaluation is needed
    if (!force) {
      const check = await this.needsEvaluation(decisionId);
      if (!check.needsEvaluation) {
        logger.debug(`Skipping evaluation for decision ${decisionId}`, {
          reason: check.reason,
          hoursSinceEval: check.hoursSinceEval
        });
        return null;
      }

      logger.info(`Evaluating decision ${decisionId}`, {
        reason: check.reason,
        hoursSinceEval: check.hoursSinceEval
      });
    }

    // Proceed with evaluation (fetch full context and run engine)
    const db = getAdminDatabase();

    // Fetch decision
    const { data: decision, error: decisionError } = await db
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .single();

    if (decisionError || !decision) {
      logger.error(`Decision not found: ${decisionId}`);
      throw new Error('Decision not found');
    }

    // Fetch assumptions
    const { data: decisionAssumptions } = await db
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

    const assumptions = (decisionAssumptions || [])
      .map((da: any) => da.assumptions)
      .filter(Boolean);

    // Fetch universal assumptions (if not already included)
    const { data: universalAssumptions } = await db
      .from('assumptions')
      .select('*')
      .eq('scope', 'UNIVERSAL')
      .eq('organization_id', decision.organization_id);

    const allAssumptions = [
      ...assumptions,
      ...(universalAssumptions || [])
    ];

    // Remove duplicates
    const uniqueAssumptions = Array.from(
      new Map(allAssumptions.map(a => [a.id, a])).values()
    );

    // Fetch constraints
    const { data: constraintRelations } = await db
      .from('decision_constraints')
      .select(`
        constraint_id,
        constraints (*)
      `)
      .eq('decision_id', decisionId);

    const constraints = (constraintRelations || [])
      .map((dc: any) => dc.constraints)
      .filter(Boolean);

    // Fetch dependencies
    const { data: dependencyRelations } = await db
      .from('dependencies')
      .select('*')
      .eq('source_decision_id', decisionId);

    const dependencyIds = (dependencyRelations || [])
      .map((d: any) => d.target_decision_id);

    let dependencyDecisions: any[] = [];
    if (dependencyIds.length > 0) {
      const { data: depDecisions } = await db
        .from('decisions')
        .select('*')
        .in('id', dependencyIds);
      dependencyDecisions = depDecisions || [];
    }

    // Build evaluation input
    const evaluationInput: EvaluationInput = {
      decision: {
        id: decision.id,
        title: decision.title,
        description: decision.description,
        lifecycle: decision.lifecycle,
        healthSignal: decision.health_signal,
        lastReviewedAt: decision.last_reviewed_at 
          ? new Date(decision.last_reviewed_at) 
          : new Date(decision.created_at),
        createdAt: new Date(decision.created_at),
        expiryDate: decision.expiry_date ? new Date(decision.expiry_date) : undefined,
        metadata: decision.metadata || {}
      },
      assumptions: uniqueAssumptions.map((a: any) => ({
        id: a.id,
        description: a.description,
        status: a.status,
        scope: a.scope || 'DECISION_SPECIFIC',
        isUniversal: a.scope === 'UNIVERSAL',
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
      dependencies: dependencyDecisions.map((d: any) => ({
        id: d.id,
        title: d.title,
        description: d.description,
        lifecycle: d.lifecycle,
        healthSignal: d.health_signal,
        lastReviewedAt: d.last_reviewed_at 
          ? new Date(d.last_reviewed_at) 
          : new Date(d.created_at),
        createdAt: new Date(d.created_at),
        expiryDate: d.expiry_date ? new Date(d.expiry_date) : undefined,
        metadata: d.metadata || {}
      })),
      currentTimestamp: getCurrentTime()
    };

    // Run evaluation engine
    const result = this.engine.evaluate(evaluationInput);

    // Update decision with results AND clear evaluation flag
    const { error: updateError } = await db
      .from('decisions')
      .update({
        health_signal: result.newHealthSignal,
        lifecycle: result.newLifecycle,
        invalidated_reason: result.invalidatedReason || null,
        last_evaluated_at: getCurrentTime().toISOString(),
        needs_evaluation: false // ✅ Clear the flag
      })
      .eq('id', decisionId);

    if (updateError) {
      logger.error(`Failed to update decision after evaluation`, { 
        decisionId, 
        error: updateError 
      });
      throw updateError;
    }

    logger.info(`Decision ${decisionId} evaluated successfully`, {
      oldHealth: decision.health_signal,
      newHealth: result.newHealthSignal,
      oldLifecycle: decision.lifecycle,
      newLifecycle: result.newLifecycle,
      changesDetected: result.changesDetected
    });

    return result;
  }

  /**
   * Batch evaluation for multiple decisions
   * Only evaluates those that need it
   */
  static async evaluateBatch(
    decisionIds: string[],
    force: boolean = false
  ): Promise<{
    evaluated: number;
    skipped: number;
    failed: number;
    results: Array<{ decisionId: string; result: EvaluationOutput | null; error?: string }>;
  }> {
    const results: Array<{ decisionId: string; result: EvaluationOutput | null; error?: string }> = [];
    let evaluated = 0;
    let skipped = 0;
    let failed = 0;

    for (const decisionId of decisionIds) {
      try {
        const result = await this.evaluateIfNeeded(decisionId, force);
        
        if (result === null) {
          skipped++;
          results.push({ decisionId, result: null });
        } else {
          evaluated++;
          results.push({ decisionId, result });
        }
      } catch (error) {
        failed++;
        results.push({ 
          decisionId, 
          result: null, 
          error: error instanceof Error ? error.message : String(error)
        });
        logger.error(`Failed to evaluate decision ${decisionId}`, { error });
      }
    }

    logger.info(`Batch evaluation completed`, {
      total: decisionIds.length,
      evaluated,
      skipped,
      failed
    });

    return { evaluated, skipped, failed, results };
  }

  /**
   * Get all decisions needing evaluation for an organization
   */
  static async getDecisionsNeedingEvaluation(
    organizationId: string,
    staleHours: number = 24,
    limit: number = 100
  ): Promise<Array<{ decisionId: string; reason: string }>> {
    const db = getAdminDatabase();

    const { data, error } = await db
      .rpc('get_decisions_needing_evaluation', {
        p_organization_id: organizationId,
        p_stale_hours: staleHours,
        p_limit: limit
      });

    if (error) {
      logger.error('Failed to get decisions needing evaluation', { error, organizationId });
      return [];
    }

    return (data || []).map((row: any) => ({
      decisionId: row.decision_id,
      reason: row.reason
    }));
  }
}
