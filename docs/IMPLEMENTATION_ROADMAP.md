# DecivuePro: Advanced Features Implementation Roadmap

## Executive Summary

This document outlines a phased approach to implementing 5 advanced governance features into Decivue, building on the current schema and ensuring all features integrate seamlessly.

**Current Schema Strengths:**

- ✅ Multi-tenant organization structure
- ✅ Decisions, assumptions, constraints already modeled
- ✅ Assumption conflicts detection (just implemented)
- ✅ Evaluation history audit trail
- ✅ Decision tensions table (foundation for contradictions)
- ✅ Dependencies tracking

---

## Phase 1: Decision Versioning Foundation (Week 1-2)

**Priority: HIGH - Foundation for all other features**

### 1.1 Database Schema Changes

**Migration 014: Decision Versioning**

```sql
-- =====================================================
-- DECISION VERSIONING SYSTEM
-- =====================================================

-- Version history table
CREATE TABLE decision_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot of decision state
  title TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL,
  health_signal INTEGER NOT NULL,

  -- What changed
  change_summary TEXT NOT NULL, -- Required: what was changed and why
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN ('CREATED', 'ASSUMPTION_CHANGE', 'METADATA_UPDATE', 'LIFECYCLE_CHANGE', 'GOVERNANCE_REVIEW')) NOT NULL,

  -- Version metadata
  assumptions_snapshot JSONB, -- IDs and states at this version
  constraints_snapshot JSONB,
  metadata_snapshot JSONB,
  confidence_at_version DECIMAL(5,2), -- Derived from health_signal

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(decision_id, version_number)
);

CREATE INDEX idx_decision_versions_decision ON decision_versions(decision_id, version_number DESC);
CREATE INDEX idx_decision_versions_date ON decision_versions(created_at DESC);

-- Add version tracking to decisions table
ALTER TABLE decisions
  ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN version_lock BOOLEAN DEFAULT FALSE, -- For governance mode
  ADD COLUMN version_lock_reason TEXT;

-- Confidence history tracking
CREATE TABLE decision_confidence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER,
  confidence_score DECIMAL(5,2) NOT NULL,
  contributing_factors JSONB NOT NULL, -- What influenced this score
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confidence_history_decision ON decision_confidence_history(decision_id, recorded_at DESC);
```

### 1.2 Backend Services

**Create: `backend/src/services/decision-versioning-service.ts`**

```typescript
export class DecisionVersioningService {
  // Create new version when decision changes
  async createVersion(
    decisionId: string,
    changeSummary: string,
    changeType: VersionChangeType,
    userId: string,
  ): Promise<DecisionVersion> {
    // 1. Get current decision state
    // 2. Increment version number
    // 3. Snapshot assumptions, constraints, metadata
    // 4. Calculate confidence score
    // 5. Insert version record
    // 6. Update decision.current_version
    // 7. Record confidence history
  }

  // Compare two versions
  async compareVersions(
    decisionId: string,
    versionA: number,
    versionB: number,
  ): Promise<VersionComparison> {
    // Return structured diff:
    // - Changed assumptions
    // - Confidence delta
    // - Metadata changes
    // - Lifecycle transitions
  }

  // Get version at specific point in time
  async getVersionAtDate(
    decisionId: string,
    date: Date,
  ): Promise<DecisionVersion> {
    // Find closest version before date
  }

  // Check if confidence dropped after revision
  async detectConfidenceDrop(
    decisionId: string,
    thresholdPercent: number = 15,
  ): Promise<boolean> {
    // Compare last 2 versions
    // Flag if drop > threshold
  }
}
```

**API Routes: `backend/src/api/routes/decision-versions.ts`**

```typescript
// GET /api/decisions/:id/versions
// GET /api/decisions/:id/versions/compare?from=1&to=3
// GET /api/decisions/:id/versions/confidence-trend
// POST /api/decisions/:id/versions (create new version)
```

### 1.3 Integration Points

- **Assumption Changes** → Auto-create version + update confidence
- **Governance Lock** → Require version entry before allowing edit
- **Review System** → Show version diff during review

---

## Phase 2: Decision Comments & Review Threading (Week 3)

**Priority: HIGH - Enables governance workflow**

### 2.1 Database Schema

**Migration 015: Review Threading**

