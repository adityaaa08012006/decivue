/**
 * Decision Tension Model
 *
 * PHILOSOPHY:
 * - Conflicts between decisions are SURFACED, not auto-resolved
 * - Represents incompatibilities that require human judgment
 * - Tensions can be resolved explicitly with notes
 * - System highlights conflicts; humans make trade-offs
 */

export enum TensionSeverity {
  LOW = 'LOW',       // Minor conflict, low impact
  MEDIUM = 'MEDIUM', // Moderate conflict, requires attention
  HIGH = 'HIGH'      // Major conflict, urgent resolution needed
}

export interface DecisionTension {
  id: string;
  decisionAId: string;
  decisionBId: string;
  reason: string;                // Why do these decisions conflict?
  severity: TensionSeverity;
  detectedAt: Date;
  resolvedAt?: Date;             // When was this resolved (if ever)?
  resolutionNotes?: string;      // How was it resolved?
  metadata?: Record<string, any>;
}

export interface DecisionTensionCreate {
  decisionAId: string;
  decisionBId: string;
  reason: string;
  severity?: TensionSeverity;
  metadata?: Record<string, any>;
}

export interface DecisionTensionUpdate {
  reason?: string;
  severity?: TensionSeverity;
  resolved?: boolean;            // Set to true to mark as resolved
  resolutionNotes?: string;
  metadata?: Record<string, any>;
}
