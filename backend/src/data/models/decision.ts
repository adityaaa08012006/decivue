/**
 * Decision Model
 * Core entity representing a business decision under monitoring
 *
 * Philosophy: The system does not replace human judgment — it highlights when judgment is needed.
 */

export enum DecisionLifecycle {
  STABLE = 'STABLE',
  UNDER_REVIEW = 'UNDER_REVIEW',
  AT_RISK = 'AT_RISK',
  INVALIDATED = 'INVALIDATED',
  RETIRED = 'RETIRED'
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  lifecycle: DecisionLifecycle;
  health: number;                  // 0-100, internal signal only (never authoritative, not exposed in UI)
  createdAt: Date;
  lastReviewedAt: Date;
  metadata?: Record<string, any>; // Additional context
}

export interface DecisionCreate {
  title: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface DecisionUpdate {
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}