```sql
-- =====================================================
-- DECISION REVIEW SYSTEM
-- =====================================================

CREATE TABLE decision_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL, -- Which version was reviewed

  -- Review metadata
  reviewer_id UUID NOT NULL REFERENCES auth.users(id),
  review_outcome TEXT CHECK (review_outcome IN ('REAFFIRMED', 'REVISED', 'ESCALATED', 'DEFERRED')) NOT NULL,

  -- Review content
  review_notes TEXT NOT NULL,
  concerns TEXT[], -- Structured concerns
  recommendations TEXT[],

  -- Outcome tracking
  confidence_after_review DECIMAL(5,2),
  urgency_score_before DECIMAL(5,2),
  urgency_score_after DECIMAL(5,2),

  -- Timestamps
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_review_date TIMESTAMPTZ, -- Can be auto-calculated or manual

  -- Threading support
  parent_review_id UUID REFERENCES decision_reviews(id), -- For escalations

  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_decision_reviews_decision ON decision_reviews(decision_id, reviewed_at DESC);
CREATE INDEX idx_decision_reviews_outcome ON decision_reviews(review_outcome);
CREATE INDEX idx_decision_reviews_next_date ON decision_reviews(next_review_date);

-- Review comments (threaded)
CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES decision_reviews(id) ON DELETE CASCADE,
  commenter_id UUID NOT NULL REFERENCES auth.users(id),
  comment_text TEXT NOT NULL,
  comment_type TEXT CHECK (comment_type IN ('QUESTION', 'CONCERN', 'APPROVAL', 'OBJECTION', 'SUGGESTION')),
  parent_comment_id UUID REFERENCES review_comments(id), -- Threading
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_at TIMESTAMPTZ
);

CREATE INDEX idx_review_comments_review ON review_comments(review_id, created_at);
CREATE INDEX idx_review_comments_parent ON review_comments(parent_comment_id);

-- Review neglect detection
CREATE TABLE review_postponement_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  scheduled_date TIMESTAMPTZ NOT NULL,
  postponed_date TIMESTAMPTZ NOT NULL,
  postponed_by UUID NOT NULL REFERENCES auth.users(id),
  postponement_reason TEXT NOT NULL,
  postponement_count INTEGER DEFAULT 1, -- How many times postponed
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_postponements ON review_postponement_tracking(decision_id);
```

### 2.2 Backend Services

**Create: `backend/src/services/review-threading-service.ts`**

```typescript
export class ReviewThreadingService {
  async createReview(params: {
    decisionId: string;
    reviewerId: string;
    outcome: ReviewOutcome;
    notes: string;
    concerns?: string[];
    recommendations?: string[];
  }): Promise<DecisionReview> {
    // 1. Get current decision version
    // 2. Calculate urgency scores (before/after)
    // 3. Create review record
    // 4. Update decision.last_reviewed_at
    // 5. If REVISED: trigger version creation
    // 6. If ESCALATED: notify governance team
    // 7. Calculate next review date (Phase 4)
  }

  async addComment(
    reviewId: string,
    commenterId: string,
    text: string,
    type: CommentType,
    parentId?: string,
  ): Promise<ReviewComment> {
    // Threaded comment support
  }

  async detectShallowReview(reviewId: string): Promise<boolean> {
    // Heuristics:
    // - Notes too short (< 50 chars)
    // - No concerns/recommendations
    // - Review duration < 2 minutes
    // - Same reviewer, same outcome repeatedly
  }

  async getReviewHistory(decisionId: string): Promise<{
    reviews: DecisionReview[];
    postponementCount: number;
    averageReviewQuality: number;
  }> {
    // Full audit trail
  }
}
```

**API Routes: `backend/src/api/routes/decision-reviews.ts`**

```typescript
// POST /api/decisions/:id/reviews
// GET /api/decisions/:id/reviews
// POST /api/reviews/:reviewId/comments
// GET /api/reviews/:reviewId/thread
// POST /api/decisions/:id/reviews/postpone
```

---

## Phase 3: Contradiction Engine (Week 4-5)

**Priority: CRITICAL - Core differentiator**

### 3.1 Database Schema

**Extend existing `decision_tensions` table:**

```sql
-- Migration 016: Enhanced Contradiction Detection

ALTER TABLE decision_tensions
  ADD COLUMN conflict_type TEXT CHECK (conflict_type IN (
    'MUTUALLY_EXCLUSIVE_ASSUMPTIONS',
    'RESOURCE_COMPETITION',
    'OBJECTIVE_UNDERMINING',
    'PREMISE_INVALIDATION',
    'TIMELINE_CONFLICT',
    'BUDGET_CONFLICT'
  )),
  ADD COLUMN explanation TEXT NOT NULL, -- Natural language explanation
  ADD COLUMN affected_aspect TEXT, -- What aspect conflicts
  ADD COLUMN confidence_score DECIMAL(5,2), -- How confident in detection
  ADD COLUMN auto_detected BOOLEAN DEFAULT TRUE,
  ADD COLUMN detection_timestamp TIMESTAMPTZ DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX idx_tensions_unresolved_type ON decision_tensions(conflict_type, resolved_at)
  WHERE resolved_at IS NULL;

-- Semantic conflict cache (for performance)
CREATE TABLE decision_semantic_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  semantic_embedding vector(1536), -- For semantic search (pgvector)
  keywords TEXT[],
  objectives TEXT[],
  resources_mentioned TEXT[],
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(decision_id)
);

CREATE INDEX idx_semantic_cache_decision ON decision_semantic_cache(decision_id);
```

### 3.2 Backend Services

**Create: `backend/src/services/contradiction-detector.ts`**

