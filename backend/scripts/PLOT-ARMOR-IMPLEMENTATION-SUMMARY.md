# 🎬 Plot Armor Test Data - Implementation Summary

## What Was Created

A comprehensive TypeScript seeding script that creates **realistic, non-technical business data** for the "Plot Armor Coffee Co." organization, demonstrating **ALL Decivue features**.

---

## 📁 Files Created

### 1. **seed-plot-armor-complete.ts** (Main Script)

**Location**: `backend/scripts/seed-plot-armor-complete.ts`  
**Size**: ~1,200 lines  
**Purpose**: Complete data seeder with 20 distinct creation steps

**Features**:

- ✅ Automatic cleanup before seeding
- ✅ Detailed progress logging with emojis
- ✅ Error handling and validation
- ✅ Comprehensive final summary
- ✅ Support for custom organization names

### 2. **PLOT-ARMOR-SEEDER-README.md** (Full Documentation)

**Location**: `backend/scripts/PLOT-ARMOR-SEEDER-README.md`  
**Size**: ~700 lines  
**Purpose**: Complete guide with usage, features, troubleshooting

**Sections**:

- Organization context and background
- All features demonstrated (15+ categories)
- Data statistics table
- Installation and usage instructions
- Sample decisions and scenarios
- Customization guide
- Troubleshooting section
- Integration testing examples

### 3. **PLOT-ARMOR-QUICK-REFERENCE.md** (Cheat Sheet)

**Location**: `backend/scripts/PLOT-ARMOR-QUICK-REFERENCE.md`  
**Size**: ~400 lines  
**Purpose**: Quick lookup for data structure and relationships

**Sections**:

- Decision tables by category with status
- Assumption breakdown (VALID/SHAKY/BROKEN)
- Conflict analysis (6 decision conflicts, 4 assumption conflicts)
- Constraint status and violations
- Signal breakdown by type
- Notification summary by severity
- Dependency tree visualization
- Timeline of events (220-day span)
- Testing scenarios
- Quick start commands

### 4. **Package.json Update**

**Location**: `backend/package.json`  
**Change**: Added `"seed-plot-armor"` script command

---

## 🎯 Organization: Plot Armor Coffee Co.

### Context

- **Industry**: Food & Beverage (Specialty Coffee)
- **Size**: Medium (50-200 employees)
- **Scope**: Regional (3 states)
- **Budget**: $5M-$10M annually
- **Focus**: Expansion, sustainability, customer experience

### Why Coffee Shop?

**Non-technical, relatable business decisions**:

- ✅ Everyone understands coffee shops
- ✅ Clear business problems (location, staffing, costs)
- ✅ Realistic constraints (budget, compliance, competition)
- ✅ Natural conflicts (expansion vs. budget, quality vs. cost)
- ✅ Diverse decision categories (operations, marketing, finance)

---

## 📊 Data Created (Complete Statistics)

| Category                      | Count    | Details                                                                                     |
| ----------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| **Decisions**                 | 24       | 7 categories: Expansion, Operations, Product, Marketing, Sustainability, Finance, Workforce |
| **Assumptions**               | 14       | 8 VALID, 3 SHAKY, 3 BROKEN; Universal + Decision-specific                                   |
| **Constraints**               | 6        | Budget, Compliance, Policy, Legal                                                           |
| **Decision Conflicts**        | 6        | Resource competition, contradictory, objective undermining                                  |
| **Assumption Conflicts**      | 4        | Contradictory, mutually exclusive, incompatible                                             |
| **Constraint Violations**     | 4        | Budget overruns, policy breaches                                                            |
| **Dependencies**              | 7        | Decision prerequisite chains                                                                |
| **Decision-Assumption Links** | 30+      | Many-to-many relationships                                                                  |
| **Decision-Constraint Links** | 15+      | Compliance tracking                                                                         |
| **Decision Signals**          | 17       | Progress (5), Risk (5), Note (4), Signal (3)                                                |
| **Decision Versions**         | 35+      | Complete change history                                                                     |
| **Decision Reviews**          | 12       | Routine, manual, conflict resolution                                                        |
| **Evaluation History**        | 10+      | Health signal tracking over time                                                            |
| **Governance Audit Logs**     | 10+      | Lock, approval, edit tracking                                                               |
| **Relation Changes**          | 5+       | Assumption/constraint linking events                                                        |
| **Notifications**             | 12       | 5 Critical, 6 Warning, 1 Info                                                               |
| **Parameter Templates**       | 12       | Structured categories                                                                       |
| **Organization Profile**      | 1        | Complete org metadata                                                                       |
| **TOTAL RECORDS**             | **150+** | Comprehensive dataset                                                                       |

