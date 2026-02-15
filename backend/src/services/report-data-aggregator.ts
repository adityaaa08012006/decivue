/**
 * Report Data Aggregator
 * Handles querying and aggregating data for reports
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { ReportOptions, ReportData, ReportMetrics } from '../types/report-types';

export class ReportDataAggregator {
  constructor(private db: SupabaseClient) {}

  /**
   * Aggregate all data needed for a report
   * RLS automatically filters by organization_id
   */
  async aggregateReportData(options: ReportOptions): Promise<ReportData> {
    // Fetch user metadata
    const userId = options.userId || '';
    const { data: user } = await this.db
      .from('users')
      .select('id, email, full_name, role, organization_id')
      .eq('id', userId)
      .single();

    // Fetch organization name
    const { data: org } = await this.db
      .from('organizations')
      .select('name')
      .eq('id', options.organizationId)
      .single();

    // Build decisions query
    let decisionsQuery = this.db
      .from('decisions')
      .select(`
        id,
        title,
        description,
        lifecycle,
        created_at,
        last_reviewed_at,
        created_by,
        creator:users!created_by(full_name,email)
      `)
      .order('created_at', { ascending: false });

    // Filter by user if individual report
    if (options.userId) {
      decisionsQuery = decisionsQuery.eq('created_by', options.userId);
    }

    // Filter by date range if provided
    if (options.startDate) {
      decisionsQuery = decisionsQuery.gte('created_at', options.startDate.toISOString());
    }
    if (options.endDate) {
      decisionsQuery = decisionsQuery.lte('created_at', options.endDate.toISOString());
    }

    // Filter archived unless explicitly included
    if (!options.includeArchived) {
      decisionsQuery = decisionsQuery.neq('lifecycle', 'RETIRED');
    }

    const { data: decisions, error: decisionsError } = await decisionsQuery;
    if (decisionsError) throw decisionsError;

    // Get decision IDs for assumptions/constraints queries
    const decisionIds = decisions?.map(d => d.id) || [];

    // Fetch assumptions linked to these decisions
    let assumptionsData: any[] = [];
    if (decisionIds.length > 0) {
      const { data } = await this.db
        .from('decision_assumptions')
        .select(`
          assumption_id,
          assumptions (
            id,
            description,
            status,
            created_at,
            validated_at
          )
        `)
        .in('decision_id', decisionIds);

      assumptionsData = data?.map((da: any) => da.assumptions).filter(Boolean) || [];
    }

    // Fetch constraints linked to these decisions
    let constraintsData: any[] = [];
    if (decisionIds.length > 0) {
      const { data } = await this.db
        .from('decision_constraints')
        .select(`
          constraint_id,
          constraints (
            id,
            name,
            description,
            constraint_type
          )
        `)
        .in('decision_id', decisionIds);

      constraintsData = data?.map((dc: any) => dc.constraints).filter(Boolean) || [];
    }

    // Calculate metrics
    const metrics = this.calculateMetrics(decisions || [], assumptionsData);

    // Map to report structures
    const decisionsReport = await Promise.all(
      (decisions || []).map(async (d) => {
        // Count linked assumptions and constraints
        const assumptionCount = await this.countLinkedAssumptions(d.id);
        const constraintCount = await this.countLinkedConstraints(d.id);

        return {
          id: d.id,
          title: d.title,
          description: d.description,
          lifecycle: d.lifecycle,
          createdAt: new Date(d.created_at),
          lastReviewedAt: new Date(d.last_reviewed_at),
          createdBy: d.created_by,
          creatorName: d.creator?.full_name || 'Unknown',
          assumptionCount,
          constraintCount,
        };
      })
    );

    const assumptionsReport = assumptionsData.map(a => ({
      id: a.id,
      description: a.description,
      status: a.status,
      createdAt: new Date(a.created_at),
      validatedAt: a.validated_at ? new Date(a.validated_at) : undefined,
      linkedDecisionCount: 1, // Will be aggregated
    }));

    const constraintsReport = constraintsData.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      constraintType: c.constraint_type,
      linkedDecisionCount: 1, // Will be aggregated
    }));

    return {
      metadata: {
        generatedAt: new Date(),
        generatedBy: {
          id: user?.id || '',
          fullName: user?.full_name || '',
          email: user?.email || '',
          role: user?.role as 'lead' | 'member',
        },
        organizationName: org?.name || 'Unknown Organization',
        reportType: options.userId ? 'individual' : 'organization',
        dateRange: options.startDate && options.endDate ? {
          start: options.startDate,
          end: options.endDate,
        } : undefined,
      },
      decisions: decisionsReport,
      assumptions: assumptionsReport,
      constraints: constraintsReport,
      metrics,
    };
  }

  private async countLinkedAssumptions(decisionId: string): Promise<number> {
    const { count } = await this.db
      .from('decision_assumptions')
      .select('*', { count: 'exact', head: true })
      .eq('decision_id', decisionId);
    return count || 0;
  }

  private async countLinkedConstraints(decisionId: string): Promise<number> {
    const { count } = await this.db
      .from('decision_constraints')
      .select('*', { count: 'exact', head: true })
      .eq('decision_id', decisionId);
    return count || 0;
  }

  private calculateMetrics(decisions: any[], assumptions: any[]): ReportMetrics {
    const totalDecisions = decisions.length;

    // Lifecycle distribution
    const lifecycleDistribution = {
      STABLE: 0,
      UNDER_REVIEW: 0,
      AT_RISK: 0,
      INVALIDATED: 0,
      RETIRED: 0,
    };
    decisions.forEach(d => {
      const lifecycle = d.lifecycle as keyof typeof lifecycleDistribution;
      if (lifecycle in lifecycleDistribution) {
        lifecycleDistribution[lifecycle]++;
      }
    });

    // Assumption status distribution
    const assumptionStatusDistribution = {
      VALID: 0,
      SHAKY: 0,
      BROKEN: 0,
    };
    assumptions.forEach(a => {
      const status = a.status as keyof typeof assumptionStatusDistribution;
      if (status in assumptionStatusDistribution) {
        assumptionStatusDistribution[status]++;
      }
    });

    // Average decision age
    const now = new Date();
    const totalAge = decisions.reduce((sum, d) => {
      const age = (now.getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return sum + age;
    }, 0);
    const averageDecisionAge = totalDecisions > 0 ? totalAge / totalDecisions : 0;

    // Recent review rate (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentlyReviewed = decisions.filter(d =>
      new Date(d.last_reviewed_at) >= thirtyDaysAgo
    ).length;
    const recentReviewRate = totalDecisions > 0 ? (recentlyReviewed / totalDecisions) * 100 : 0;

    return {
      totalDecisions,
      lifecycleDistribution,
      assumptionStatusDistribution,
      averageDecisionAge: Math.round(averageDecisionAge),
      recentReviewRate: Math.round(recentReviewRate),
      constraintsByType: {}, // Can be enhanced with constraint data
    };
  }
}
