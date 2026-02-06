/**
 * Re-evaluation Handler
 * Handles events that trigger re-evaluation of decisions
 */

import { eventBus } from '../event-bus';
import { EventType, DomainEvent, AssumptionUpdatedEvent, DependencyChangedEvent } from '../event-types';
import { logger } from '@utils/logger';

/**
 * Registers handlers that trigger re-evaluation
 * when assumptions or dependencies change
 */
export function registerReEvaluationHandlers(): void {
  // When an assumption is updated, re-evaluate the decision
  eventBus.on(EventType.ASSUMPTION_UPDATED, async (event: DomainEvent) => {
    const assumptionEvent = event as AssumptionUpdatedEvent;
    logger.info(`Assumption updated - triggering re-evaluation`, {
      assumptionId: assumptionEvent.assumptionId,
      decisionId: assumptionEvent.decisionId
    });

    // TODO: Trigger decision evaluation
    // This will be implemented when we connect the API layer
  });

  // When a dependency changes, re-evaluate dependent decisions
  eventBus.on(EventType.DEPENDENCY_CHANGED, async (event: DomainEvent) => {
    const depEvent = event as DependencyChangedEvent;
    logger.info(`Dependency changed - triggering re-evaluation`, {
      sourceDecisionId: depEvent.sourceDecisionId,
      targetDecisionId: depEvent.targetDecisionId
    });

    // TODO: Find all decisions that depend on the changed decision
    // and trigger their re-evaluation
  });

  logger.info('Re-evaluation handlers registered');
}
