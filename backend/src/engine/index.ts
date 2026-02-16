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
import { ConstraintValidator, DecisionContext } from '../services/constraint-validator';

export class DeterministicEngine implements IDecisionEngine {
  /**
   * Main evaluation method
   * Processes a decision through all evaluation phases
   */
  evaluate(input: EvaluationInput): EvaluationOutput {
    const trace: EvaluationStep[] = [];
    // Reset INVALIDATED lifecycle to STABLE to give it a fresh chance at recovery
    let lifecycle: DecisionLifecycle = input.decision.lifecycle === DecisionLifecycle.INVALIDATED 
      ? DecisionLifecycle.STABLE 
      : input.decision.lifecycle;
    let healthSignal = 100; // Start fresh at 100 and recalculate
    let invalidatedReason: string | undefined = undefined;

    // Step 1: Validate constraints
    const constraintResult = this.validateConstraints(input, trace);
    if (!constraintResult.passed) {
      // Hard fail - immediately invalidate
      lifecycle = DecisionLifecycle.INVALIDATED;
      healthSignal = 0;
      invalidatedReason = 'constraint_violation';
    }

    // Step 2: Evaluate dependency health (only if constraints passed)
    if (constraintResult.passed) {
      const dependencyResult = this.evaluateDependencies(input, trace);
      // Dependencies propagate risk but don't auto-fail
      healthSignal = Math.min(healthSignal, dependencyResult.adjustedHealthSignal);
    }

    // Step 3: Check assumptions (only if not already invalidated)
    if (lifecycle !== DecisionLifecycle.INVALIDATED) {
      const assumptionResult = this.checkAssumptions(input, trace);
      if (!assumptionResult.passed) {
        // Hard fail from universal assumptions or too many specific failures
        lifecycle = DecisionLifecycle.INVALIDATED;
        healthSignal = 0;
        invalidatedReason = 'broken_assumptions';
      } else {
        // Apply proportional health penalty from decision-specific assumptions
        healthSignal = Math.max(0, healthSignal - assumptionResult.healthPenalty);
      }
    }

    // Step 4: Check for expiry-based retirement (before decay)
    // If decision is significantly past expiry (30+ days), automatically retire it
    if (lifecycle !== DecisionLifecycle.INVALIDATED && 
        lifecycle !== DecisionLifecycle.RETIRED && 
        input.decision.expiryDate) {
      const daysUntilExpiry = 
        (input.decision.expiryDate.getTime() - input.currentTimestamp.getTime()) /
        (1000 * 60 * 60 * 24);
      
      if (daysUntilExpiry < -30) {
        // More than 30 days past expiry - automatically retire
        lifecycle = DecisionLifecycle.RETIRED;
        invalidatedReason = 'expired';
        const daysPastExpiry = Math.abs(daysUntilExpiry);
        trace.push({
          step: 'expiry_retirement',
          passed: false,
          details: `Decision expired ${Math.floor(daysPastExpiry)} days ago. Automatically retired.`,
          timestamp: new Date()
        });
      }
    }

    // Step 5: Apply time-based health decay (only if not already invalidated or retired)
    if (lifecycle !== DecisionLifecycle.INVALIDATED && lifecycle !== DecisionLifecycle.RETIRED) {
      const decayResult = this.applyHealthDecay(input, trace);
      healthSignal = Math.max(0, healthSignal - decayResult.decayAmount);
    }

    // Step 6: Update lifecycle state (skip if already invalidated/retired by constraints/assumptions/expiry)
    const updatedLifecycle = invalidatedReason
      ? lifecycle
      : this.determineLifecycleState(healthSignal, lifecycle, trace);

    // Detect if state changed
    const changesDetected =
      updatedLifecycle !== input.decision.lifecycle ||
      healthSignal !== input.decision.healthSignal;

    return {
      decisionId: input.decision.id,
      newLifecycle: updatedLifecycle,
      newHealthSignal: healthSignal,
      invalidatedReason,
      trace,
      changesDetected
    };
  }

