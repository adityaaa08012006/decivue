# 🎬 Plot Armor Complete Data Seeder

## Overview

This comprehensive test data seeder creates a **realistic, non-technical business scenario** for **Plot Armor Coffee Co.**, a regional coffee shop chain making strategic business decisions. The data demonstrates **ALL** Decivue features with authentic business context.

## Organization Context

**Plot Armor Coffee Co.** is a growing specialty coffee chain facing real-world business challenges:

- 🌍 **Industry**: Food & Beverage (Specialty Coffee)
- 👥 **Size**: Medium (50-200 employees)
- 📍 **Scope**: Regional (3 states)
- 💰 **Budget**: $5M-$10M annually
- 🎯 **Focus**: Expansion, sustainability, customer experience, operational efficiency

## Features Demonstrated

### ✅ Core Decision Management

- **24 Business Decisions** across 7 categories:
  - **Expansion**: New locations, market entry strategies
  - **Operations**: Technology, automation, staffing
  - **Product**: Menu innovation, subscriptions
  - **Marketing**: Digital campaigns, loyalty programs
  - **Sustainability**: Ethical sourcing, eco-friendly packaging
  - **Finance**: Credit lines, capital investments
  - **Workforce**: Training, benefits, compensation

### ✅ Decision Conflicts (6 conflicts)

- **Resource Competition**: Budget constraints between competing initiatives
- **Contradictory Strategies**: Conflicting approaches (e.g., cost-cutting vs. employee investment)
- **Objective Undermining**: Decisions that sabotage each other

### ✅ Assumption Management (14 assumptions)

- **Universal Assumptions**: Market trends, customer behavior, industry standards
- **Decision-Specific Assumptions**: Location strategies, technology ROI, menu performance
- **All States**: VALID, SHAKY, BROKEN
- **Conflict Detection**: 4 assumption conflicts with varying resolutions

### ✅ Constraint Management (6 constraints)

- **Budget**: Annual cap, labor cost ratios
- **Compliance**: Health & safety standards
- **Policy**: Sustainable sourcing, location minimums
- **Legal**: Debt-to-equity limits
- **Violations**: Tracked for decisions breaching constraints

### ✅ Version Control & History

- **Decision Versions**: Complete change tracking for all decisions
  - Creation events
  - Governance locks
  - Lifecycle changes
  - Deprecation/retirement
- **Change Types**: created, governance_lock, lifecycle_changed, retirement, deprecation, field_updated

### ✅ Review System (12 reviews)

- **Review Types**:
  - `routine`: Regular periodic reviews
  - `manual`: Ad-hoc management reviews
  - `conflict_resolution`: Reviews triggered by conflicts
- **Review Outcomes**:
  - `reaffirmed`: Decision stays on track
  - `escalated`: Requires leadership attention
  - `deferred`: Postponed pending additional data
  - `revised`: Modified based on new information

### ✅ Deprecation Tracking

- **Failed Decisions**: Cost-cutting measures that backfired
- **Deprecated Initiatives**: Radio advertising, duplicate locations
- **Outcomes**: `failed`, `partially_succeeded`, `succeeded`
- **Lessons Learned**: Documented conclusions and corrective actions

### ✅ Governance & Audit Trail

- **Governance Tiers**: standard, high_impact, critical
- **Locked Decisions**: High-stakes decisions requiring approval
- **Second Reviewer Requirements**: Critical financial decisions
- **Audit Log**: Complete governance event tracking
  - Decision locks/unlocks
  - Edit requests and approvals
  - Second review processes

### ✅ Evaluation & Health Tracking

- **Evaluation History**: Health signal changes over time
- **Automated Evaluations**: Triggered by assumption/constraint changes
- **Health Calculations**: Detailed trace of scoring logic
- **Lifecycle Progression**: STABLE → UNDER_REVIEW → AT_RISK → INVALIDATED/RETIRED

### ✅ Decision Signals (17 signals)

- **PROGRESS**: Positive developments and milestones
- **RISK**: Warning signs and concerning trends
- **SIGNAL**: Important observations
- **NOTE**: General updates
- **Impact Levels**: LOW, MEDIUM, HIGH

### ✅ Notifications (12 notifications)

- **Types**:
  - HEALTH_DEGRADED
  - LIFECYCLE_CHANGED
  - DECISION_CONFLICT
  - ASSUMPTION_CONFLICT
  - ASSUMPTION_BROKEN
  - NEEDS_REVIEW
  - DEPENDENCY_BROKEN
- **Severities**: INFO, WARNING, CRITICAL
- **Read States**: Mix of read/unread for realistic dashboard

### ✅ Dependencies (7 dependency chains)

