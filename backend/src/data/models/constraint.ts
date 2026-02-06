/**
 * Constraint Model
 *
 * PHILOSOPHY:
 * - Represents immutable organizational facts (legal, budget, policy)
 * - Constraint logic lives in the rule engine, NOT in SQL
 * - rule_expression is optional and used for reference only
 * - Violations cause immediate INVALIDATED status
 */

export enum ConstraintType {
  LEGAL = 'LEGAL',           // Legal requirements (GDPR, regulations)
  BUDGET = 'BUDGET',         // Financial constraints
  POLICY = 'POLICY',         // Organizational policies
  TECHNICAL = 'TECHNICAL',   // Technical limitations
  COMPLIANCE = 'COMPLIANCE', // Compliance requirements
  OTHER = 'OTHER'            // Other organizational facts
}

export interface Constraint {
  id: string;
  name: string;
  description: string;             // e.g., "GDPR compliance required"
  constraintType: ConstraintType;  // Category of constraint
  ruleExpression?: string;         // Optional reference - actual logic in engine
  isImmutable: boolean;            // True = organizational fact
  createdAt: Date;
}

export interface ConstraintCreate {
  name: string;
  description: string;
  constraintType: ConstraintType;
  ruleExpression?: string;
  isImmutable?: boolean;
}

export interface ConstraintUpdate {
  description?: string;
  constraintType?: ConstraintType;
  ruleExpression?: string;
}
