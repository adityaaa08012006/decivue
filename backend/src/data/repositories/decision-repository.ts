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
    const { data: decision, error } = await this.db
      .from('decisions')
      .insert({
        title: data.title,
        description: data.description,
        lifecycle: DecisionLifecycle.STABLE,
        health_signal: 100,
        invalidated_reason: null,
        metadata: data.metadata
      })
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
      .select('*')
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
      .select('*')
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
   */
  async delete(id: string): Promise<void> {
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
      metadata: row.metadata
    };
  }
}