  /**
   * Phase 1: Validate constraints
   */
  private validateConstraints(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { passed: boolean; violatedConstraints?: any[] } {
    const validator = new ConstraintValidator();

    // Build decision context for validation
    const context: DecisionContext = {
      id: input.decision.id,
      title: input.decision.title,
      description: input.decision.description || '',
      metadata: input.decision.metadata || {}
    };

    const violations: any[] = [];

    // Validate against each constraint
    for (const constraint of input.constraints) {
      // Constraints from DB are in snake_case, cast to ConstraintDB for validator
      const result = validator.validate(constraint as any, context);

      if (!result.passed && result.violation) {
        violations.push(result.violation);
      }
    }

    const passed = violations.length === 0;

    const step: EvaluationStep = {
      step: 'constraint_validation',
      passed,
      details: passed
        ? `All ${input.constraints.length} constraints validated successfully`
        : `${violations.length} constraint(s) violated: ${violations.map(v => v.constraintName).join(', ')}`,
      timestamp: new Date(),
      metadata: passed ? {} : { violations }
    };

    trace.push(step);
    return { passed, violatedConstraints: passed ? undefined : violations };
  }

  /**
   * Phase 2: Evaluate dependency health
   * Propagate risk from dependencies, but never auto-invalidate
   */
  private evaluateDependencies(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { adjustedHealthSignal: number } {
    let lowestDependencyHealthSignal = 100;

    if (input.dependencies.length === 0) {
      trace.push({
        step: 'dependency_evaluation',
        passed: true,
        details: 'No dependencies to evaluate',
        timestamp: new Date()
      });
      return { adjustedHealthSignal: 100 };
    }

    // Find the lowest healthSignal among dependencies
    for (const dep of input.dependencies) {
      if (dep.healthSignal < lowestDependencyHealthSignal) {
        lowestDependencyHealthSignal = dep.healthSignal;
      }
    }

    trace.push({
      step: 'dependency_evaluation',
      passed: true,
      details: `Evaluated ${input.dependencies.length} dependencies. Health signal from dependencies: ${lowestDependencyHealthSignal}`,
      timestamp: new Date()
    });

    return { adjustedHealthSignal: lowestDependencyHealthSignal };
  }

  /**
   * Phase 3: Check assumptions
   * Status represents drift: VALID (stable), SHAKY (deteriorating), BROKEN (invalidated)
   * 
   * STRATEGY:
   * - Universal assumptions: Strict - ANY broken universal assumption immediately invalidates
   * - Decision-specific assumptions: Proportional - Health reduces proportionally to broken count
   */
  private checkAssumptions(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { passed: boolean; healthPenalty: number } {
    // Separate universal and decision-specific assumptions
    const universalAssumptions = input.assumptions.filter(a => 
      (a as any).scope === 'UNIVERSAL' || (a as any).isUniversal
    );
    const decisionSpecificAssumptions = input.assumptions.filter(a => 
      (a as any).scope === 'DECISION_SPECIFIC' || !(a as any).scope && !(a as any).isUniversal
    );

    const brokenUniversal = universalAssumptions.filter(a => a.status === 'BROKEN');
    const brokenSpecific = decisionSpecificAssumptions.filter(a => a.status === 'BROKEN');

    let passed = true;
    let healthPenalty = 0;
    let details = '';

    // Check universal assumptions (strict - any broken = fail)
    if (brokenUniversal.length > 0) {
      passed = false;
      details = `CRITICAL: ${brokenUniversal.length} universal assumption(s) broken - decision invalidated`;
    } 
    // Check decision-specific assumptions (proportional penalty)
    else if (decisionSpecificAssumptions.length > 0) {
      const specificBrokenPercent = (brokenSpecific.length / decisionSpecificAssumptions.length);
      healthPenalty = Math.floor(specificBrokenPercent * 60); // Max 60 point penalty
      
      if (brokenSpecific.length === 0) {
        details = `All ${input.assumptions.length} assumptions are valid`;
      } else {
        details = `${brokenSpecific.length} of ${decisionSpecificAssumptions.length} decision-specific assumptions broken (${Math.round(specificBrokenPercent * 100)}% failure) - health penalty: -${healthPenalty} points`;
        // If too many decision-specific assumptions fail, still invalidate
        if (specificBrokenPercent >= 0.7) { // 70% or more broken
          passed = false;
          details += ' - exceeds threshold, decision invalidated';
        }
      }
    } else if (universalAssumptions.length > 0 && brokenUniversal.length === 0) {
      details = `All ${universalAssumptions.length} universal assumptions are valid`;
    } else {
      details = 'No assumptions to evaluate';
    }

    const step: EvaluationStep = {
      step: 'assumption_check',
      passed,
      details,
      timestamp: new Date(),
      metadata: {
        universalTotal: universalAssumptions.length,
        universalBroken: brokenUniversal.length,
        specificTotal: decisionSpecificAssumptions.length,
        specificBroken: brokenSpecific.length,
        healthPenalty
      }
    };

    trace.push(step);
    return { passed, healthPenalty };
  }

  /**
   * Phase 4: Apply time-based health decay
   * Health is an internal signal only - never authoritative
   * Time decay alone can trigger UNDER_REVIEW but never AT_RISK or INVALIDATED
   *
   * Decay strategy:
   * - If expiryDate is set: Decay accelerates as expiry approaches and passes
   * - Otherwise: Decay based on time since last review (1 point per 30 days)
   */
  private applyHealthDecay(
    input: EvaluationInput,
    trace: EvaluationStep[]
  ): { decayAmount: number } {
    let decayAmount = 0;
    let details = '';

    if (input.decision.expiryDate) {
      // Expiry-based decay
      const daysUntilExpiry =
        (input.decision.expiryDate.getTime() - input.currentTimestamp.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysUntilExpiry > 90) {
        // More than 90 days until expiry: minimal decay
        decayAmount = 0;
        details = `${Math.floor(daysUntilExpiry)} days until expiry. No decay yet.`;
      } else if (daysUntilExpiry > 30) {
        // 30-90 days until expiry: warning phase (1 point per 15 days)
        const daysSinceWarningStart = 90 - daysUntilExpiry;
        decayAmount = Math.floor(daysSinceWarningStart / 15);
        details = `${Math.floor(daysUntilExpiry)} days until expiry. Warning phase: -${decayAmount} health.`;
      } else if (daysUntilExpiry > 0) {
        // 0-30 days until expiry: critical phase (1 point per 5 days)
        const baseDecay = Math.floor((90 - daysUntilExpiry) / 15); // Decay from warning phase
        const criticalDecay = Math.floor((30 - daysUntilExpiry) / 5);
        decayAmount = baseDecay + criticalDecay;
        details = `${Math.floor(daysUntilExpiry)} days until expiry. Critical phase: -${decayAmount} health.`;
      } else {
        // Past expiry: severe decay (1 point per day)
        const daysPastExpiry = Math.abs(daysUntilExpiry);
        const baseDecay = Math.floor(90 / 15) + Math.floor(30 / 5); // Max decay before expiry
        const overdueDecay = Math.floor(daysPastExpiry);
        decayAmount = baseDecay + overdueDecay;
        details = `${Math.floor(daysPastExpiry)} days PAST expiry. Severe decay: -${decayAmount} health.`;
      }
    } else {
      // Review-based decay (original logic)
      const daysSinceReview =
        (input.currentTimestamp.getTime() - input.decision.lastReviewedAt.getTime()) /
        (1000 * 60 * 60 * 24);

      // Decay 1 point per 30 days without review
      decayAmount = Math.floor(daysSinceReview / 30);
      details = `${Math.floor(daysSinceReview)} days since last review. Health decay: -${decayAmount}. (Health is a signal, not authority)`;
    }

    trace.push({
      step: 'health_decay',
      passed: true,
      details,
      timestamp: new Date()
    });

    return { decayAmount };
  }

  /**
   * Phase 5: Determine lifecycle state
   * State reflects need for human judgment, not system authority
   *
   * CRITICAL: healthSignal alone cannot cause INVALIDATED.
   * Only broken assumptions or violated constraints can invalidate a decision.
   */
  private determineLifecycleState(
    healthSignal: number,
    currentLifecycle: DecisionLifecycle,
    trace: EvaluationStep[]
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

    // Health signal thresholds (internal signals only)
    if (healthSignal >= 80) {
      newLifecycle = DecisionLifecycle.STABLE;
    } else if (healthSignal >= 60) {
      newLifecycle = DecisionLifecycle.UNDER_REVIEW;  // Signal: "please review this"
    } else if (healthSignal >= 40) {
      newLifecycle = DecisionLifecycle.AT_RISK;  // Signal: "urgent attention needed"
    } else {
      // healthSignal < 40: Still AT_RISK (never INVALIDATED from healthSignal alone)
      newLifecycle = DecisionLifecycle.AT_RISK;
    }

    const explanation =
      newLifecycle === DecisionLifecycle.STABLE
        ? `Health signal ${healthSignal} → STABLE (all good, no action needed)`
        : newLifecycle === DecisionLifecycle.UNDER_REVIEW
        ? `Health signal ${healthSignal} → UNDER_REVIEW (system signals: please review this)`
        : `Health signal ${healthSignal} → AT_RISK (system signals: urgent attention needed)`;

    trace.push({
      step: 'lifecycle_determination',
      passed: true,
      details: explanation,
      timestamp: new Date()
    });

    return newLifecycle;
  }
}