```typescript
export class ContradictionDetector {
  // Main detection orchestrator
  async detectAllContradictions(
    organizationId: string,
  ): Promise<Contradiction[]> {
    const decisions = await this.getActiveDecisions(organizationId);
    const contradictions: Contradiction[] = [];

    // Check all pairs
    for (let i = 0; i < decisions.length; i++) {
      for (let j = i + 1; j < decisions.length; j++) {
        const conflict = await this.detectPairwiseContradiction(
          decisions[i],
          decisions[j],
        );
        if (conflict) contradictions.push(conflict);
      }
    }

    return contradictions;
  }

  // Strategy 1: Mutually Exclusive Assumptions
  async checkMutuallyExclusiveAssumptions(
    decisionA: Decision,
    decisionB: Decision,
  ): Promise<Contradiction | null> {
    // Get assumption conflicts
    const conflictingAssumptions = await this.db
      .from("assumption_conflicts")
      .select("*")
      .or(
        `assumption_a_id.in.(${decisionA.assumptionIds}),assumption_b_id.in.(${decisionB.assumptionIds})`,
      );

    if (conflictingAssumptions.length > 0) {
      return {
        type: "MUTUALLY_EXCLUSIVE_ASSUMPTIONS",
        explanation: `Decision "${decisionA.title}" relies on assumption "${assumpA.text}" while decision "${decisionB.title}" relies on the contradictory assumption "${assumpB.text}". These assumptions cannot both be true.`,
        affectedAspect: "assumptions",
        confidence: 0.95,
        decisions: [decisionA.id, decisionB.id],
        evidence: conflictingAssumptions,
      };
    }
    return null;
  }

  // Strategy 2: Resource Competition
  async checkResourceCompetition(
    decisionA: Decision,
    decisionB: Decision,
  ): Promise<Contradiction | null> {
    // Extract resource requirements from metadata/assumptions
    const resourcesA = this.extractResourceRequirements(decisionA);
    const resourcesB = this.extractResourceRequirements(decisionB);

    // Check for overlapping constrained resources
    const conflicts = this.findResourceConflicts(resourcesA, resourcesB);

    if (conflicts.length > 0) {
      return {
        type: "RESOURCE_COMPETITION",
        explanation: `Both "${decisionA.title}" and "${decisionB.title}" require ${conflicts[0].resource} (${conflicts[0].amountA} and ${conflicts[0].amountB} respectively), but only ${conflicts[0].available} is available.`,
        affectedAspect: "resources",
        confidence: 0.88,
        decisions: [decisionA.id, decisionB.id],
        evidence: conflicts,
      };
    }
    return null;
  }

  // Strategy 3: Objective Undermining (Semantic)
  async checkObjectiveUndermining(
    decisionA: Decision,
    decisionB: Decision,
  ): Promise<Contradiction | null> {
    // Use semantic analysis
    const objectivesA = await this.extractObjectives(decisionA);
    const objectivesB = await this.extractObjectives(decisionB);

    // Check for contradictory keywords
    const contradictoryPairs = [
      ["reduce spending", "hire more"],
      ["minimize cost", "expand operations"],
      ["consolidate", "diversify"],
      ["centralize", "decentralize"],
    ];

    for (const [phraseA, phraseB] of contradictoryPairs) {
      if (
        this.containsPhrase(objectivesA, phraseA) &&
        this.containsPhrase(objectivesB, phraseB)
      ) {
        return {
          type: "OBJECTIVE_UNDERMINING",
          explanation: `Decision "${decisionA.title}" aims to ${phraseA}, while "${decisionB.title}" aims to ${phraseB}. These objectives work against each other.`,
          affectedAspect: "objectives",
          confidence: 0.82,
          decisions: [decisionA.id, decisionB.id],
        };
      }
    }

    // Use AI for deeper semantic analysis (optional)
    return this.semanticContradictionCheck(decisionA, decisionB);
  }

  // Strategy 4: Premise Invalidation (Temporal)
  async checkPremiseInvalidation(
    newerDecision: Decision,
    olderDecision: Decision,
  ): Promise<Contradiction | null> {
    // Check if newer decision invalidates assumptions of older one
    const olderAssumptions = await this.getDecisionAssumptions(
      olderDecision.id,
    );
    const newerOutcomes = this.extractExpectedOutcomes(newerDecision);

    for (const assumption of olderAssumptions) {
      if (this.invalidatesAssumption(newerOutcomes, assumption)) {
        return {
          type: "PREMISE_INVALIDATION",
          explanation: `The newer decision "${newerDecision.title}" (created ${this.formatDate(newerDecision.created_at)}) will ${newerOutcomes[0]}, which invalidates the assumption "${assumption.description}" that "${olderDecision.title}" depends on.`,
          affectedAspect: "premise",
          confidence: 0.78,
          decisions: [olderDecision.id, newerDecision.id],
          chronology: true,
        };
      }
    }
    return null;
  }

  // Generate natural language explanation
  private generateExplanation(contradiction: Contradiction): string {
    // Follow template:
    // 1. Which decisions involved
    // 2. What aspect conflicts
    // 3. Why this is inconsistent
    // NO raw data dumps!

    return `
      Decisions Involved: "${contradiction.decisionA.title}" and "${contradiction.decisionB.title}"
      
      Conflict Type: ${this.humanReadableType(contradiction.type)}
      
      What Conflicts: ${contradiction.affectedAspect}
      
      Explanation:
      ${contradiction.explanation}
      
      Recommended Action: ${this.getRecommendation(contradiction)}
    `;
  }
}
```

