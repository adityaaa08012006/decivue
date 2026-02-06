/**
 * Decision Engine Types
 * Type definitions for the deterministic rule engine
 *
 * Philosophy: The system does not replace human judgment — it highlights when judgment is needed.
 */

import { Decision, Assumption, Constraint } from '@data/models';

/**
 * Input for decision evaluation
 */
export interface EvaluationInput {
  decision: Decision;
  assumptions: Assumption[];
  dependencies: Decision[];        // Decisions this decision depends on
  constraints: Constraint[];
  currentTimestamp: Date;
}

/**
 * Individual step in the evaluation process
 * Used for creating an audit trail and explanation trace
 */
export interface EvaluationStep {
  step: string;                    // e.g., "constraint_validation"
  passed: boolean;
  details: string;                 // Explanation of what happened
  timestamp: Date;
}

/**
 * Output from decision evaluation
 */
export interface EvaluationOutput {
  decisionId: string;
  newLifecycle: string;
  newHealth: number;               // Internal signal only (never authoritative)
  trace: EvaluationStep[];         // Step-by-step explanation
  changesDetected: boolean;
}

/**
 * Interface for the decision engine
 */
export interface IDecisionEngine {
  /**
   * Evaluates a decision deterministically through all rule phases
   * @param input - The evaluation input containing decision and context
   * @returns Evaluation output with new state and explanation trace
   */
  evaluate(input: EvaluationInput): EvaluationOutput;
}
