/**
 * Report Types
 * Defines structure for PDF report data
 */

export interface ReportOptions {
  userId?: string;           // If provided, filter by this user (member reports)
  organizationId: string;    // Always filter by organization
  includeArchived?: boolean; // Include RETIRED decisions
  startDate?: Date;          // Optional date range
  endDate?: Date;
}

export interface ReportData {
  metadata: ReportMetadata;
  decisions: DecisionReportItem[];
  assumptions: AssumptionReportItem[];
  constraints: ConstraintReportItem[];
  metrics: ReportMetrics;
}

export interface ReportMetadata {
  generatedAt: Date;
  generatedBy: {
    id: string;
    fullName: string;
    email: string;
    role: 'lead' | 'member';
  };
  organizationName: string;
  reportType: 'individual' | 'organization';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface DecisionReportItem {
  id: string;
  title: string;
  description: string;
  lifecycle: string;
  createdAt: Date;
  lastReviewedAt: Date;
  createdBy: string;
  creatorName: string;
  assumptionCount: number;
  constraintCount: number;
}

export interface AssumptionReportItem {
  id: string;
  description: string;
  status: string;
  createdAt: Date;
  validatedAt?: Date;
  linkedDecisionCount: number;
}

export interface ConstraintReportItem {
  id: string;
  name: string;
  description: string;
  constraintType: string;
  linkedDecisionCount: number;
}

export interface ReportMetrics {
  totalDecisions: number;
  lifecycleDistribution: {
    STABLE: number;
    UNDER_REVIEW: number;
    AT_RISK: number;
    INVALIDATED: number;
    RETIRED: number;
  };
  assumptionStatusDistribution: {
    VALID: number;
    SHAKY: number;
    BROKEN: number;
  };
  averageDecisionAge: number; // days
  recentReviewRate: number;   // % reviewed in last 30 days
  constraintsByType: Record<string, number>;
}