**API Routes: `backend/src/api/routes/contradictions.ts`**

```typescript
// POST /api/contradictions/detect (run detection)
// GET /api/contradictions (list all)
// GET /api/decisions/:id/contradictions
// PUT /api/contradictions/:id/resolve
// GET /api/contradictions/:id/explanation (formatted)
```

### 3.3 Background Job

**Create: `backend/src/jobs/contradiction-detection-job.ts`**

```typescript
// Run every 4 hours or on-demand
export async function runContradictionDetection() {
  const detector = new ContradictionDetector();
  const organizations = await getActiveOrganizations();

  for (const org of organizations) {
    const contradictions = await detector.detectAllContradictions(org.id);

    // Store in decision_tensions table
    for (const c of contradictions) {
      await insertOrUpdateTension(c);
    }

    // Notify stakeholders
    if (contradictions.length > 0) {
      await notifyContradictions(org, contradictions);
    }
  }
}
```

---

## Phase 4: Adaptive Review Intelligence (Week 6)

**Priority: HIGH - Automation enabler**

### 4.1 Database Schema

**Migration 017: Review Intelligence**

```sql
-- =====================================================
-- ADAPTIVE REVIEW INTELLIGENCE
-- =====================================================

CREATE TABLE decision_review_urgency (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,

  -- Urgency scoring
  urgency_score DECIMAL(5,2) NOT NULL CHECK (urgency_score BETWEEN 0 AND 100),

  -- Contributing factors (transparent calculation)
  risk_level_score DECIMAL(5,2),
  confidence_trend_score DECIMAL(5,2),
  assumption_age_score DECIMAL(5,2),
  contradiction_score DECIMAL(5,2),
  postponement_penalty_score DECIMAL(5,2),

  -- Calculated review schedule
  next_review_date TIMESTAMPTZ NOT NULL,
  review_frequency_days INTEGER, -- Dynamic: 7, 14, 30, 60, 90, 180

  -- Escalation tracking
  escalation_level INTEGER DEFAULT 0 CHECK (escalation_level BETWEEN 0 AND 3),
  -- 0: Normal, 1: Reminder, 2: High Priority, 3: Governance Risk
  last_escalated_at TIMESTAMPTZ,

  -- Metadata
  calculation_details JSONB NOT NULL, -- Full transparency on how score was derived
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(decision_id)
);

CREATE INDEX idx_review_urgency_score ON decision_review_urgency(urgency_score DESC);
CREATE INDEX idx_review_urgency_next_date ON decision_review_urgency(next_review_date);
CREATE INDEX idx_review_urgency_escalation ON decision_review_urgency(escalation_level)
  WHERE escalation_level > 0;

-- Decision stability tracking
CREATE TABLE decision_stability_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,

  -- Stability indicators
  assumption_volatility DECIMAL(5,2), -- How often assumptions change
  confidence_volatility DECIMAL(5,2), -- How much confidence fluctuates
  contradiction_count INTEGER DEFAULT 0,
  days_since_last_change INTEGER,
  version_count INTEGER,

  -- Trend
  stability_trend TEXT CHECK (stability_trend IN ('IMPROVING', 'STABLE', 'DECLINING')),

  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stability_decision ON decision_stability_metrics(decision_id, recorded_at DESC);
```

### 4.2 Backend Services

**Create: `backend/src/services/review-intelligence-service.ts`**

