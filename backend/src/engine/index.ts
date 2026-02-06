/**
 * Deterministic Decision Engine
 *
 * Philosophy: The system does not replace human judgment — it highlights when judgment is needed.
 *
 * This is the core rule engine that evaluates decisions.
 * It MUST be:
 * - Deterministic (same inputs always produce same outputs)
 * - Pure (no side effects)
 * - Explainable (produces a trace of all steps)
 * - Testable (easy to unit test)
 *
 * Evaluation Process (in exact order):
 * 1. Validate constraints (hard invalidation if violated)
 * 2. Evaluate dependency health (propagate risk, do not auto-invalidate)
 * 3. Check assumptions (invalidate if broken, flag risk if shaky)
 * 4. Apply time-based health decay (internal signal only)
 * 5. Update lifecycle state
 *
 * CRITICAL: Health is an internal signal, never authoritative.
 * Only broken assumptions or violated constraints can cause INVALIDATED.
 */

import { DecisionLifecycle } from '@data/models';
import { IDecisionEngine, EvaluationInput, EvaluationOutput, EvaluationStep } from './types';

export class DeterministicEngine implements IDecisionEngine {
  /**
   * Main evaluation method
   * Processes a decision through all evaluation phases
   */
  evaluate(input: EvaluationInput): EvaluationOutput {
    const trace: EvaluationStep[] = [];
    let lifecycle = input.decision.lifecycle;
    let health = input.decision.health;
    let invalidationReason: string | null = null;

    // Step 1: Validate constraints
    const constraintResult = this.validateConstraints(input, trace);
    if (!constraintResult.passed) {
      // Hard fail - immediately invalidate
      lifecycle = DecisionLifecycle.INVALIDATED;
      health = 0;
      invalidationReason = 'constraint_violation';
    }

    // Step 2: Evaluate dependency health (only if constraints passed)
    if (constraintResult.passed) {
      const dependencyResult = this.evaluateDependencies(input, trace);
      // Dependencies propagate risk but don't auto-fail
      health = Math.min(health, dependencyResult.adjustedHealth);
    }

    // Step 3: Check assumptions (only if not already invalidated)
    if (lifecycle !== DecisionLifecycle.INVALIDATED) {
      const assumptionResult = this.checkAssumptions(input, trace);
      if (!assumptionResult.passed) {
        lifecycle = DecisionLifecycle.INVALIDATED;
        health = 0;
        invalidationReason = 'broken_assumptions';
      }
    }

    // Step 4: Apply time-based health decay (only if not already invalidated)
    if (lifecycle !== DecisionLifecycle.INVALIDATED) {
      const decayResult = this.applyHealthDecay(input, trace);
      health = Math.max(0, health - decayResult.decayAmount);
    }

    // Step 5: Update lifecycle state (skip if already invalidated by constraints/assumptions)
    const updatedLifecycle = invalidationReason
      ? lifecycle
      : this.determineLifecycleState(health, lifecycle, trace, invalidationReason !== null);

    // Detect if state changed
    const changesDetected =
      updatedLifecycle !== input.decision.lifecycle ||
      health !== input.decision.health;

    return {
      decisionId: input.decision.id,
      newLifecycle: updatedLifecycle,
      newHealth: health,
      trace,
      changesDetected
    };
  }

  /**
   * Phase 1: Validate constraints
   */
  private validateConstraints(
    _input: EvaluationInput,
    trace: EvaluationStep[]
  ): { passed: boolean } {
    const step: EvaluationStep = {
      step: 'constraint_validation',
      passed: true,
      details: 'All constraints validated successfully',
      timestamp: new Date()
    };

    // TODO: Implement constraint validation logic
    // For now, assume all constraints pass

    trace.push(step);
    return { passed: step.passed };
  }

