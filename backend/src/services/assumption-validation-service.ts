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
      const db = getDatabase();

      // Get linked decision IDs for context
      const linkedDecisionIds = assumption.decision_assumptions?.map(
        (da: any) => da.decision_id
      ) || [];

      // Check if a similar notification already exists (same assumption, same type, not dismissed)
      const { data: existingNotification } = await db
        .from('notifications')
        .select('id')
        .eq('type', 'ASSUMPTION_BROKEN')
        .eq('assumption_id', assumption.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Only create notification if one doesn't already exist
      if (!existingNotification) {
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
      } else {
        logger.info(`Skipping duplicate validation warning for assumption ${assumption.id} - notification already exists`);
      }
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

  /**
   * Deprecate decision-specific assumptions when all their linked decisions are retired
   * Called when a decision is permanently retired (not for INVALIDATED which can recover)
   * 
   * Note: INVALIDATED decisions are temporarily broken and can recover, so we don't
   * deprecate their assumptions. Only RETIRED decisions are permanently deprecated.
   */
  static async deprecateOrphanedAssumptions(decisionId: string): Promise<void> {
    try {
      const db = getDatabase();

      // Get all DECISION_SPECIFIC assumptions linked to this decision
      const { data: links, error: linksError } = await db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          assumptions (
            id,
            description,
            scope,
            status
          )
        `)
        .eq('decision_id', decisionId);

      if (linksError) throw linksError;

      if (!links || links.length === 0) {
        logger.info('No assumptions linked to deprecated decision', { decisionId });
        return;
      }

      // Filter to only DECISION_SPECIFIC assumptions (or NULL/missing scope - treat as decision-specific)
      const decisionSpecificAssumptions = links
        .filter((link: any) => 
          link.assumptions?.scope === 'DECISION_SPECIFIC' || 
          !link.assumptions?.scope || 
          link.assumptions?.scope === null
        )
        .map((link: any) => link.assumptions);

      logger.info(`Checking ${decisionSpecificAssumptions.length} decision-specific assumptions for deprecation`, {
        decisionId,
        note: 'Including assumptions with NULL/missing scope'
      });

      // For each assumption, check if ALL linked decisions are deprecated
      for (const assumption of decisionSpecificAssumptions) {
        if (!assumption) continue;

        // Get all decisions linked to this assumption
        const { data: allLinks, error: allLinksError } = await db
          .from('decision_assumptions')
          .select(`
            decision_id,
            decisions (
              id,
              title,
              lifecycle
            )
          `)
          .eq('assumption_id', assumption.id);

        if (allLinksError) {
          logger.error('Failed to get all links for assumption', { 
            assumptionId: assumption.id, 
            error: allLinksError 
          });
          continue;
        }

        if (!allLinks || allLinks.length === 0) continue;

        // Check if ALL linked decisions are truly deprecated (RETIRED)
        // Note: INVALIDATED decisions can recover, so we don't treat them as deprecated
        const allDeprecated = allLinks.every((link: any) => 
          link.decisions?.lifecycle === 'RETIRED'
        );

        if (allDeprecated) {
          // Mark assumption as BROKEN
          const { error: updateError } = await db
            .from('assumptions')
            .update({ 
              status: 'BROKEN',
              validated_at: new Date().toISOString()
            })
            .eq('id', assumption.id);

          if (updateError) {
            logger.error('Failed to deprecate assumption', { 
              assumptionId: assumption.id, 
              error: updateError 
            });
          } else {
            logger.info(`Deprecated assumption: ${assumption.description.substring(0, 60)}...`, {
              assumptionId: assumption.id,
              reason: 'All linked decisions are retired (permanently deprecated)'
            });

            // Check if notification already exists for this assumption deprecation
            const { data: existingNotification } = await db
              .from('notifications')
              .select('id')
              .eq('type', 'ASSUMPTION_BROKEN')
              .eq('assumption_id', assumption.id)
              .eq('is_dismissed', false)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            // Only create notification if one doesn't already exist
            if (!existingNotification) {
              await NotificationService.create({
                type: 'ASSUMPTION_BROKEN',
                severity: 'INFO',
                title: '📋 Assumption Auto-Deprecated',
                message: `"${assumption.description}" was marked as BROKEN because all decisions using it have been permanently retired.`,
                assumptionId: assumption.id,
                metadata: {
                  reason: 'all_decisions_retired',
                  retiredDecisionCount: allLinks.length
                }
              });
            } else {
              logger.info(`Skipping duplicate notification for assumption ${assumption.id} - notification already exists`);
            }
          }
        } else {
          // At least one non-retired decision - keep assumption active
          // Note: INVALIDATED decisions can still recover, so we keep their assumptions
          const activeCount = allLinks.filter((link: any) => 
            link.decisions?.lifecycle !== 'RETIRED'
          ).length;

          logger.info(`Keeping assumption active: ${activeCount} active decision(s) still using it`, {
            assumptionId: assumption.id,
            totalDecisions: allLinks.length,
            activeDecisions: activeCount
          });
        }
      }
    } catch (error) {
      logger.error('Error deprecating orphaned assumptions', { decisionId, error });
    }
  }
}