```typescript
export class ReviewIntelligenceService {
  async calculateUrgencyScore(decisionId: string): Promise<UrgencyScore> {
    const decision = await this.getDecision(decisionId);

    // Factor 1: Risk Level (0-25 points)
    const riskScore = this.calculateRiskScore(decision);

    // Factor 2: Confidence Trend (0-25 points)
    const confidenceTrendScore =
      await this.calculateConfidenceTrend(decisionId);

    // Factor 3: Assumption Age (0-20 points)
    const assumptionAgeScore = await this.calculateAssumptionAge(decisionId);

    // Factor 4: Contradictions (0-20 points)
    const contradictionScore =
      await this.calculateContradictionImpact(decisionId);

    // Factor 5: Postponement Penalty (0-10 points)
    const postponementScore =
      await this.calculatePostponementPenalty(decisionId);

    const totalScore =
      riskScore +
      confidenceTrendScore +
      assumptionAgeScore +
      contradictionScore +
      postponementScore;

    return {
      urgencyScore: totalScore,
      breakdown: {
        risk: riskScore,
        confidenceTrend: confidenceTrendScore,
        assumptionAge: assumptionAgeScore,
        contradictions: contradictionScore,
        postponements: postponementScore,
      },
      calculationDetails: this.generateCalculationExplanation(/* ... */),
      recommendedReviewDate: this.calculateNextReviewDate(totalScore, decision),
    };
  }

  private calculateNextReviewDate(
    urgencyScore: number,
    decision: Decision,
  ): Date {
    let daysUntilReview: number;

    if (urgencyScore >= 80) {
      daysUntilReview = 7; // Weekly
    } else if (urgencyScore >= 60) {
      daysUntilReview = 14; // Bi-weekly
    } else if (urgencyScore >= 40) {
      daysUntilReview = 30; // Monthly
    } else if (urgencyScore >= 20) {
      daysUntilReview = 60; // Bi-monthly
    } else {
      daysUntilReview = 90; // Quarterly
    }

    // Adjust based on lifecycle
    if (decision.lifecycle === "AT_RISK") {
      daysUntilReview = Math.floor(daysUntilReview / 2);
    }

    return addDays(new Date(), daysUntilReview);
  }

  async recalculateOnStabilityChange(decisionId: string): Promise<void> {
    // Triggered when:
    // - Assumption changes
    // - New contradiction detected
    // - Confidence drops
    // - Version created

    const newScore = await this.calculateUrgencyScore(decisionId);
    await this.updateUrgencyRecord(decisionId, newScore);

    // If urgency jumped significantly, notify
    const oldScore = await this.getPreviousScore(decisionId);
    if (newScore.urgencyScore - oldScore > 15) {
      await this.notifyUrgencyIncrease(decisionId, newScore);
    }
  }

  async detectReviewNeglect(
    decisionId: string,
  ): Promise<ReviewNeglectAlert | null> {
    const postponements = await this.getPostponementHistory(decisionId);
    const recentReviews = await this.getRecentReviews(decisionId, 3);

    // Pattern 1: Too many postponements
    if (postponements.length >= 3) {
      return {
        type: "REPEATED_POSTPONEMENT",
        severity: "HIGH",
        message: `Decision has been postponed ${postponements.length} times. Review may be avoided.`,
      };
    }

    // Pattern 2: Shallow reviews
    const shallowCount = recentReviews.filter(
      (r) =>
        r.notes.length < 50 &&
        !r.concerns?.length &&
        !r.recommendations?.length,
    ).length;

    if (shallowCount >= 2) {
      return {
        type: "SHALLOW_REVIEW",
        severity: "MEDIUM",
        message: `Last ${shallowCount} reviews lacked depth. Consider more thorough analysis.`,
      };
    }

    return null;
  }

  async escalateOverdueDecision(decisionId: string): Promise<void> {
    const urgency = await this.getUrgencyRecord(decisionId);
    const daysSinceReview = this.getDaysSince(urgency.next_review_date);

    let newLevel = urgency.escalation_level;

    if (daysSinceReview > 30) {
      newLevel = 3; // GOVERNANCE_RISK
    } else if (daysSinceReview > 14) {
      newLevel = 2; // HIGH_PRIORITY
    } else if (daysSinceReview > 7) {
      newLevel = 1; // REMINDER
    }

    if (newLevel > urgency.escalation_level) {
      await this.updateEscalationLevel(decisionId, newLevel);
      await this.sendEscalationNotification(decisionId, newLevel);
    }
  }
}
```

**API Routes: `backend/src/api/routes/review-intelligence.ts`**

```typescript
// GET /api/decisions/:id/review-urgency
// POST /api/decisions/:id/review-urgency/recalculate
// GET /api/review-intelligence/overdue
// GET /api/review-intelligence/dashboard
// GET /api/decisions/:id/stability-trend
```

### 4.3 Background Jobs

```typescript
// Run every 6 hours
export async function recalculateAllUrgencyScores() {
  const decisions = await getAllActiveDecisions();
  for (const decision of decisions) {
    await reviewIntelligence.calculateUrgencyScore(decision.id);
  }
}

// Run daily
export async function escalateOverdueReviews() {
  const overdue = await getOverdueReviews();
  for (const decision of overdue) {
    await reviewIntelligence.escalateOverdueDecision(decision.id);
  }
}
```

---

## Phase 5: Governance Mode (Week 7)

**Priority: MEDIUM - Enterprise feature**

### 5.1 Database Schema

**Migration 018: Governance Controls**

