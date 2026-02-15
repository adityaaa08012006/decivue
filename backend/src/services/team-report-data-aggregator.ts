/**
 * Team Report Data Aggregator
 * Collects comprehensive metrics for team member performance reports
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { TeamMemberMetrics } from './llm-service';
import { logger } from '@utils/logger';

export class TeamReportDataAggregator {
  constructor(private db: SupabaseClient) {}

  /**
   * Aggregate all metrics needed for a team member performance report
   * @param userId Team member's user ID
   * @param organizationId Organization ID
   * @param startDate Start of date range
   * @param endDate End of date range
   */
  async aggregateTeamMemberMetrics(
    userId: string,
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TeamMemberMetrics> {
    logger.info(`Aggregating metrics for user ${userId} from ${startDate} to ${endDate}`);

    // Fetch user information
    const { data: user } = await this.db
      .from('users')
      .select('id, full_name, email')
      .eq('id', userId)
      .single();

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Fetch decisions created by this user in date range
    const { data: decisions } = await this.db
      .from('decisions')
      .select('*')
      .eq('created_by', userId)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const userDecisions = decisions || [];

    // Fetch all decisions for this user (including before date range for trends)
    const { data: allDecisions } = await this.db
      .from('decisions')
      .select('created_at, health_signal')
      .eq('created_by', userId)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    // Aggregate decision patterns
    const decisionPatterns = await this.aggregateDecisionPatterns(userDecisions, allDecisions || []);

    // Aggregate assumptions usage
    const assumptionsUsage = await this.aggregateAssumptionsUsage(userId, organizationId, startDate, endDate);

    // Aggregate collaboration metrics
    const collaborationMetrics = await this.aggregateCollaborationMetrics(userId, organizationId, startDate, endDate);

    // Aggregate performance insights
    const performanceInsights = await this.aggregatePerformanceInsights(userDecisions, userId, organizationId, startDate, endDate);

    return {
      userId: user.id,
      userName: user.full_name || user.email,
      dateRange: { start: startDate, end: endDate },
      decisionPatterns,
      assumptionsUsage,
      collaborationMetrics,
      performanceInsights,
    };
  }

  /**
   * Aggregate decision-making patterns
   */
  private async aggregateDecisionPatterns(decisions: any[], allDecisions: any[]) {
    const lifecycleDistribution = {
      STABLE: 0,
      UNDER_REVIEW: 0,
      AT_RISK: 0,
      INVALIDATED: 0,
      RETIRED: 0,
    };

    let totalHealthSignal = 0;
    decisions.forEach(d => {
      const lifecycle = d.lifecycle as keyof typeof lifecycleDistribution;
      if (lifecycle in lifecycleDistribution) {
        lifecycleDistribution[lifecycle]++;
      }
      totalHealthSignal += d.health_signal || 0;
    });

    const averageHealthSignal = decisions.length > 0 ? Math.round(totalHealthSignal / decisions.length) : 0;

    // Calculate frequency trend (last 30 days vs previous 30 days)
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentDecisions = allDecisions.filter(d => new Date(d.created_at) >= thirtyDaysAgo).length;
    const previousDecisions = allDecisions.filter(d => {
      const date = new Date(d.created_at);
      return date >= sixtyDaysAgo && date < thirtyDaysAgo;
    }).length;

    let frequencyTrend = 'stable';
    if (recentDecisions > previousDecisions * 1.2) frequencyTrend = 'increasing';
    else if (recentDecisions < previousDecisions * 0.8) frequencyTrend = 'decreasing';

    // Calculate quality trend based on health signals
    const recentHealthSignals = allDecisions
      .filter(d => new Date(d.created_at) >= thirtyDaysAgo)
      .map(d => d.health_signal || 0);
    const previousHealthSignals = allDecisions
      .filter(d => {
        const date = new Date(d.created_at);
        return date >= sixtyDaysAgo && date < thirtyDaysAgo;
      })
      .map(d => d.health_signal || 0);

    const recentAvg = recentHealthSignals.length > 0
      ? recentHealthSignals.reduce((a, b) => a + b, 0) / recentHealthSignals.length
      : 0;
    const previousAvg = previousHealthSignals.length > 0
      ? previousHealthSignals.reduce((a, b) => a + b, 0) / previousHealthSignals.length
      : 0;

    let qualityTrend = 'stable';
    if (recentAvg > previousAvg + 5) qualityTrend = 'improving';
    else if (recentAvg < previousAvg - 5) qualityTrend = 'declining';

    return {
      totalDecisions: decisions.length,
      lifecycleDistribution,
      averageHealthSignal,
      frequencyTrend,
      qualityTrend,
    };
  }

  /**
   * Aggregate assumptions and constraints usage
   */
  private async aggregateAssumptionsUsage(_userId: string, organizationId: string, startDate: Date, endDate: Date) {
    // Fetch assumptions created by this user
    const { data: assumptions } = await this.db
      .from('assumptions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const userAssumptions = assumptions || [];

    const assumptionStatusDistribution = {
      VALID: 0,
      SHAKY: 0,
      BROKEN: 0,
    };

    let totalValidationTime = 0;
    let validatedCount = 0;

    userAssumptions.forEach(a => {
      const status = a.status as keyof typeof assumptionStatusDistribution;
      if (status in assumptionStatusDistribution) {
        assumptionStatusDistribution[status]++;
      }

      // Calculate validation time if validated
      if (a.validated_at) {
        const createdAt = new Date(a.created_at);
        const validatedAt = new Date(a.validated_at);
        const validationTime = (validatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        totalValidationTime += validationTime;
        validatedCount++;
      }
    });

    const averageValidationTime = validatedCount > 0 ? totalValidationTime / validatedCount : 0;

    // Calculate risk management score (based on validation rate and VALID percentage)
    const validationRate = userAssumptions.length > 0 ? (validatedCount / userAssumptions.length) * 100 : 0;
    const validPercentage = userAssumptions.length > 0
      ? (assumptionStatusDistribution.VALID / userAssumptions.length) * 100
      : 0;
    const riskManagementScore = Math.round((validationRate * 0.4 + validPercentage * 0.6));

    return {
      totalAssumptionsCreated: userAssumptions.length,
      assumptionStatusDistribution,
      averageValidationTime,
      riskManagementScore: Math.min(100, riskManagementScore),
    };
  }

  /**
   * Aggregate collaboration metrics
   */
  private async aggregateCollaborationMetrics(_userId: string, organizationId: string, startDate: Date, endDate: Date) {
    // Fetch assumption conflicts involving this user
    const { data: conflicts } = await this.db
      .from('assumption_conflicts')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const conflictsInvolved = conflicts?.length || 0;
    const conflictsResolved = conflicts?.filter(c => c.resolution_status === 'resolved').length || 0;

    // Fetch constraint violations
    const { data: violations } = await this.db
      .from('constraint_violations')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('detected_at', startDate.toISOString())
      .lte('detected_at', endDate.toISOString());

    const violationsDetected = violations?.length || 0;

    // Fetch dependencies where user is involved
    const { data: dependencies } = await this.db
      .from('dependencies')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    const dependenciesCreated = dependencies?.length || 0;

    // Count reviews performed (decisions reviewed by this user)
    const { data: decisions } = await this.db
      .from('decisions')
      .select('last_reviewed_at')
      .eq('organization_id', organizationId)
      .gte('last_reviewed_at', startDate.toISOString())
      .lte('last_reviewed_at', endDate.toISOString())
      .neq('created_at', 'last_reviewed_at'); // Exclude initial creation

    const reviewsPerformed = decisions?.length || 0;

    return {
      conflictsInvolved,
      conflictsResolved,
      violationsDetected,
      dependenciesCreated,
      reviewsPerformed,
    };
  }

  /**
   * Aggregate performance insights
   */
  private async aggregatePerformanceInsights(decisions: any[], _userId: string, _organizationId: string, startDate: Date, endDate: Date) {
    // Calculate average time to decision (from creation to review)
    let totalTimeToDecision = 0;
    let reviewedCount = 0;

    decisions.forEach(d => {
      if (d.last_reviewed_at && d.last_reviewed_at !== d.created_at) {
        const createdAt = new Date(d.created_at);
        const reviewedAt = new Date(d.last_reviewed_at);
        const timeToDecision = (reviewedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        totalTimeToDecision += timeToDecision;
        reviewedCount++;
      }
    });

    const averageTimeToDecision = reviewedCount > 0 ? totalTimeToDecision / reviewedCount : 0;

    // Calculate review frequency (reviews per month)
    const dateRangeDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const reviewFrequency = dateRangeDays > 0 ? (reviewedCount / dateRangeDays) * 30 : 0;

    // Calculate invalidation rate
    const invalidatedCount = decisions.filter(d => d.lifecycle === 'INVALIDATED').length;
    const invalidationRate = decisions.length > 0 ? (invalidatedCount / decisions.length) * 100 : 0;

    // Calculate proactivity score
    const stableCount = decisions.filter(d => d.lifecycle === 'STABLE').length;
    const atRiskCount = decisions.filter(d => d.lifecycle === 'AT_RISK').length;
    const invalidatedPenalty = invalidationRate;

    const proactivityScore = Math.max(0, Math.min(100, Math.round(
      (stableCount / Math.max(1, decisions.length)) * 100 -
      (atRiskCount / Math.max(1, decisions.length)) * 20 -
      invalidatedPenalty * 0.5
    )));

    return {
      averageTimeToDecision,
      reviewFrequency,
      invalidationRate,
      proactivityScore,
    };
  }
}
