/**
 * Decision Repository
 * Data access layer for decisions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Decision, DecisionCreate, DecisionUpdate, DecisionLifecycle } from '@data/models';
import { NotFoundError } from '@utils/errors';

export class DecisionRepository {
  constructor(private db: SupabaseClient) {}

  /**
   * Create a new decision
   */
  async create(data: DecisionCreate): Promise<Decision> {
    const insertData: any = {
      title: data.title,
      description: data.description,
      lifecycle: DecisionLifecycle.STABLE,
      health_signal: 100,
      invalidated_reason: null,
      metadata: data.metadata,
      organization_id: (data as any).organization_id, // Added for multi-tenant support
      created_by: (data as any).created_by // Added for auth tracking
    };

    // Add expiry_date if provided
    if (data.expiry_date) {
      insertData.expiry_date = data.expiry_date;
    }

    const { data: decision, error } = await this.db
      .from('decisions')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;

    return this.mapToDecision(decision);
  }

  /**
   * Find decision by ID
   */
  async findById(id: string): Promise<Decision> {
    const { data, error } = await this.db
      .from('decisions')
      .select(`
        *,
        creator:users!created_by(full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundError('Decision', id);
    }

    return this.mapToDecision(data);
  }

  /**
   * Find all decisions
   */
  async findAll(): Promise<Decision[]> {
    const { data, error } = await this.db
      .from('decisions')
      .select(`
        *,
        creator:users!created_by(full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(this.mapToDecision);
  }

  /**
   * Update a decision
   */
  async update(id: string, data: DecisionUpdate): Promise<Decision> {
    const { data: updated, error } = await this.db
      .from('decisions')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new NotFoundError('Decision', id);

    return this.mapToDecision(updated);
  }

  /**
   * Update decision lifecycle and health signal (used after evaluation)
   *
   * CRITICAL: Does NOT update last_reviewed_at - that's only for explicit human review
   * healthSignal is an internal signal only, never authoritative
   */
  async updateEvaluation(
    id: string,
    lifecycle: DecisionLifecycle,
    healthSignal: number,
    invalidatedReason?: string
  ): Promise<Decision> {
    const { data: updated, error } = await this.db
      .from('decisions')
      .update({
        lifecycle,
        health_signal: healthSignal,
        invalidated_reason: invalidatedReason || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new NotFoundError('Decision', id);

    return this.mapToDecision(updated);
  }

  /**
   * Delete a decision
   * Also cascades to delete assumptions that are ONLY linked to this decision
   */
  async delete(id: string): Promise<void> {
    // Step 1: Find all assumptions linked to this decision
    const { data: linkedAssumptions, error: fetchError } = await this.db
      .from('decision_assumptions')
      .select('assumption_id')
      .eq('decision_id', id);

    if (fetchError) throw fetchError;

    // Step 2: For each assumption, check if it's linked to other decisions
    const assumptionIds = (linkedAssumptions || []).map(da => da.assumption_id);
    const assumptionsToDelete: string[] = [];

    for (const assumptionId of assumptionIds) {
      // Count how many decisions this assumption is linked to
      const { data: links, error: countError } = await this.db
        .from('decision_assumptions')
        .select('decision_id')
        .eq('assumption_id', assumptionId);

      if (countError) throw countError;

      // If this assumption is ONLY linked to this decision (count = 1), mark for deletion
      if (links && links.length === 1) {
        assumptionsToDelete.push(assumptionId);
      }
    }

    // Step 3: Delete assumptions that are only linked to this decision
    if (assumptionsToDelete.length > 0) {
      const { error: deleteAssumptionsError } = await this.db
        .from('assumptions')
        .delete()
        .in('id', assumptionsToDelete);

      if (deleteAssumptionsError) throw deleteAssumptionsError;
    }

    // Step 4: Delete the decision (CASCADE will handle decision_assumptions, dependencies, etc.)
    const { error } = await this.db
      .from('decisions')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Map database row to Decision model
   */
  private mapToDecision(row: any): Decision {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      lifecycle: row.lifecycle as DecisionLifecycle,
      healthSignal: row.health_signal,
      invalidatedReason: row.invalidated_reason,
      createdAt: new Date(row.created_at),
      lastReviewedAt: new Date(row.last_reviewed_at),
      expiryDate: row.expiry_date ? new Date(row.expiry_date) : undefined,
      createdBy: row.created_by,
      organizationId: row.organization_id,
      creator: row.creator ? {
        fullName: row.creator.full_name,
        email: row.creator.email
      } : undefined,
      metadata: row.metadata
    };
  }
}
