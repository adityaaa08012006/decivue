/**
 * Assumption Model
 * Represents an explicit assumption underlying a decision
 */

export enum AssumptionStatus {
  VALID = 'VALID',
  BROKEN = 'BROKEN',
  UNKNOWN = 'UNKNOWN'
}

export interface Assumption {
  id: string;
  decisionId: string;
  description: string;             // Human-defined assumption
  status: AssumptionStatus;
  validatedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface AssumptionCreate {
  decisionId: string;
  description: string;
  status?: AssumptionStatus;
  metadata?: Record<string, any>;
}

export interface AssumptionUpdate {
  description?: string;
  status?: AssumptionStatus;
  validatedAt?: Date;
  metadata?: Record<string, any>;
}
