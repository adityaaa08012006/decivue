/**
 * Assumption Validation Service
 * Validates if manual status changes match the actual state of assumptions
 */

import { getDatabase } from '@data/database';
import { NotificationService } from './notification-service';
import { logger } from '@utils/logger';

export interface ValidationResult {
  isValid: boolean;
  suggestedStatus?: 'VALID' | 'SHAKY' | 'BROKEN';
  reason?: string;
  confidence?: number; // 0-1 confidence score
}

export class AssumptionValidationService {
  /**
   * Validate if the manual status change matches reality
   * This performs intelligent checks against related data
   */
  static async validateStatusChange(
    assumptionId: string,
    newStatus: 'VALID' | 'SHAKY' | 'BROKEN',
    oldStatus: 'VALID' | 'SHAKY' | 'BROKEN'
  ): Promise<ValidationResult> {
    try {
      const db = getDatabase();

      // Get the assumption with all its context
      const { data: assumption, error } = await db
        .from('assumptions')
        .select(`
          *,
          decision_assumptions (
            decision_id,
            decisions (
              id,
              title,
              health_signal,
              lifecycle
            )
          )
        `)
        .eq('id', assumptionId)
        .single();

      if (error || !assumption) {
        logger.error('Failed to fetch assumption for validation', { error, assumptionId });
        return { isValid: true }; // Allow the change if we can't validate
      }

      // Run validation checks
      const checks = await this.runValidationChecks(assumption, newStatus);

      // If checks suggest a different status, create notification
      if (!checks.isValid && checks.suggestedStatus !== newStatus) {
        await this.createValidationWarning(assumption, newStatus, checks);
      }

      return checks;
    } catch (error) {
      logger.error('Error during assumption validation', { error });
      return { isValid: true }; // Allow the change on error
    }
  }

  /**
   * Run various validation checks
   */
  private static async runValidationChecks(
    assumption: any,
    newStatus: string
  ): Promise<ValidationResult> {
    const checks: Array<ValidationResult> = [];

    // Check 1: If marking as VALID, but all linked decisions are INVALIDATED
    if (newStatus === 'VALID') {
      const linkedDecisions = assumption.decision_assumptions || [];
      const invalidatedDecisions = linkedDecisions.filter(
        (da: any) => da.decisions?.lifecycle === 'INVALIDATED'
      );

      if (linkedDecisions.length > 0 && invalidatedDecisions.length === linkedDecisions.length) {
        checks.push({
          isValid: false,
          suggestedStatus: 'BROKEN',
          reason: 'All linked decisions are INVALIDATED, suggesting this assumption may be broken',
          confidence: 0.8
        });
      }
    }

    // Check 2: If marking as BROKEN, but linked decisions have high health
    if (newStatus === 'BROKEN') {
      const linkedDecisions = assumption.decision_assumptions || [];
      const healthyDecisions = linkedDecisions.filter(
        (da: any) => da.decisions?.health_signal >= 85
      );

      if (linkedDecisions.length > 0 && healthyDecisions.length === linkedDecisions.length) {
        checks.push({
          isValid: false,
          suggestedStatus: 'VALID',
          reason: 'All linked decisions have high health (85+), suggesting this assumption is still valid',
          confidence: 0.7
        });
      }
    }

    // Check 3: If marking as VALID, but has unresolved conflicts
    if (newStatus === 'VALID') {
      const db = getDatabase();
      const { data: conflicts } = await db
        .from('assumption_conflicts')
        .select('*')
        .or(`assumption_a_id.eq.${assumption.id},assumption_b_id.eq.${assumption.id}`)
        .is('resolved_at', null);

      if (conflicts && conflicts.length > 0) {
        checks.push({
          isValid: false,
          suggestedStatus: 'SHAKY',
          reason: `This assumption has ${conflicts.length} unresolved conflict(s) with other assumptions`,
          confidence: 0.85
        });
      }
    }

    // Check 4: If marking as VALID, but was recently BROKEN
    if (newStatus === 'VALID' && assumption.status === 'BROKEN') {
      const brokenAge = assumption.validated_at
        ? Date.now() - new Date(assumption.validated_at).getTime()
        : 0;

      // If it was marked BROKEN less than 1 hour ago
      if (brokenAge < 3600000) {
        checks.push({
          isValid: false,
          suggestedStatus: 'SHAKY',
          reason: 'This assumption was recently marked as BROKEN. Consider SHAKY status for gradual recovery',
          confidence: 0.6
        });
      }
    }

    // If any check failed, return the one with highest confidence
    if (checks.length > 0) {
      const highestConfidence = checks.reduce((prev, current) =>
        (current.confidence || 0) > (prev.confidence || 0) ? current : prev
      );
      return highestConfidence;
    }

    // All checks passed
    return { isValid: true };
  }

  /**
   * Create a validation warning notification
   */
  private static async createValidationWarning(
    assumption: any,
    newStatus: string,
    validation: ValidationResult
  ): Promise<void> {
    try {
      // Get linked decision IDs for context
      const linkedDecisionIds = assumption.decision_assumptions?.map(
        (da: any) => da.decision_id
      ) || [];

      await NotificationService.create({
        type: 'ASSUMPTION_BROKEN',
        severity: 'WARNING',
        title: '⚠️ Status Mismatch Detected',
        message: `You marked "${assumption.description}" as ${newStatus}, but ${validation.reason}`,
        assumptionId: assumption.id,
        decisionId: linkedDecisionIds[0], // Use first linked decision
        metadata: {
          manualStatus: newStatus,
          suggestedStatus: validation.suggestedStatus,
          confidence: validation.confidence,
          reason: validation.reason,
          linkedDecisions: linkedDecisionIds
        }
      });

      logger.warn('Assumption status mismatch detected', {
        assumptionId: assumption.id,
        manualStatus: newStatus,
        suggestedStatus: validation.suggestedStatus,
        reason: validation.reason
      });
    } catch (error) {
      logger.error('Failed to create validation warning', { error });
    }
  }

  /**
   * Re-evaluate all decisions linked to this assumption
   */
  static async reEvaluateLinkedDecisions(assumptionId: string): Promise<void> {
    try {
      const db = getDatabase();

      // Get all linked decisions
      const { data: links, error } = await db
        .from('decision_assumptions')
        .select('decision_id')
        .eq('assumption_id', assumptionId);

      if (error) throw error;

      if (links && links.length > 0) {
        logger.info(`Re-evaluating ${links.length} decisions after assumption update`, {
          assumptionId
        });

        // Trigger re-evaluation for each decision
        // Note: In production, this could be done via a job queue
        for (const link of links) {
          try {
            // Call the evaluation endpoint programmatically
            await fetch(`http://localhost:3001/api/decisions/${link.decision_id}/evaluate`, {
              method: 'POST'
            });
          } catch (evalError) {
            logger.error('Failed to re-evaluate decision', {
              decisionId: link.decision_id,
              error: evalError
            });
          }
        }
      }
    } catch (error) {
      logger.error('Error re-evaluating linked decisions', { error });
    }
  }
}
