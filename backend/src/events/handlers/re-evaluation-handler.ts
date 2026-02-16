/**
 * Re-evaluation Handler
 * Handles events that trigger re-evaluation of decisions
 * 
 * Instead of immediately evaluating decisions (expensive), this handler
 * marks them with needs_evaluation=true flag. The actual evaluation
 * happens lazily when the decision is accessed or via scheduled batch job.
 */

import { eventBus } from '../event-bus';
import { EventType, DomainEvent, AssumptionUpdatedEvent, DependencyChangedEvent } from '../event-types';
import { logger } from '@utils/logger';
import { EvaluationService } from '@services/evaluation-service';
import { getAdminDatabase } from '@data/database';

/**
 * Registers handlers that trigger re-evaluation
 * when assumptions or dependencies change
 */
export function registerReEvaluationHandlers(): void {
  // When an assumption is updated, mark all linked decisions for re-evaluation
  eventBus.on(EventType.ASSUMPTION_UPDATED, async (event: DomainEvent) => {
    try {
      const assumptionEvent = event as AssumptionUpdatedEvent;
      logger.info(`Assumption updated - marking linked decisions for re-evaluation`, {
        assumptionId: assumptionEvent.assumptionId
      });

      const db = getAdminDatabase();

      // Find all decisions using this assumption
      const { data: links, error } = await db
        .from('decision_assumptions')
        .select('decision_id')
        .eq('assumption_id', assumptionEvent.assumptionId);

      if (error) {
        logger.error('Failed to find linked decisions', { error, assumptionId: assumptionEvent.assumptionId });
        return;
      }

      if (!links || links.length === 0) {
        logger.info('No decisions linked to assumption', { assumptionId: assumptionEvent.assumptionId });
        return;
      }

      const decisionIds = links.map((link: any) => link.decision_id);

      // Mark them for re-evaluation
      const count = await EvaluationService.markForEvaluation(
        decisionIds,
        'assumption_updated'
      );

      logger.info(`Marked ${count} decision(s) for re-evaluation due to assumption update`, {
        assumptionId: assumptionEvent.assumptionId,
        decisionCount: count
      });
    } catch (error) {
      logger.error('Error handling assumption update event', { error });
    }
  });

  // When a dependency changes, mark dependent decisions for re-evaluation
  eventBus.on(EventType.DEPENDENCY_CHANGED, async (event: DomainEvent) => {
    try {
      const depEvent = event as DependencyChangedEvent;
      logger.info(`Dependency changed - marking dependent decisions for re-evaluation`, {
        sourceDecisionId: depEvent.sourceDecisionId,
        targetDecisionId: depEvent.targetDecisionId
      });

      const db = getAdminDatabase();

      // Find all decisions that depend on the changed decision
      // (decisions where source_decision_id points to the target)
      const { data: dependents, error } = await db
        .from('dependencies')
        .select('source_decision_id')
        .eq('target_decision_id', depEvent.targetDecisionId);

      if (error) {
        logger.error('Failed to find dependent decisions', { error, targetDecisionId: depEvent.targetDecisionId });
        return;
      }

      if (!dependents || dependents.length === 0) {
        logger.info('No decisions depend on this decision', { targetDecisionId: depEvent.targetDecisionId });
        return;
      }

      const decisionIds = dependents.map((dep: any) => dep.source_decision_id);

      // Mark them for re-evaluation
      const count = await EvaluationService.markForEvaluation(
        decisionIds,
        'dependency_changed'
      );

      logger.info(`Marked ${count} dependent decision(s) for re-evaluation`, {
        targetDecisionId: depEvent.targetDecisionId,
        dependentCount: count
      });
    } catch (error) {
      logger.error('Error handling dependency change event', { error });
    }
  });

  // When a decision is evaluated and its health/lifecycle changes,
  // mark dependent decisions for re-evaluation
  eventBus.on(EventType.DECISION_EVALUATED, async (event: DomainEvent) => {
    try {
      const evalEvent = event as any;
      
      // Only propagate if there were actual changes
      if (!evalEvent.evaluationResult?.changesDetected) {
        return;
      }

      logger.info(`Decision evaluated with changes - checking dependents`, {
        decisionId: evalEvent.decisionId
      });

      const db = getAdminDatabase();

      // Find decisions that depend on this one
      const { data: dependents, error } = await db
        .from('dependencies')
        .select('source_decision_id')
        .eq('target_decision_id', evalEvent.decisionId);

      if (error || !dependents || dependents.length === 0) {
        return;
      }

      const decisionIds = dependents.map((dep: any) => dep.source_decision_id);

      // Mark them for re-evaluation
      const count = await EvaluationService.markForEvaluation(
        decisionIds,
        'dependency_health_changed'
      );

      logger.info(`Marked ${count} dependent(s) for re-evaluation after evaluation`, {
        parentDecisionId: evalEvent.decisionId,
        dependentCount: count
      });
    } catch (error) {
      logger.error('Error handling decision evaluated event', { error });
    }
  });

  logger.info('Re-evaluation handlers registered (smart mode)');
}
