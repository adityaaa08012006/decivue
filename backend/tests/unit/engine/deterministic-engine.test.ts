/**
 * Tests for Deterministic Engine
 * Validates the core decision evaluation logic
 *
 * Philosophy: The system does not replace human judgment — it highlights when judgment is needed.
 */

import { DeterministicEngine } from '../../../src/engine';
import { EvaluationInput } from '../../../src/engine/types';
import { Decision, DecisionLifecycle, Assumption, AssumptionStatus } from '../../../src/data/models';

describe('DeterministicEngine', () => {
  let engine: DeterministicEngine;

  beforeEach(() => {
    engine = new DeterministicEngine();
  });

  describe('evaluate', () => {
    it('should return stable lifecycle for healthy decision', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 100
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.STABLE);
      expect(result.newHealth).toBeGreaterThanOrEqual(80);
      expect(result.trace).toHaveLength(5); // 5 evaluation steps
    });

    it('should invalidate decision when assumption is broken', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 100
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.BROKEN })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.INVALIDATED);
      expect(result.newHealth).toBe(0);
      expect(result.changesDetected).toBe(true);
    });

    it('should propagate risk from dependencies but not invalidate', () => {
      const lowHealthDependency = createTestDecision({
        health: 30
      });

      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 100
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [lowHealthDependency],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      // Health should be affected by dependency
      expect(result.newHealth).toBeLessThanOrEqual(30);
      // But health alone never causes INVALIDATED - should be AT_RISK
      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
    });

    it('should apply time-based health decay and trigger UNDER_REVIEW', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 100,
          lastReviewedAt: thirtyDaysAgo
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newHealth).toBeLessThan(100);
      expect(result.changesDetected).toBe(true);
    });

    it('should transition to UNDER_REVIEW when health drops below 80', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 70
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.UNDER_REVIEW);
      expect(result.newHealth).toBe(70);
    });

    it('should transition to AT_RISK when health drops below 60', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 50
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
      expect(result.newHealth).toBe(50);
    });

    it('should remain AT_RISK even when health drops below 40 (health alone never invalidates)', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 20
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      // Health is low but assumptions are valid - should be AT_RISK, not INVALIDATED
      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
      expect(result.newHealth).toBe(20);
    });

    it('should be deterministic - same input produces same output', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          health: 80
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.VALID })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date('2024-01-01')
      };

      const result1 = engine.evaluate(input);
      const result2 = engine.evaluate(input);

      expect(result1.newLifecycle).toBe(result2.newLifecycle);
      expect(result1.newHealth).toBe(result2.newHealth);
      expect(result1.trace.length).toBe(result2.trace.length);
    });

    it('should produce evaluation trace with all 5 steps', () => {
      const input: EvaluationInput = {
        decision: createTestDecision(),
        assumptions: [],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.trace).toHaveLength(5);
      expect(result.trace[0].step).toBe('constraint_validation');
      expect(result.trace[1].step).toBe('dependency_evaluation');
      expect(result.trace[2].step).toBe('assumption_check');
      expect(result.trace[3].step).toBe('health_decay');
      expect(result.trace[4].step).toBe('lifecycle_determination');
    });
  });
});

// Helper functions
function createTestDecision(overrides?: Partial<Decision>): Decision {
  return {
    id: 'test-decision-1',
    title: 'Test Decision',
    description: 'A test decision',
    lifecycle: DecisionLifecycle.STABLE,
    health: 100,
    createdAt: new Date(),
    lastReviewedAt: new Date(),
    ...overrides
  };
}

function createTestAssumption(overrides?: Partial<Assumption>): Assumption {
  return {
    id: 'test-assumption-1',
    decisionId: 'test-decision-1',
    description: 'Test assumption',
    status: AssumptionStatus.VALID,
    createdAt: new Date(),
    ...overrides
  };
}
