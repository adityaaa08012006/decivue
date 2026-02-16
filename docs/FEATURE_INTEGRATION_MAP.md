# Feature Integration Map

## How All Features Work Together

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DECISION CHANGED                             │
│                     (Assumption/Metadata/Lifecycle)                 │
└────────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   1. VERSIONING (Phase 1)         │
        │   - Create new version            │
        │   - Snapshot state                │
        │   - Record confidence             │
        └───────────┬───────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────┐
        │   2. CONTRADICTION CHECK (Phase 3)│
        │   - Re-run detection              │
        │   - Generate explanations         │
        │   - Flag conflicts                │
        └───────────┬───────────────────────┘
                    │
                    ├─── If Contradiction Detected ──┐
                    │                                 │
                    ▼                                 ▼
        ┌───────────────────────────────┐   ┌────────────────────────┐
        │   3. CONFIDENCE UPDATE        │   │  NOTIFY STAKEHOLDERS  │
        │   - Calculate new score       │   │  - Email alert        │
        │   - Detect drops              │   │  - In-app notification│
        └───────────┬───────────────────┘   └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────┐
        │   4. REVIEW URGENCY (Phase 4)     │
        │   - Recalculate urgency score     │
        │   - Adjust next review date       │
        │   - Update escalation level       │
        └───────────┬───────────────────────┘
                    │
                    ├─── If High Impact ──┐
                    │                      │
                    ▼                      ▼
        ┌───────────────────────┐  ┌──────────────────────────┐
        │  Normal Flow          │  │  5. GOVERNANCE (Phase 5) │
        │  - Continue tracking  │  │  - Check if locked       │
        │  - Wait for review    │  │  - Require approval      │
        └───────────────────────┘  │  - Audit log entry       │
                                   └──────────┬───────────────┘
                                              │
                                              ▼
                                   ┌──────────────────────────┐
                                   │  APPROVAL WORKFLOW       │
                                   │  - Request 2nd reviewer  │
                                   │  - Justify change        │
                                   └──────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                           REVIEW SCHEDULED                          │
│                      (By Review Intelligence)                       │
└────────────────────────┬────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────┐
        │   REVIEW DASHBOARD (Phase 2)      │
        │   - Show urgency score            │
        │   - Display contradictions        │
        │   - Show version changes          │
        └───────────┬───────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────────┐
        │   REVIEWER ACTIONS                │
        │   □ REAFFIRMED                    │
        │   □ REVISED (creates new version) │
        │   □ ESCALATED (governance alert)  │
        │   □ DEFERRED (postponement track) │
        └───────────┬───────────────────────┘
                    │
                    ├─── If REVISED ────┐
                    │                   │
                    ▼                   ▼
        ┌───────────────────┐   ┌───────────────────┐
        │  Reset Urgency    │   │  Create Version   │
        │  Update Review    │   │  Update Confidence│
        │  Date             │   └───────────────────┘
        └───────────────────┘
```

## Integration Examples

### Example 1: Assumption Becomes BROKEN

```
Time: 10:00 AM - Assumption marked as BROKEN
↓
[VERSIONING] Creates version 5 for all affected decisions
  → Decision A: "Critical assumption breakdown"
  → Decision B: "Dependency assumption failed"
↓
[CONFIDENCE] Confidence drops from 85 → 55 (30% drop)
↓
[CONTRADICTION] Re-runs detection
  → Finds Decision A now contradicts Decision C
↓
[REVIEW URGENCY] Recalculates urgency
  → Before: 45 (low priority, 60 days)
  → After: 82 (high priority, 7 days)
  → Reason: Broken assumption (20) + Confidence drop (25) + Contradiction (20)
↓
[NOTIFICATION] Emails decision owner
  → "Decision A urgency increased due to broken assumption"
↓
[GOVERNANCE] Checks if high-impact
  → Yes: Locks decision until governance review
  → Requires justification for any changes
```

### Example 2: Contradiction Detected

```
Time: 2:00 PM - System runs contradiction detection job
↓
[CONTRADICTION ENGINE] Finds conflict
  → Decision X: "Reduce spending by 20%"
  → Decision Y: "Hire 5 new vendors"
  → Type: OBJECTIVE_UNDERMINING
  → Confidence: 0.85
  → Explanation: "Decision X aims to reduce spending by 20%, while
     Decision Y aims to hire 5 new vendors, which will increase costs.
     These objectives work against each other."
