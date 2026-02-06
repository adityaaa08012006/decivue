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
          healthSignal: 100
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.STABLE);
      expect(result.newHealthSignal).toBeGreaterThanOrEqual(80);
      expect(result.invalidatedReason).toBeUndefined();
      expect(result.trace).toHaveLength(5); // 5 evaluation steps
    });

    it('should invalidate decision when assumption is broken', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 100
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
      expect(result.newHealthSignal).toBe(0);
      expect(result.invalidatedReason).toBe('broken_assumptions');
      expect(result.changesDetected).toBe(true);
    });

    it('should propagate risk from dependencies but not invalidate', () => {
      const lowHealthDependency = createTestDecision({
        healthSignal: 30
      });

      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 100
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [lowHealthDependency],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      // healthSignal should be affected by dependency
      expect(result.newHealthSignal).toBeLessThanOrEqual(30);
      // But healthSignal alone never causes INVALIDATED - should be AT_RISK
      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
      expect(result.invalidatedReason).toBeUndefined();
    });

    it('should apply time-based health decay and trigger UNDER_REVIEW', () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 100,
          lastReviewedAt: thirtyDaysAgo
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newHealthSignal).toBeLessThan(100);
      expect(result.changesDetected).toBe(true);
    });

    it('should transition to UNDER_REVIEW when health drops below 80', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 70
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.UNDER_REVIEW);
      expect(result.newHealthSignal).toBe(70);
    });

    it('should transition to AT_RISK when health drops below 60', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 50
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
      expect(result.newHealthSignal).toBe(50);
    });

    it('should remain AT_RISK even when health drops below 40 (healthSignal alone never invalidates)', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 20
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date()
      };

      const result = engine.evaluate(input);

      // healthSignal is low but assumptions are holding - should be AT_RISK, not INVALIDATED
      expect(result.newLifecycle).toBe(DecisionLifecycle.AT_RISK);
      expect(result.newHealthSignal).toBe(20);
      expect(result.invalidatedReason).toBeUndefined();
    });

    it('should be deterministic - same input produces same output', () => {
      const input: EvaluationInput = {
        decision: createTestDecision({
          lifecycle: DecisionLifecycle.STABLE,
          healthSignal: 80
        }),
        assumptions: [
          createTestAssumption({ status: AssumptionStatus.HOLDING })
        ],
        dependencies: [],
        constraints: [],
        currentTimestamp: new Date('2024-01-01')
      };

      const result1 = engine.evaluate(input);
      const result2 = engine.evaluate(input);

      expect(result1.newLifecycle).toBe(result2.newLifecycle);
      expect(result1.newHealthSignal).toBe(result2.newHealthSignal);
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
    healthSignal: 100,
    createdAt: new Date(),
    lastReviewedAt: new Date(),
    ...overrides
  };
}

function createTestAssumption(overrides?: Partial<Assumption>): Assumption {
  return {
    id: 'test-assumption-1',
    description: 'Test assumption',
    status: AssumptionStatus.HOLDING,
    createdAt: new Date(),
    ...overrides
  };
}