```sql
-- =====================================================
-- GOVERNANCE MODE
-- =====================================================

-- Governance policies per organization
CREATE TABLE governance_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Policy configuration
  require_justification_for_edits BOOLEAN DEFAULT FALSE,
  require_second_reviewer BOOLEAN DEFAULT FALSE,
  minimum_review_interval_days INTEGER DEFAULT 30,

  -- High-impact thresholds
  high_impact_budget_threshold DECIMAL,
  high_impact_headcount_threshold INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Decision governance settings
CREATE TABLE decision_governance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,

  -- Governance flags
  is_high_impact BOOLEAN DEFAULT FALSE,
  governance_level TEXT CHECK (governance_level IN ('STANDARD', 'ELEVATED', 'CRITICAL')) DEFAULT 'STANDARD',

  -- Lock controls
  is_locked BOOLEAN DEFAULT FALSE,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMPTZ,
  lock_reason TEXT,

  -- Approval requirements
  requires_dual_approval BOOLEAN DEFAULT FALSE,
  approvers UUID[], -- Array of user IDs who can approve

  -- Audit configuration
  audit_level TEXT CHECK (audit_level IN ('BASIC', 'DETAILED', 'FORENSIC')) DEFAULT 'BASIC',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(decision_id)
);

CREATE INDEX idx_governance_high_impact ON decision_governance(is_high_impact) WHERE is_high_impact = TRUE;
CREATE INDEX idx_governance_locked ON decision_governance(is_locked) WHERE is_locked = TRUE;

-- Governance audit log (detailed tracking)
CREATE TABLE governance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,

  -- Action details
  action_type TEXT CHECK (action_type IN (
    'EDIT_ATTEMPTED',
    'EDIT_APPROVED',
    'EDIT_REJECTED',
    'LOCK_APPLIED',
    'LOCK_REMOVED',
    'GOVERNANCE_OVERRIDE',
    'SECOND_REVIEW_COMPLETED',
    'POLICY_VIOLATION'
  )) NOT NULL,

  -- Who did what
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  approver_id UUID REFERENCES auth.users(id),

  -- Context
  justification TEXT,
  before_state JSONB,
  after_state JSONB,
  violation_details TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_governance_audit_decision ON governance_audit_log(decision_id, created_at DESC);
CREATE INDEX idx_governance_audit_action ON governance_audit_log(action_type);
CREATE INDEX idx_governance_audit_actor ON governance_audit_log(actor_id);

-- Second reviewer tracking
CREATE TABLE decision_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Approval flow
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_status TEXT CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')) NOT NULL,

  -- Details
  change_summary TEXT NOT NULL,
  approver_notes TEXT,

  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX idx_approvals_decision ON decision_approvals(decision_id, approval_status);
CREATE INDEX idx_approvals_pending ON decision_approvals(approver_id, approval_status)
  WHERE approval_status = 'PENDING';
```

### 5.2 Backend Services

**Create: `backend/src/services/governance-service.ts`**

```typescript
export class GovernanceService {
  async canEditDecision(
    decisionId: string,
    userId: string,
    proposedChanges: any,
  ): Promise<GovernanceCheckResult> {
    const governance = await this.getDecisionGovernance(decisionId);
    const policy = await this.getOrganizationPolicy(decisionId);

    // Check 1: Is decision locked?
    if (governance.is_locked) {
      return {
        allowed: false,
        reason: "Decision is locked",
        lockReason: governance.lock_reason,
        requiresOverride: true,
      };
    }

    // Check 2: Is it high-impact?
    if (
      governance.is_high_impact ||
      this.isHighImpactChange(proposedChanges, policy)
    ) {
      if (
        policy.require_justification_for_edits &&
        !proposedChanges.justification
      ) {
        return {
          allowed: false,
          reason: "Justification required for high-impact decisions",
          requiresJustification: true,
        };
      }

      if (policy.require_second_reviewer) {
        return {
          allowed: false,
          reason: "Second reviewer approval required",
          requiresApproval: true,
          approvers: governance.approvers,
        };
      }
    }

    return { allowed: true };
  }

  async requestApproval(
    decisionId: string,
    requesterId: string,
    changeSummary: string,
    approverId: string,
  ): Promise<DecisionApproval> {
    const version = await this.getCurrentVersion(decisionId);

    const approval = await this.db
      .from("decision_approvals")
      .insert({
        decision_id: decisionId,
        version_number: version + 1,
        requested_by: requesterId,
        approver_id: approverId,
        approval_status: "PENDING",
        change_summary: changeSummary,
      })
      .select()
      .single();

    // Notify approver
    await this.notifyApprovalRequest(approverId, decisionId, changeSummary);

    return approval;
  }

  async lockDecision(
    decisionId: string,
    userId: string,
    reason: string,
  ): Promise<void> {
    await this.db.from("decision_governance").upsert({
      decision_id: decisionId,
      is_locked: true,
      locked_by: userId,
      locked_at: new Date(),
      lock_reason: reason,
    });

    // Audit log
    await this.logGovernanceAction({
      decision_id: decisionId,
      action_type: "LOCK_APPLIED",
      actor_id: userId,
      justification: reason,
    });
  }

  async logEditAttempt(
    decisionId: string,
    userId: string,
    changes: any,
    wasAllowed: boolean,
  ): Promise<void> {
    await this.db.from("governance_audit_log").insert({
      decision_id: decisionId,
      action_type: wasAllowed ? "EDIT_APPROVED" : "EDIT_ATTEMPTED",
      actor_id: userId,
      before_state: changes.before,
      after_state: changes.after,
      justification: changes.justification,
    });
  }

  private isHighImpactChange(changes: any, policy: GovernancePolicy): boolean {
    // Determine if change is high-impact based on:
    // - Budget thresholds
    // - Headcount changes
    // - Critical assumption changes
    // - Lifecycle state changes

    if (
      changes.budgetImpact &&
      changes.budgetImpact > policy.high_impact_budget_threshold
    ) {
      return true;
    }

    if (
      changes.headcountChange &&
      Math.abs(changes.headcountChange) > policy.high_impact_headcount_threshold
    ) {
      return true;
    }

    if (
      changes.lifecycleChange &&
      ["AT_RISK", "INVALIDATED"].includes(changes.newLifecycle)
    ) {
      return true;
    }

    return false;
  }
}
```