↓
[REVIEW URGENCY] Updates urgency for both decisions
  → Decision X: +15 points (contradiction detected)
  → Decision Y: +15 points (contradiction detected)
↓
[NOTIFICATION] Creates notifications
  → Type: CONTRADICTION_DETECTED
  → Shows natural language explanation
  → Links to both decisions
↓
[GOVERNANCE] High-impact check
  → Decision X is high-impact (budget threshold)
  → Sends governance alert
  → Requires dual approval for resolution
```

### Example 3: Review Postponed Repeatedly

```
Review #1: September 15 → Postponed to October 1 (reason: "Busy")
↓
[REVIEW INTELLIGENCE] Tracks postponement
  → Count: 1
  → No penalty yet
↓
Review #2: October 1 → Postponed to October 15 (reason: "Needs more data")
↓
[REVIEW INTELLIGENCE] Tracks postponement
  → Count: 2
  → Adds +5 to urgency score
↓
Review #3: October 15 → Postponed to November 1 (reason: "Vacation")
↓
[REVIEW INTELLIGENCE] Flags review neglect
  → Count: 3
  → Alert: "REPEATED_POSTPONEMENT"
  → Severity: HIGH
  → Adds +10 to urgency score
  → Message: "Decision has been postponed 3 times. Review may be avoided."
↓
[ESCALATION] Escalation level increased
  → Level 0 → Level 2 (High Priority)
  → Notifies manager
  → Requires explanation for next postponement
```

### Example 4: Governance Lock Prevents Edit

```
User: Attempts to edit high-impact decision
↓
[GOVERNANCE MIDDLEWARE] Intercepts request
↓
[GOVERNANCE SERVICE] Checks:
  ✓ Is decision locked? → YES
  ✓ Lock reason: "Pending contradiction resolution"
  ✓ User is owner? → YES (but still locked)
↓
[RESPONSE] 403 Forbidden
  {
    "error": "Governance policy violation",
    "reason": "Decision is locked",
    "lockReason": "Pending contradiction resolution",
    "requiresOverride": true,
    "contact": "governance@company.com"
  }
↓
[AUDIT LOG] Records attempt
  → Action: EDIT_ATTEMPTED
  → Actor: user@company.com
  → Blocked: true
  → Reason: Governance lock
```

### Example 5: Full Review Workflow

```
Time: Review Date Reached
↓
[NOTIFICATION] Sends review reminder
  → Escalation Level: 1 (Reminder)
  → Contains:
    • Current urgency score
    • Days since last review
    • List of contradictions
    • Confidence trend chart
    • Version diff since last review
↓
Reviewer: Opens review page
↓
[REVIEW DASHBOARD] Shows context
  ┌────────────────────────────────────┐
  │ Decision: "Migrate to Cloud"       │
  │ Urgency Score: 75 (High Priority)  │
  │ Last Review: 45 days ago           │
  │                                    │
  │ Since Last Review:                 │
  │ • Version 3 → 5 (2 changes)        │
  │ • Confidence: 80 → 65 (-15%)       │
  │ • New contradiction detected       │
  │ • 1 assumption became SHAKY        │
  │                                    │
  │ Contradictions:                    │
  │ [!] Budget conflict with "Cost    │
  │     Reduction Initiative"          │
  │                                    │
  │ Recommended Action: REVISED        │
  └────────────────────────────────────┘
↓
Reviewer: Submits review
  → Outcome: REVISED
  → Notes: "Updated budget assumptions to align with cost initiative"
  → Concerns: ["Tight timeline", "Resource availability"]
  → Recommendations: ["Hire contractor", "Extend deadline"]
↓
[REVIEW SERVICE] Processes review
↓
[VERSIONING] Creates version 6
  → Change Type: GOVERNANCE_REVIEW
  → Change Summary: Review notes
  → Changed By: Reviewer
↓
[REVIEW URGENCY] Resets urgency
  → Before: 75
  → After: 35 (reviewed + concerns addressed)
  → Next Review: 30 days
↓
[CONTRADICTION] Re-evaluates
  → Budget conflict: RESOLVED (assumptions aligned)
↓
[NOTIFICATION] Notifies decision owner
  → "Your decision was reviewed and revised"
  → Shows reviewer's recommendations
