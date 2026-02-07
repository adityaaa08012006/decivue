/**
 * Constraint Violation Repository
 * Manages database operations for constraint violations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@utils/logger';

export interface ConstraintViolation {
  id: string;
  decision_id: string;
  constraint_id: string;
  violation_reason: string;
  detected_at: string;
  resolved_at?: string;
  metadata: Record<string, any>;
}

export interface CreateViolationParams {
  decisionId: string;
  constraintId: string;
  reason: string;
  metadata?: Record<string, any>;
}

export class ConstraintViolationRepository {
  constructor(private db: SupabaseClient) {}

  /**
   * Record a new constraint violation
   */
  async recordViolation(params: CreateViolationParams): Promise<ConstraintViolation> {
    const { decisionId, constraintId, reason, metadata = {} } = params;

    const { data, error } = await this.db
      .from('constraint_violations')
      .insert({
        decision_id: decisionId,
        constraint_id: constraintId,
        violation_reason: reason,
        metadata
      })
      .select()
      .single();

    if (error) {
      logger.error('Failed to record constraint violation', { error, params });
      throw error;
    }

    logger.info('Constraint violation recorded', {
      violationId: data.id,
      decisionId,
      constraintId
    });

    return data as ConstraintViolation;
  }

  /**
   * Resolve a violation (mark as resolved)
   */
  async resolveViolation(violationId: string): Promise<void> {
    const { error } = await this.db
      .from('constraint_violations')
      .update({ resolved_at: new Date().toISOString() })
      .eq('id', violationId);

    if (error) {
      logger.error('Failed to resolve violation', { error, violationId });
      throw error;
    }

    logger.info('Constraint violation resolved', { violationId });
  }

  /**
   * Get all active (unresolved) violations for a decision
   */
  async getActiveViolations(decisionId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('constraint_violations')
      .select('*, constraints!constraint_violations_constraint_id_fkey(*)')
      .eq('decision_id', decisionId)
      .is('resolved_at', null)
      .order('detected_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch active violations', { error, decisionId });
      throw error;
    }

    return data || [];
  }

  /**
   * Get all violations for a decision (including resolved)
   */
  async getAllViolations(decisionId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('constraint_violations')
      .select('*, constraints!constraint_violations_constraint_id_fkey(*)')
      .eq('decision_id', decisionId)
      .order('detected_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch all violations', { error, decisionId });
      throw error;
    }

    return data || [];
  }

  /**
   * Get violations by constraint
   */
  async getViolationsByConstraint(constraintId: string): Promise<any[]> {
    const { data, error } = await this.db
      .from('constraint_violations')
      .select('*, decisions!constraint_violations_decision_id_fkey(id, title, lifecycle)')
      .eq('constraint_id', constraintId)
      .order('detected_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch violations by constraint', { error, constraintId });
      throw error;
    }

    return data || [];
  }

  /**
   * Delete a violation
   */
  async deleteViolation(violationId: string): Promise<void> {
    const { error } = await this.db
      .from('constraint_violations')
      .delete()
      .eq('id', violationId);

    if (error) {
      logger.error('Failed to delete violation', { error, violationId });
      throw error;
    }

    logger.info('Constraint violation deleted', { violationId });
  }

  /**
   * Check if a specific violation already exists (to prevent duplicates)
   */
  async violationExists(decisionId: string, constraintId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('constraint_violations')
      .select('id')
      .eq('decision_id', decisionId)
      .eq('constraint_id', constraintId)
      .is('resolved_at', null)
      .limit(1);

    if (error) {
      logger.error('Failed to check violation existence', { error, decisionId, constraintId });
      return false;
    }

    return (data?.length || 0) > 0;
  }
}