---

## ✨ Features Demonstrated

### 1. ⚔️ Decision Conflicts

**6 conflicts showcasing**:

- Resource competition (budget, capital)
- Contradictory strategies (cost-cutting vs. investment)
- Objective undermining (training vs. hour cuts)
- Both resolved and active conflicts
- Resolution actions: PRIORITIZE_A, PRIORITIZE_B, KEEP_BOTH

**Example**: Loyalty program conflicts with employee discount cuts (resolved by reversing cuts)

### 2. ⚠️ Assumption Conflicts

**4 conflicts showcasing**:

- Contradictory assumptions (barista availability vs. margins)
- Mutually exclusive assumptions (automation vs. personalization)
- Incompatible assumptions (university stability vs. expansion)
- Resolved conflicts with documented resolution notes

**Example**: Automation vs. personalization resolved through balanced approach

### 3. 📋 Report Generation Data

**Rich data for reports**:

- 12 decision reviews with outcomes (reaffirmed, escalated, deferred, revised)
- 10+ evaluation history records with health changes
- 35+ version records with complete change tracking
- Governance audit logs with approval workflows
- Time-series data for trend analysis

**Use Case**: Generate executive summary showing decision health trends over 220 days

### 4. ⏰ Time Jump (220-day Historical Span)

**Historical timeline**:

- Oldest decision: 220 days ago
- Failed decisions at 50-75 days ago
- Recent reviews and evaluations (1-20 days ago)
- Future review dates scheduled
- Realistic progression of events over time

**Use Case**: Time-travel analysis showing how decisions evolved

### 5. 📚 Version Control

**Complete change tracking**:

- Creation versions for all decisions
- Governance lock versions for critical decisions
- Lifecycle change versions (STABLE → AT_RISK → INVALIDATED)
- Deprecation/retirement versions with outcomes
- Field update versions with changed_fields metadata

**Use Case**: Audit trail showing exactly when and why decisions changed

### 6. 🔍 Reviewing System

**12 reviews showcasing**:

- **Routine reviews**: Regular periodic checks (reaffirmed decisions)
- **Manual reviews**: Ad-hoc management reviews (escalations, deferrals)
- **Conflict resolution**: Reviews triggered by conflicts (revisions)
- Review outcomes: reaffirmed, escalated, deferred, revised
- Next review dates and deferral tracking

**Use Case**: Review dashboard showing what needs immediate attention

### 7. 📉 Deprecation Tracking

**4 failed decisions with full documentation**:

- **Reduce Staff Hours**: Customer experience destroyed, staff turnover spiked
- **Cut Employee Discount**: Morale plummeted, recruitment costs tripled savings
- **Second Downtown Location**: Cannibalized existing store, distance policy violated
- **Radio Advertising**: Poor ROI, wrong demographic, digital more effective

**Each includes**:

- Deprecation outcome (failed, partially_succeeded)
- Lessons learned (3-5 points)
- Financial impact
- Reversal actions taken

**Use Case**: Learn from failures, extract insights, improve future decisions

### 8. 🔒 Governance Features

**2 locked decisions with full governance**:

- **Fair Trade Coffee**: High-Impact tier, requires second reviewer
- **$2M Credit Line**: Critical tier, requires second reviewer, edit justification required

**Audit trail includes**:

- Decision lock events with justification
- Edit request and approval records
- Previous state → new state tracking
- Governance tier assignments

**Use Case**: Test approval workflows for high-stakes decisions

### 9. 📊 Evaluation & Health Tracking