```

## Data Flow Summary

| Feature            | Triggers On                                                            | Updates                                                                         | Notifies                         |
| ------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------- | -------------------------------- |
| **Versioning**     | Decision change, Review complete                                       | `decision_versions`, `decision_confidence_history`, `decisions.current_version` | -                                |
| **Contradictions** | New decision, Assumption change, Scheduled job                         | `decision_tensions`, urgency scores                                             | Decision owners, Governance team |
| **Review Urgency** | Version created, Contradiction detected, Confidence drop, Postponement | `decision_review_urgency`, `decision_stability_metrics`                         | Reviewers (based on escalation)  |
| **Reviews**        | User action, Scheduled reminder                                        | `decision_reviews`, `review_comments`, `decisions.last_reviewed_at`             | Decision owners, Approvers       |
| **Governance**     | Edit attempt, High-impact change                                       | `governance_audit_log`, `decision_approvals`, `decision_versions`               | Approvers, Governance team       |

## Database Table Relationships

```
decisions (existing)
├── decision_versions (Phase 1)
│   └── decision_confidence_history (Phase 1)
├── decision_reviews (Phase 2)
│   ├── review_comments (Phase 2)
│   └── review_postponement_tracking (Phase 2)
├── decision_tensions (existing, enhanced Phase 3)
├── decision_review_urgency (Phase 4)
│   └── decision_stability_metrics (Phase 4)
└── decision_governance (Phase 5)
    ├── decision_approvals (Phase 5)
    ├── governance_audit_log (Phase 5)
    └── governance_policies (Phase 5)
```

## API Endpoint Map

```
/api/decisions/:id/
├── versions/
│   ├── GET    /               (list versions)
│   ├── POST   /               (create version)
│   ├── GET    /compare        (compare versions)
│   ├── GET    /confidence-trend
│   └── GET    /confidence-drop
├── reviews/
│   ├── GET    /               (list reviews)
│   ├── POST   /               (submit review)
│   ├── POST   /postpone
│   └── GET    /:reviewId/thread
├── contradictions/
│   ├── GET    /               (list for decision)
│   └── GET    /:id/explanation
├── review-urgency/
│   ├── GET    /               (get urgency)
│   ├── POST   /recalculate
│   └── GET    /stability-trend
└── governance/
    ├── POST   /lock
    ├── DELETE /lock
    ├── POST   /request-approval
    └── GET    /audit-log

/api/contradictions/
├── POST   /detect            (run detection)
└── GET    /                  (list all)

/api/review-intelligence/
├── GET    /dashboard
├── GET    /overdue
└── POST   /recalculate-all

/api/governance/
├── GET    /pending-approvals
├── PUT    /approvals/:id/respond
└── PUT    /policies
```

## Event-Driven Architecture

```typescript
// Events emitted by each phase

Phase 1 (Versioning):
  ✓ version.created
  ✓ confidence.dropped
  ✓ confidence.recorded

Phase 2 (Reviews):
  ✓ review.completed
  ✓ review.postponed
  ✓ review.neglected

Phase 3 (Contradictions):
  ✓ contradiction.detected
  ✓ contradiction.resolved

Phase 4 (Intelligence):
  ✓ urgency.increased
  ✓ urgency.reset
  ✓ review.overdue

Phase 5 (Governance):
  ✓ governance.locked
  ✓ governance.unlocked
  ✓ approval.requested
  ✓ approval.completed
  ✓ policy.violated
```

## Frontend Component Structure

```
src/components/
├── DecisionVersioning/
│   ├── VersionHistory.jsx
│   ├── VersionComparison.jsx
│   └── ConfidenceTrendChart.jsx
├── DecisionReview/
│   ├── ReviewDashboard.jsx
│   ├── ReviewForm.jsx
│   ├── ReviewThread.jsx
│   └── PostponementDialog.jsx
├── Contradictions/
│   ├── ContradictionsList.jsx
│   ├── ContradictionDetail.jsx
│   └── ContradictionExplanation.jsx
├── ReviewIntelligence/
│   ├── UrgencyScore.jsx
│   ├── StabilityTrend.jsx
│   └── OverdueDashboard.jsx
└── Governance/
    ├── GovernanceLockBadge.jsx
    ├── ApprovalWorkflow.jsx
    ├── AuditLogViewer.jsx
    └── PolicyConfiguration.jsx
```

---

**Pro Tip**: Start with Phase 1 (Versioning) as it provides the foundation for confidence tracking, which is used by all other phases. Then implement Phase 4 (Review Intelligence) early to start collecting urgency data while you build the other features.