**Middleware: `backend/src/middleware/governance-middleware.ts`**

```typescript
export function governanceCheck() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (
      req.method === "PUT" ||
      req.method === "PATCH" ||
      req.method === "DELETE"
    ) {
      const decisionId = req.params.id;
      const userId = req.user.id;

      const check = await governanceService.canEditDecision(
        decisionId,
        userId,
        req.body,
      );

      if (!check.allowed) {
        return res.status(403).json({
          error: "Governance policy violation",
          reason: check.reason,
          requiresJustification: check.requiresJustification,
          requiresApproval: check.requiresApproval,
          approvers: check.approvers,
        });
      }

      // Log the attempt
      await governanceService.logEditAttempt(
        decisionId,
        userId,
        req.body,
        true,
      );
    }

    next();
  };
}

// Apply to decision routes
router.put("/decisions/:id", governanceCheck(), updateDecision);
```

**API Routes: `backend/src/api/routes/governance.ts`**

```typescript
// POST /api/decisions/:id/governance/lock
// DELETE /api/decisions/:id/governance/lock
// POST /api/decisions/:id/governance/request-approval
// PUT /api/approvals/:id/respond
// GET /api/governance/audit-log/:decisionId
// GET /api/governance/pending-approvals
// PUT /api/governance/policies (update org policy)
```

---

## Phase 6: Integration & Cross-Feature Workflows (Week 8)

### 6.1 Integration Points

**Create: `backend/src/services/integration-orchestrator.ts`**

```typescript
export class IntegrationOrchestrator {
  // When assumption changes
  async onAssumptionChange(
    assumptionId: string,
    oldStatus: string,
    newStatus: string,
  ) {
    // 1. Find all affected decisions
    const decisions = await this.getDecisionsUsingAssumption(assumptionId);

    for (const decision of decisions) {
      // 2. Create version (Phase 1)
      await versioningService.createVersion(
        decision.id,
        `Assumption changed: ${oldStatus} → ${newStatus}`,
        "ASSUMPTION_CHANGE",
        "SYSTEM",
      );

      // 3. Update confidence (Phase 1)
      if (newStatus === "BROKEN") {
        await this.decreaseConfidence(decision.id, 30);
      } else if (newStatus === "SHAKY") {
        await this.decreaseConfidence(decision.id, 15);
      }

      // 4. Recalculate review urgency (Phase 4)
      await reviewIntelligence.recalculateOnStabilityChange(decision.id);

      // 5. Re-run contradiction detection (Phase 3)
      await contradictionDetector.detectForDecision(decision.id);
    }
  }

  // When contradiction detected
  async onContradictionDetected(contradiction: Contradiction) {
    for (const decisionId of contradiction.decisionIds) {
      // 1. Increase review urgency (Phase 4)
      await this.incrementUrgencyScore(
        decisionId,
        15,
        "contradiction_detected",
      );

      // 2. Create notification
      await notificationService.create({
        type: "CONTRADICTION_DETECTED",
        decisionId,
        message: contradiction.explanation,
      });

      // 3. If high-impact decision, trigger governance alert (Phase 5)
      const governance = await this.getGovernance(decisionId);
      if (governance.is_high_impact) {
        await this.sendGovernanceAlert(decisionId, contradiction);
      }
    }
  }

  // When version created
  async onVersionCreated(versionId: string, decisionId: string) {
    const version = await this.getVersion(versionId);
    const previousVersion = await this.getPreviousVersion(decisionId);

    // 1. Update confidence history (Phase 1)
    await confidenceService.recordSnapshot(decisionId, version.version_number);

    // 2. Check for confidence drop (Phase 1)
    if (previousVersion) {
      const drop =
        previousVersion.confidence_at_version - version.confidence_at_version;
      if (drop > 15) {
        // Increase review urgency (Phase 4)
        await reviewIntelligence.recalculateOnStabilityChange(decisionId);

        // Notify stakeholders
        await this.notifyConfidenceDrop(decisionId, drop);
      }
    }

    // 3. If governance locked, verify justification exists (Phase 5)
    const governance = await this.getGovernance(decisionId);
    if (governance.is_locked && !version.change_summary) {
      throw new Error("Governance lock violation: justification required");
    }
  }

  // When review completed
  async onReviewCompleted(reviewId: string) {
    const review = await this.getReview(reviewId);

    // 1. Reset urgency score (Phase 4)
    await reviewIntelligence.resetUrgencyAfterReview(review.decision_id);

    // 2. If outcome is REVISED, create version (Phase 1)
    if (review.review_outcome === "REVISED") {
      await versioningService.createVersion(
        review.decision_id,
        review.review_notes,
        "GOVERNANCE_REVIEW",
        review.reviewer_id,
      );
    }

    // 3. If outcome is ESCALATED, trigger governance flow (Phase 5)
    if (review.review_outcome === "ESCALATED") {
      await governanceService.escalateToGovernanceTeam(
        review.decision_id,
        review,
      );
    }

    // 4. Update decision.last_reviewed_at
    await this.updateLastReviewedAt(review.decision_id);
  }
}
```