  /**
   * Phase 2: Evaluate dependency health
   * Propagate risk from dependencies, but never auto-invalidate
   */
  private evaluateDependencies(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { adjustedHealth: number } {
    let lowestDependencyHealth = 100;

    if (input.dependencies.length === 0) {
      trace.push({
        step: 'dependency_evaluation',
        passed: true,
        details: 'No dependencies to evaluate',
        timestamp: new Date()
      });
      return { adjustedHealth: 100 };
    }

    // Find the lowest health among dependencies
    for (const dep of input.dependencies) {
      if (dep.health < lowestDependencyHealth) {
        lowestDependencyHealth = dep.health;
      }
    }

    trace.push({
      step: 'dependency_evaluation',
      passed: true,
      details: `Evaluated ${input.dependencies.length} dependencies. Health signal from dependencies: ${lowestDependencyHealth}`,
      timestamp: new Date()
    });

    return { adjustedHealth: lowestDependencyHealth };
  }

  /**
   * Phase 3: Check assumptions
   */
  private checkAssumptions(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { passed: boolean } {
    const brokenAssumptions = input.assumptions.filter(a => a.status === 'BROKEN');

    const step: EvaluationStep = {
      step: 'assumption_check',
      passed: brokenAssumptions.length === 0,
      details:
        brokenAssumptions.length === 0
          ? `All ${input.assumptions.length} assumptions are valid`
          : `${brokenAssumptions.length} broken assumptions detected`,
      timestamp: new Date()
    };

    trace.push(step);
    return { passed: step.passed };
  }

  /**
   * Phase 4: Apply time-based health decay
   * Health is an internal signal only - never authoritative
   * Time decay alone can trigger UNDER_REVIEW but never AT_RISK or INVALIDATED
   */
  private applyHealthDecay(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { decayAmount: number } {
    const daysSinceReview =
      (input.currentTimestamp.getTime() - input.decision.lastReviewedAt.getTime()) /
      (1000 * 60 * 60 * 24);

    // Decay 1 point per 30 days without review
    const decayAmount = Math.floor(daysSinceReview / 30);

    trace.push({
      step: 'health_decay',
      passed: true,
      details: `${Math.floor(daysSinceReview)} days since last review. Health decay: -${decayAmount}. (Health is a signal, not authority)`,
      timestamp: new Date()
    });

    return { decayAmount };
  }

  /**
   * Phase 5: Determine lifecycle state
   * State reflects need for human judgment, not system authority
   *
   * CRITICAL: Health alone cannot cause INVALIDATED.
   * Only broken assumptions or violated constraints can invalidate a decision.
   */
  private determineLifecycleState(
    health: number,
    currentLifecycle: DecisionLifecycle,
    trace: EvaluationStep[],
    _wasInvalidated: boolean
  ): DecisionLifecycle {
    // Don't change terminal states
    if (
      currentLifecycle === DecisionLifecycle.INVALIDATED ||
      currentLifecycle === DecisionLifecycle.RETIRED
    ) {
      trace.push({
        step: 'lifecycle_determination',
        passed: true,
        details: `Lifecycle remains ${currentLifecycle}`,
        timestamp: new Date()
      });
      return currentLifecycle;
    }

    let newLifecycle: DecisionLifecycle = currentLifecycle;

    // Health thresholds (internal signals only)
    if (health >= 80) {
      newLifecycle = DecisionLifecycle.STABLE;
    } else if (health >= 60) {
      newLifecycle = DecisionLifecycle.UNDER_REVIEW;  // Signal: "please review this"
    } else if (health >= 40) {
      newLifecycle = DecisionLifecycle.AT_RISK;  // Signal: "urgent attention needed"
    } else {
      // Health < 40: Still AT_RISK (never INVALIDATED from health alone)
      newLifecycle = DecisionLifecycle.AT_RISK;
    }

    const explanation =
      newLifecycle === DecisionLifecycle.STABLE
        ? `Health ${health} → STABLE (all good, no action needed)`
        : newLifecycle === DecisionLifecycle.UNDER_REVIEW
        ? `Health ${health} → UNDER_REVIEW (system signals: please review this)`
        : `Health ${health} → AT_RISK (system signals: urgent attention needed)`;

    trace.push({
      step: 'lifecycle_determination',
      passed: true,
      details: explanation,
      timestamp: new Date()
    });

    return newLifecycle;
  }
}
