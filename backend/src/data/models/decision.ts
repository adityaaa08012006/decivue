/**
 * Decision Model
 * Core entity representing a business decision under monitoring
 *
 * PHILOSOPHY:
 * - The system does not replace human judgment — it highlights when judgment is needed
 * - healthSignal is an INTERNAL signal only, never authoritative
 * - Only broken assumptions or violated constraints can cause INVALIDATED
 * - last_reviewed_at is updated ONLY by explicit human review, never automatically
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
  healthSignal: number;            // 0-100, INTERNAL signal only (never authoritative, not exposed in UI)
  invalidatedReason?: string;      // Why was this invalidated? (constraint_violation | broken_assumptions | manual)
  createdAt: Date;
  lastReviewedAt: Date;            // Updated ONLY by explicit human review action
  expiryDate?: Date;               // Optional expiration date - accelerates decay as it approaches/passes
  createdBy?: string;              // User ID who created this decision
  creator?: {                      // Creator user information (joined from users table)
    fullName?: string;
    email?: string;
  };
  metadata?: Record<string, any>; // Additional context
}

export interface DecisionCreate {
  title: string;
  description: string;
  expiry_date?: string; // ISO date string
  metadata?: Record<string, any>;
}

export interface DecisionUpdate {
  title?: string;
  description?: string;
  metadata?: Record<string, any>;
}