**10+ evaluation records showing**:

- Old lifecycle → new lifecycle transitions
- Old health signal → new health signal changes
- Detailed trace of health calculation logic
- Triggered by (automatic_evaluation, manual_review, conflict_detection)
- Invalidation reasons for failed decisions

**Use Case**: Understand why decision health degraded and when

### 10. 📡 Decision Signals

**17 signals across 4 types**:

- **PROGRESS** (5): Positive developments (exceeding projections, strong adoption)
- **RISK** (5): Warning signs (declining traffic, cost overruns)
- **NOTE** (4): General updates (permits approved, partnership metrics)
- **SIGNAL** (3): Important observations (customer complaints, cannibalization)

**Impact levels**: LOW, MEDIUM, HIGH

**Use Case**: Real-time decision monitoring dashboard

### 11. 🔔 Notifications

**12 notifications by severity**:

- **CRITICAL** (5): Immediate action required (invalidations, critical health)
- **WARNING** (6): Attention needed (health degradation, conflicts)
- **INFO** (1): Informational (conflict resolved)

**Types covered**:

- HEALTH_DEGRADED
- LIFECYCLE_CHANGED
- DECISION_CONFLICT
- ASSUMPTION_CONFLICT
- ASSUMPTION_BROKEN
- NEEDS_REVIEW

**Use Case**: Alert system for decision makers

### 12. 🚫 Constraint Violations

**4 violations demonstrating**:

- Budget cap violations (expansion combining to exceed limits)
- Labor cost ratio violations (health insurance pushing beyond policy)
- Distance policy violations (second downtown too close)
- Both resolved and active violations

**Use Case**: Compliance monitoring and policy enforcement

### 13. 🔗 Dependencies

**7 dependency chains showing**:

- Financial prerequisites (credit line → expansion projects)
- Technical prerequisites (mobile ordering → loyalty program)
- Operational prerequisites (training → new locations)
- Strategic alignment (fair trade → compostable packaging)

**Use Case**: Impact analysis - what breaks if we cancel X?

### 14. 📝 Parameter Templates

**12 templates across 6 categories**:

- Operations (3): Store operations, supply chain, staff management
- Marketing (3): Customer acquisition, brand development, loyalty
- Finance (2): Budget allocation, investment
- Product (2): Menu development, quality standards
- Expansion (2): New locations, partnerships

**Use Case**: Structured decision entry with category-specific fields

### 15. 🏢 Organization Profile

**Complete org metadata**:

- Industry, size, decision style
- Risk tolerance (55/100)
- Strategic priorities (5 priorities)
- Constraints (budget range, compliance, geographic scope)

**Use Case**: Context-aware decision recommendations

---

## 🚀 How to Use

### Step 1: Verify Prerequisites

```bash
# Check organization exists
cd backend
node scripts/check-orgs.js

# Check user exists
node scripts/check-users.js

# Verify environment variables
cat .env | grep SUPABASE
```

### Step 2: Run the Seeder

```bash
cd backend
npm run seed-plot-armor
```

Or directly:

```bash
npx tsx scripts/seed-plot-armor-complete.ts
```

### Step 3: Verify Results

Browser: Navigate to your Decivue app and explore:

- **Decisions Page**: See all 24 decisions across categories
- **Conflicts View**: View 6 decision conflicts, 4 assumption conflicts
- **Review Dashboard**: See decisions needing review (high urgency scores)
- **Notifications**: 12 notifications across severities
- **Version History**: Complete audit trail for any decision

Database: Check Supabase directly:

```sql
-- Decision count by lifecycle
SELECT lifecycle, COUNT(*)
FROM decisions
WHERE organization_id = 'YOUR_ORG_ID'
GROUP BY lifecycle;

-- Active conflicts
SELECT COUNT(*) FROM decision_conflicts
WHERE organization_id = 'YOUR_ORG_ID' AND resolved_at IS NULL;

-- Critical notifications
SELECT * FROM notifications
WHERE organization_id = 'YOUR_ORG_ID' AND severity = 'CRITICAL';
```

---

## 🎓 Testing Scenarios