### 6.2 Event System

**Create: `backend/src/events/event-bus.ts`**

```typescript
export const eventBus = new EventEmitter();

// Event types
export enum DecivueEvent {
  ASSUMPTION_CHANGED = "assumption:changed",
  CONTRADICTION_DETECTED = "contradiction:detected",
  VERSION_CREATED = "version:created",
  REVIEW_COMPLETED = "review:completed",
  CONFIDENCE_DROPPED = "confidence:dropped",
  GOVERNANCE_VIOLATION = "governance:violation",
  REVIEW_OVERDUE = "review:overdue",
}

// Event handlers
eventBus.on(DecivueEvent.ASSUMPTION_CHANGED, async (data) => {
  await integrationOrchestrator.onAssumptionChange(
    data.assumptionId,
    data.oldStatus,
    data.newStatus,
  );
});

eventBus.on(DecivueEvent.CONTRADICTION_DETECTED, async (data) => {
  await integrationOrchestrator.onContradictionDetected(data.contradiction);
});

eventBus.on(DecivueEvent.VERSION_CREATED, async (data) => {
  await integrationOrchestrator.onVersionCreated(
    data.versionId,
    data.decisionId,
  );
});

eventBus.on(DecivueEvent.REVIEW_COMPLETED, async (data) => {
  await integrationOrchestrator.onReviewCompleted(data.reviewId);
});
```

---

## Implementation Checklist

### Week 1-2: Decision Versioning

- [ ] Create migration 014
- [ ] Build `DecisionVersioningService`
- [ ] Add API routes for versions
- [ ] Update decision edit flow to create versions
- [ ] Build version comparison UI
- [ ] Test confidence drop detection

### Week 3: Review Threading

- [ ] Create migration 015
- [ ] Build `ReviewThreadingService`
- [ ] Add review UI components
- [ ] Implement comment threading
- [ ] Test postponement tracking

### Week 4-5: Contradiction Engine

- [ ] Create migration 016
- [ ] Build `ContradictionDetector` with all 4 strategies
- [ ] Add background job for detection
- [ ] Build natural language explanation generator
- [ ] Create contradiction UI
- [ ] Test detection accuracy

### Week 6: Review Intelligence

- [ ] Create migration 017
- [ ] Build `ReviewIntelligenceService`
- [ ] Implement urgency scoring algorithm
- [ ] Build escalation system
- [ ] Create review dashboard UI
- [ ] Test dynamic scheduling

### Week 7: Governance Mode

- [ ] Create migration 018
- [ ] Build `GovernanceService`
- [ ] Add governance middleware
- [ ] Build approval workflow
- [ ] Create audit log viewer
- [ ] Test lock controls

### Week 8: Integration

- [ ] Build `IntegrationOrchestrator`
- [ ] Implement event bus
- [ ] Wire up all integration points
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Documentation

---

## Testing Strategy

### Unit Tests

- Each service method
- Contradiction detection algorithms
- Urgency score calculations
- Governance policy checks

### Integration Tests

- Assumption change → Version + Urgency update
- Contradiction → Urgency increase
- Review completion → Reset urgency
- Governance lock → Block edits

### E2E Tests

- Full review workflow
- Contradiction detection and resolution
- Approval flow
- Audit trail verification

---

## Performance Considerations

1. **Contradiction Detection**: Run as background job, cache semantic embeddings
2. **Urgency Calculations**: Batch recalculate, not on every request
3. **Version Storage**: Consider archiving old versions after 2 years
4. **Audit Logs**: Partition by date for query performance

---

## Migration Safety

- All migrations are backwards compatible
- Use `IF NOT EXISTS` clauses
- Add columns with defaults
- No data deletion
- Rollback scripts provided

---

## Estimated Timeline

- **Phase 1**: 2 weeks
- **Phase 2**: 1 week
- **Phase 3**: 2 weeks
- **Phase 4**: 1 week
- **Phase 5**: 1 week
- **Phase 6**: 1 week

**Total**: ~8 weeks of focused development

---

## Success Metrics

- Contradictions detected with >85% accuracy
- Review urgency correctly prioritizes high-risk decisions
- Version diff shows all changes clearly
- Governance locks prevent unauthorized edits
- Zero data loss during transitions
