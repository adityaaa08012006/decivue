/**
 * Constraint Model
 * Represents immutable organizational facts that cannot be violated
 */

export interface Constraint {
  id: string;
  name: string;
  description: string;             // e.g., "GDPR compliance required"
  ruleExpression: string;          // Stored rule expression
  isImmutable: boolean;            // True = organizational fact
  createdAt: Date;
}

export interface ConstraintCreate {
  name: string;
  description: string;
  ruleExpression: string;
  isImmutable?: boolean;
}

export interface ConstraintUpdate {
  description?: string;
  ruleExpression?: string;
}