### Scenario 1: Conflict Resolution Workflow

1. Navigate to decision conflicts page
2. Find "Loyalty Program vs Employee Discount" conflict
3. Observe resolution: PRIORITIZE_A (restored benefits)
4. Check version history showing reversal
5. Test your conflict resolution UI with remaining active conflicts

### Scenario 2: Health Signal Investigation

1. Filter decisions with health < 60
2. Select "Suburban Mall Food Court" (health: 45)
3. View assumption links (checking for broken assumptions)
4. Check constraint violations (budget concerns)
5. Review decision signals (mall traffic declining 22%)
6. Trace evaluation history showing health decline over time

### Scenario 3: Review Prioritization

1. Sort decisions by review_urgency_score (descending)
2. Top priority: "Part-Time Health Insurance" (urgency: 79)
3. Review deferral history (consecutive_deferrals: 2)
4. Check next_review_date
5. Perform manual review and update status

### Scenario 4: Deprecation Analysis

1. Filter decisions with lifecycle = 'INVALIDATED' or 'RETIRED'
2. Select "Reduce Staff Hours to Cut Costs"
3. Read invalidated_reason: "Customer experience degraded 35%"
4. Review deprecation_outcome: 'failed'
5. Extract deprecation_conclusions: lessons_learned
6. Generate report on "What We Learned from Failures"

### Scenario 5: Governance Approval Flow

1. Find locked decisions (governance_mode = true)
2. Select "$2M Line of Credit" (governance_tier: 'critical')
3. Test edit attempt (should require justification)
4. Simulate approval workflow
5. Check governance_audit_log for complete trail
6. Verify version created with governance_lock change type

### Scenario 6: Time-Series Analysis

1. Select "Launch Seasonal Specialty Drink Menu"
2. Load all decision_versions (order by version_number)
3. Plot health_signal over time (created → now)
4. Correlate version changes with evaluation_history
5. Identify inflection points (health improvements/degradations)
6. Generate trend chart for executive dashboard

### Scenario 7: Real-Time Monitoring

1. Dashboard: Load all decisions with signals from last 30 days
2. Filter RISK signals with HIGH impact
3. Group by decision category to identify problem areas
4. Check notifications matching these risks
5. Test alert system with new signal creation
6. Verify notification delivery

### Scenario 8: Assumption Impact Analysis

1. Find broken assumptions (status = 'BROKEN')
2. Select "Skilled baristas are readily available"
3. Load all decision_assumptions linking to this assumption
4. Observe impact on decisions:
   - University District Location (health declining)
   - Staff Hour Reduction (failed catastrophically)
   - Part-Time Health Insurance (budget strain)
5. Test assumption repair workflow
6. Recalculate affected decision health scores

---

## 🎯 Key Testing Insights

### What Makes This Data Valuable

1. **Realistic Complexity**: Real-world business scenario, not artificial test data
2. **Interconnected**: Decisions, assumptions, constraints all properly linked
3. **Historical Depth**: 220 days of evolution, not just current state snapshots
4. **Complete Lifecycles**: Success stories AND failures, not just happy paths
5. **Rich Metadata**: Every entity has context, parameters, explanations
6. **Governance Included**: High-stakes decisions with proper controls
7. **Time-Tested**: Shows how decisions age, degrade, and get deprecated
8. **Conflict-Rich**: Multiple active conflicts to test resolution workflows
9. **Non-Technical**: Accessible to all stakeholders, not just engineers
10. **Production-Ready**: Schema-compliant, RLS-compatible, properly normalized

---

## 📖 Documentation Structure

```
backend/scripts/
├── seed-plot-armor-complete.ts          # Main seeding script (1,200 lines)
├── PLOT-ARMOR-SEEDER-README.md          # Full documentation (700 lines)
├── PLOT-ARMOR-QUICK-REFERENCE.md        # Quick lookup guide (400 lines)
└── PLOT-ARMOR-IMPLEMENTATION-SUMMARY.md # This file (overview)
```

**Total Documentation**: ~2,300 lines across 4 files

---

## 🔧 Customization Points

### Change Organization Name

