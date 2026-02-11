/**
 * Assumption Model (GLOBAL & REUSABLE)
 *
 * PHILOSOPHY:
 * - Assumptions are NOT tied to single decisions - they are global and reusable
 * - Status represents DRIFT from the original state, not absolute truth
 * - VALID: assumption is stable
 * - SHAKY: assumption is deteriorating but not yet broken
 * - BROKEN: assumption no longer holds, invalidates dependent decisions
 *
 * When an assumption status changes, ALL linked decisions must be re-evaluated.
 */

export enum AssumptionStatus {
  VALID = 'VALID',       // Stable, assumptions holds true
  SHAKY = 'SHAKY',       // Deteriorating, needs attention
  BROKEN = 'BROKEN'      // No longer valid, invalidates decisions
}

export interface Assumption {
  id: string;
  description: string;             // Must be unique - assumptions are global
  status: AssumptionStatus;
  validatedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AssumptionCreate {
  description: string;             // No decisionId - assumptions are global
  status?: AssumptionStatus;
  metadata?: Record<string, any>;
}

export interface AssumptionUpdate {
  description?: string;
  status?: AssumptionStatus;
  validatedAt?: Date;
  metadata?: Record<string, any>;
}