- Expansion dependencies on financing
- Technology prerequisites for other initiatives
- Strategic alignment chains

### ✅ Time Jump (Historical Data)

- **Spans 220 days** of decision history
- Various timestamps for creation, reviews, evaluations
- Simulates real-world decision evolution over time

### ✅ Parameter Templates (12 templates)

- Structured categories: Operations, Marketing, Finance, Product, Expansion
- Display ordering and metadata
- Foundation for structured decision entry

### ✅ Organization Profile

- Complete org profile with priorities, constraints
- Risk tolerance scoring
- Industry and size classification

## Data Statistics

| Category                  | Count | Description                          |
| ------------------------- | ----- | ------------------------------------ |
| **Decisions**             | 24    | Full lifecycle, multiple categories  |
| **Assumptions**           | 14    | Universal + Decision-specific        |
| **Constraints**           | 6     | Budget, compliance, policy, legal    |
| **Decision Conflicts**    | 6     | Resource, contradictory, undermining |
| **Assumption Conflicts**  | 4     | Contradictory, mutually exclusive    |
| **Constraint Violations** | 4     | Policy and budget breaches           |
| **Dependencies**          | 7     | Decision prerequisite chains         |
| **Decision Signals**      | 17    | Progress, risks, notes               |
| **Decision Versions**     | 35+   | Complete change tracking             |
| **Decision Reviews**      | 12    | Routine, manual, conflict            |
| **Evaluation History**    | 10+   | Health signal changes                |
| **Governance Audit Logs** | 10+   | Lock, approval events                |
| **Relation Changes**      | 5+    | Assumption/constraint links          |
| **Notifications**         | 12    | All types and severities             |
| **Parameter Templates**   | 12    | Structured categories                |

## Installation & Usage

### Prerequisites

1. **Organization exists**: "PLOT ARMOR" organization must be registered
2. **User exists**: At least one user in the organization
3. **Database access**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`

### Running the Seeder

#### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run seed-plot-armor
```

#### Option 2: Direct execution

```bash
cd backend
npx tsx scripts/seed-plot-armor-complete.ts
```

#### Option 3: From workspace root

```bash
cd backend && npm run seed-plot-armor
```

### Execution Time

- Expected duration: **15-30 seconds**
- Creates **150+ database records**
- Automatically cleans up existing test data before seeding

## Script Output

The seeder provides detailed progress logging:

```bash
🎬 ═══════════════════════════════════════════════════════════
   PLOT ARMOR - Comprehensive Test Data Seeder
   Coffee Shop Chain Decision Management System
   ═══════════════════════════════════════════════════════════

📍 Step 1: Locating PLOT ARMOR organization...
   ✅ Organization: PLOT ARMOR
   📋 Org Code: PA-XXXX
   🆔 ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

👤 Step 2: Located user...
   ✅ User: John Doe (john@example.com)
   👔 Role: lead
   🆔 ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

🧹 Cleaning up existing test data for PLOT ARMOR...
   ✅ Cleanup complete

📊 Step 3: Creating organization profile...
   ✅ Organization profile created

... [detailed progress for each step] ...

🎉 ═══════════════════════════════════════════════════════════
   PLOT ARMOR DATA SEEDING COMPLETE!
   ═══════════════════════════════════════════════════════════

📊 Summary:
   ✅ Decisions: 24
   ✅ Assumptions: 14
   ✅ Constraints: 6
   ✅ Decision Conflicts: 6
   ✅ Assumption Conflicts: 4
   ... [complete statistics] ...

🎬 Features Demonstrated:
   ✅ Decision Conflicts (resource competition, contradictions)
   ✅ Assumption Conflicts (contradictory, mutually exclusive)
   ✅ Report Generation Data (reviews, evaluations)
   ✅ Time Jump (historical data across 220 days)
   ✅ Version Control (complete change tracking)
   ✅ Reviewing (routine, manual, conflict resolution)
   ✅ Deprecation (failed, succeeded, superseded outcomes)
   ... [complete feature list] ...
```

## Sample Decisions

### Successful Decisions (STABLE)

- 📍 **Open Downtown Location on Market Street** (Health: 88)
  - Prime location, on track, strong fundamentals
- ☕ **Launch Seasonal Specialty Drink Menu** (Health: 93)
  - Top performer, customer favorite, strong sales
- 📱 **Implement Mobile Ordering System** (Health: 91)
  - Technology win, 28% adoption, efficiency gains
- ♻️ **Transition to 100% Compostable Packaging** (Health: 87)
  - Brand alignment, customer approval, sustainability leader

### At-Risk Decisions (UNDER_REVIEW / AT_RISK)

- 🎓 **Establish University District Location** (Health: 62)
  - Summer enrollment concerns, revenue volatility