Line 119 in `seed-plot-armor-complete.ts`:

```typescript
.ilike('name', '%YOUR ORG NAME%')
```

### Adjust Time Span

Lines 63-71 - modify `daysAgo()` calls:

```typescript
created_at: daysAgo(90); // Change to your desired lookback
```

### Add More Decisions

Lines 280-650 - add to `decisionsData` array:

```typescript
{
  title: 'Your Decision',
  category: 'Category',
  // ... other fields
}
```

### Modify Conflict Scenarios

Lines 875-955 - add to `decisionConflictsData`:

```typescript
{
  decisionA: 'Decision A Title',
  decisionB: 'Decision B Title',
  conflict_type: 'RESOURCE_COMPETITION',
  // ... other fields
}
```

---

## ✅ Validation Checklist

After running the seeder, verify:

- [ ] 24 decisions created across 7 categories
- [ ] 14 assumptions (mix of VALID/SHAKY/BROKEN)
- [ ] 6 constraints with realistic validation
- [ ] 6 decision conflicts (3 resolved, 3 active)
- [ ] 4 assumption conflicts
- [ ] 4 constraint violations
- [ ] 30+ decision-assumption links
- [ ] 15+ decision-constraint links
- [ ] 7 dependency chains
- [ ] 17 decision signals (all types)
- [ ] 35+ decision versions
- [ ] 12 decision reviews
- [ ] 10+ evaluation history records
- [ ] 10+ governance audit logs
- [ ] 12 notifications (mix of severities)
- [ ] Organization profile populated
- [ ] Parameter templates created
- [ ] All foreign keys valid
- [ ] No constraint violations in database
- [ ] RLS policies allowing access

---

## 🐛 Common Issues & Solutions

### Issue: "Organization not found"

**Solution**: Update line 119 with your actual organization name, or create "PLOT ARMOR" organization first

### Issue: "No users found"

**Solution**: Register at least one user in the PLOT ARMOR organization

### Issue: Foreign key constraint violations

**Solution**: Run `npm run clear-db` first to clean up orphaned records

### Issue: Timeout during seeding

**Solution**: Check Supabase connection, verify service role key is correct

### Issue: Some records missing

**Solution**: Check console output for specific errors, verify RLS policies allow service role

---

## 📞 Support Resources

- **Full README**: Open `PLOT-ARMOR-SEEDER-README.md` for detailed guide
- **Quick Reference**: Open `PLOT-ARMOR-QUICK-REFERENCE.md` for data structure
- **Source Code**: Review `seed-plot-armor-complete.ts` with inline comments
- **Schema**: Check `backend/schema.sql` for database structure
- **Migrations**: See `backend/migrations/` for schema evolution

---

## 🎉 Success Metrics

You'll know the seeder worked when:

1. ✅ Console shows "PLOT ARMOR DATA SEEDING COMPLETE!" with summary
2. ✅ Decisions page shows 24 decisions with various health signals
3. ✅ Conflicts page shows 6 decision conflicts and 4 assumption conflicts
4. ✅ Review dashboard highlights 4 high-urgency decisions
5. ✅ Notifications panel shows 12 notifications (5 critical warnings)
6. ✅ Version history shows complete audit trail for any decision
7. ✅ Governance dashboard shows 2 locked decisions requiring approval
8. ✅ Charts and analytics render with rich data
9. ✅ No console errors or missing relationships
10. ✅ All features of Decivue are demonstrable with this dataset

---

## 🎬 Next Steps

1. **Run the seeder**: `npm run seed-plot-armor`
2. **Explore the data**: Use Quick Reference as your guide
3. **Test features**: Work through the 8 testing scenarios
4. **Customize**: Add your own decisions, conflicts, or constraints
5. **Generate reports**: Use the data for executive summaries
6. **Demo the system**: Show off complete Decivue functionality
7. **Build on it**: Extend with additional conflicts or time periods

---

**Created**: February 17, 2026  
**Organization**: Plot Armor Coffee Co.  
**Purpose**: Comprehensive feature demonstration  
**Records**: 150+  
**Time Span**: 220 days  
**Status**: Production-ready ✅