- 🏬 **Expand to Suburban Mall Food Court** (Health: 45)
  - Mall traffic declining, high risk, requires review
- 💰 **Invest in Equipment Upgrade Program** (Health: 67)
  - Budget constraints, implementation deferred

### Failed Decisions (INVALIDATED / RETIRED)

- ❌ **Reduce Staff Hours to Cut Costs** (Health: 28)
  - Customer experience destroyed, staff turnover spiked
- ❌ **Cut Employee Discount from 50% to 30%** (Health: 18)
  - Morale plummeted, recruitment costs exceeded savings
- ❌ **Open Second Downtown Location** (Health: 15)
  - Violated distance policy, cannibalized existing store
- 📻 **Radio Advertising Campaign** (Health: 35)
  - Poor ROI, wrong demographic, digital more effective

## Use Cases & Testing Scenarios

### 1. **Decision Conflict Resolution**

- View conflicts between expansion plans and budget constraints
- Test conflict resolution workflows (prioritize, merge, deprecate)
- Observe impact of resolving one decision on others

### 2. **Assumption Validation Testing**

- Review broken assumptions and their impact on decisions
- Test assumption conflict detection algorithms
- Validate health signal calculations based on assumption state

### 3. **Version Control & Audit Trail**

- Examine complete decision change history
- Review governance approval workflows
- Test version rollback and comparison features

### 4. **Review Dashboard Testing**

- Filter decisions needing review (high urgency scores)
- Test review workflows (routine, manual, escalation)
- Validate next review date calculations

### 5. **Deprecation Analysis**

- Analyze failed decisions and lessons learned
- Extract insights from deprecation conclusions
- Test reporting on decision outcomes

### 6. **Report Generation**

- Generate team member reports with rich history
- Create executive summaries with conflict analysis
- Test time-series health signal visualizations

### 7. **Notification System**

- Review notification prioritization (INFO, WARNING, CRITICAL)
- Test notification delivery for various event types
- Validate notification relevance and accuracy

### 8. **Dashboard & Analytics**

- Test health signal distribution charts
- Validate lifecycle state transitions over time
- Analyze decision category performance

## Customization

### Modifying Organization Name

If your organization has a different name, update line 119:

```typescript
.ilike('name', '%YOUR ORG NAME%')
```

### Adjusting Time Ranges

Modify helper functions to change historical data span:

```typescript
// Current: 220 days of history
created_at: daysAgo(220);

// Adjust to your preference
created_at: daysAgo(365); // 1 year of history
```

### Adding More Decisions

Follow the pattern in `decisionsData` array (lines 280-650):

```typescript
{
  title: 'Your Decision Title',
  description: 'Detailed description',
  category: 'Operations', // or Marketing, Finance, etc.
  lifecycle: 'STABLE',
  health_signal: 85,
  parameters: { /* custom fields */ },
  created_at: daysAgo(X),
  last_reviewed_at: daysAgo(Y),
  // ... other fields
}
```

## Troubleshooting

### Error: Organization not found

- Ensure "PLOT ARMOR" organization is registered
- Update organization name filter if using different name
- Check organization name in Supabase dashboard

### Error: No users found

- Register at least one user in the organization
- Verify user has correct `organization_id`
- Check Supabase users table

### Error: Missing environment variables

```bash
# Check backend/.env has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...your-key
```

### Seeder hangs or times out

- Check Supabase connection
- Verify database isn't locked by other processes
- Ensure RLS policies allow service role access

### Duplicate key errors

- Run cleanup first: `npm run clear-db`
- Or script auto-cleans at start
- Check for uniqueness constraints on assumptions/constraints

## Data Cleanup

To remove all seeded data:

```bash
# Option 1: Clear all data (all organizations)
cd backend
npm run clear-db

# Option 2: Re-run seeder (auto-cleans before seeding)
npm run seed-plot-armor
```

The seeder automatically cleans up existing Plot Armor data before creating new records.

## Integration with Tests

Use seeded data for integration tests:

```typescript
describe("Decision Conflict Detection", () => {
  it("should detect resource competition conflicts", async () => {
    // Data already seeded by seed-plot-armor
    const conflicts = await getDecisionConflicts(organizationId);
    expect(conflicts).toHaveLength(6);
    expect(
      conflicts.some((c) => c.conflict_type === "RESOURCE_COMPETITION"),
    ).toBe(true);
  });
});
```

## Support & Feedback

For issues or enhancement requests:

1. Check existing scripts in `/backend/scripts/`
2. Review database schema in `/backend/schema.sql`
3. Consult migration files in `/backend/migrations/`

## License

Part of the Decivue project. See root LICENSE file.

---

**Created with ❤️ for realistic, non-technical business scenario testing**
