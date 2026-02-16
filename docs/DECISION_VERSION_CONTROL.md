# Decision Version Control System

## Overview

Complete version control and change tracking system for decisions, tracking field changes, relationship modifications, and health signal variations with full explanations.

## Database Schema

### 1. **decision_versions** Table

Stores complete snapshots of decision state on every significant change.

**Fields:**

- `version_number` - Sequential version (1, 2, 3...)
- `title`, `description`, `category`, `parameters` - Snapshot of decision fields
- `lifecycle`, `health_signal` - State at this version
- `change_type` - What kind of change: `created | field_updated | lifecycle_changed | manual_review`
- `change_summary` - Human-readable summary
- `changed_fields` - JSON array of fields that changed: `["title", "description"]`
- `changed_by` - User who made the change
- `changed_at` - Timestamp

**When to create versions:**

- Decision created (initial version)
- User edits title, description, category, or parameters
- Manual lifecycle change
- Manual review action

### 2. **decision_relation_changes** Table

Tracks when assumptions, constraints, or dependencies are linked/unlinked.

**Fields:**

- `relation_type` - `assumption | constraint | dependency`
- `relation_id` - UUID of the related entity
- `action` - `linked | unlinked`
- `relation_description` - Cached description for display
- `changed_by` - User who linked/unlinked
- `changed_at` - Timestamp
- `reason` - Optional explanation

**When to create entries:**

- Assumption linked to decision
- Assumption unlinked from decision
- Constraint linked to decision
- Constraint unlinked from decision
- Dependency created
- Dependency removed

### 3. **evaluation_history** Enhancements

Existing table now includes:

- `change_explanation` - Why health/lifecycle changed
- `triggered_by` - `automatic | manual_review | assumption_change | constraint_change`

**Automatic explanations generated from trace:**

- "Constraint violated: [constraint name]"
- "Assumption broken: [assumption description]"
- "Dependency health propagated from [decision title]"
- "Time-based decay: [X] days since last review"

### 4. **decisions** Table Additions

- `modified_at` - Last modification timestamp
- `modified_by` - User who last modified

## Database Functions

### `create_decision_version()`

Creates a new version snapshot.

```sql
SELECT create_decision_version(
  p_decision_id := 'uuid-here',
  p_change_type := 'field_updated',
  p_change_summary := 'Updated title and description',
  p_changed_fields := ARRAY['title', 'description'],
  p_changed_by := 'user-uuid'
);
```

### `track_relation_change()`

Records assumption/constraint/dependency linking.

```sql
SELECT track_relation_change(
  p_decision_id := 'decision-uuid',
  p_relation_type := 'assumption',
  p_relation_id := 'assumption-uuid',
  p_action := 'linked',
  p_relation_description := 'Customer will approve budget by Q2',
  p_changed_by := 'user-uuid',
  p_reason := 'New assumption identified during review'
);
```

### RPC Functions for Frontend

#### `get_decision_version_history(decision_id)`

Returns all versions with field snapshots.

**Returns:**

```json
[
  {
    "version_number": 3,
    "change_type": "field_updated",
    "change_summary": "Updated category to Strategic Initiative",
    "changed_fields": ["category"],
    "changed_by_email": "user@example.com",
    "changed_at": "2026-02-16T10:30:00Z",
    "title": "Launch New Product Line",
    "lifecycle": "STABLE",
    "health_signal": 85
  }
]
```

#### `get_decision_relation_history(decision_id)`

Returns all assumption/constraint/dependency changes.

**Returns:**

```json
[
  {
    "relation_type": "assumption",
    "action": "linked",
    "relation_description": "Market research shows demand",
    "changed_by_email": "user@example.com",
    "changed_at": "2026-02-15T14:20:00Z",
    "reason": "Supporting data from Q4 analysis"
  }
]
```

#### `get_decision_health_history(decision_id)`

Returns health/lifecycle changes with explanations.

**Returns:**

```json
[
  {
    "old_health_signal": 95,
    "new_health_signal": 75,
    "health_change": -20,
    "old_lifecycle": "STABLE",
    "new_lifecycle": "UNDER_REVIEW",
    "change_explanation": "Assumption broken: Budget approval deadline missed",
    "triggered_by": "assumption_change",
    "evaluated_at": "2026-02-16T09:00:00Z"
  }
]
```

#### `get_decision_change_timeline(decision_id)`

**COMPREHENSIVE** - Combines all history types in chronological order.

**Returns:**

```json
[
  {
    "event_type": "health_change",
    "event_time": "2026-02-16T09:00:00Z",
    "summary": "Health dropped: Assumption broken",
    "details": {
      "old_health_signal": 95,
      "new_health_signal": 75,
      "triggered_by": "assumption_change"
    }
  },
  {
    "event_type": "relation_change",
    "event_time": "2026-02-15T14:20:00Z",
    "changed_by_email": "user@example.com",
    "summary": "Linked assumption: Market research shows demand",
    "details": {
      "relation_type": "assumption",
      "action": "linked"
    }
  },
  {
    "event_type": "field_change",
    "event_time": "2026-02-14T10:30:00Z",
    "changed_by_email": "user@example.com",
    "summary": "Updated category to Strategic Initiative",
    "details": {
      "version_number": 2,
      "changed_fields": ["category"]
    }
  }
]
```

## Backend API Changes Needed

### 1. Update Decision Edit Endpoint

**Location:** `backend/src/api/routes/decisions.ts`

**Before saving decision update:**

```typescript
// Determine which fields changed
const changedFields: string[] = [];
if (req.body.title !== currentDecision.title) changedFields.push("title");
if (req.body.description !== currentDecision.description)
  changedFields.push("description");
if (req.body.category !== currentDecision.category)
  changedFields.push("category");
// ... etc

// Update decision
await db
  .from("decisions")
  .update({
    title: req.body.title,
    description: req.body.description,
    modified_at: new Date().toISOString(),
    modified_by: req.user.id,
  })
  .eq("id", decisionId);

// Create version snapshot
if (changedFields.length > 0) {
  await db.rpc("create_decision_version", {
    p_decision_id: decisionId,
    p_change_type: "field_updated",
    p_change_summary: generateChangeSummary(changedFields),
    p_changed_fields: changedFields,
    p_changed_by: req.user.id,
  });
}
```

### 2. Track Assumption Linking/Unlinking

**Location:** `backend/src/api/routes/decisions.ts` (link/unlink endpoints)

```typescript
// When linking assumption
await db.from("decision_assumptions").insert({
  decision_id: decisionId,
  assumption_id: assumptionId,
});

// Track the change
await db.rpc("track_relation_change", {
  p_decision_id: decisionId,
  p_relation_type: "assumption",
  p_relation_id: assumptionId,
  p_action: "linked",
  p_relation_description: assumption.description,
  p_changed_by: req.user.id,
  p_reason: req.body.reason || null,
});
```

### 3. Enhance Evaluation History Recording

**Location:** `backend/src/api/routes/decisions.ts` (evaluation trigger)

```typescript
// After evaluation
await db.from("evaluation_history").insert({
  decision_id: decisionId,
  old_lifecycle: oldLifecycle,
  new_lifecycle: result.newLifecycle,
  old_health_signal: oldHealthSignal,
  new_health_signal: result.newHealthSignal,
  trace: result.trace,
  change_explanation: generateChangeExplanation(result),
  triggered_by: triggerSource, // 'automatic' | 'assumption_change' | etc
});
```

### 4. New API Endpoints

```typescript
// GET /api/decisions/:id/versions
router.get("/:id/versions", async (req, res) => {
  const { data } = await db.rpc("get_decision_version_history", {
    p_decision_id: req.params.id,
  });
  return res.json(data);
});

// GET /api/decisions/:id/relation-history
router.get("/:id/relation-history", async (req, res) => {
  const { data } = await db.rpc("get_decision_relation_history", {
    p_decision_id: req.params.id,
  });
  return res.json(data);
});

// GET /api/decisions/:id/health-history
router.get("/:id/health-history", async (req, res) => {
  const { data } = await db.rpc("get_decision_health_history", {
    p_decision_id: req.params.id,
  });
  return res.json(data);
});

// GET /api/decisions/:id/timeline (comprehensive)
router.get("/:id/timeline", async (req, res) => {
  const { data } = await db.rpc("get_decision_change_timeline", {
    p_decision_id: req.params.id,
  });
  return res.json(data);
});
```

## Frontend Changes Needed

### 1. Add to `frontend/src/services/api.js`

```javascript
// Get decision version history
async getDecisionVersions(decisionId) {
  return this.request(`/decisions/${decisionId}/versions`);
}

// Get relation change history
async getDecisionRelationHistory(decisionId) {
  return this.request(`/decisions/${decisionId}/relation-history`);
}

// Get health change history
async getDecisionHealthHistory(decisionId) {
  return this.request(`/decisions/${decisionId}/health-history`);
}

// Get comprehensive timeline
async getDecisionTimeline(decisionId) {
  return this.request(`/decisions/${decisionId}/timeline`);
}
```

### 2. Create `DecisionVersionsModal.jsx`

**Features:**

- Tabbed interface: "All Changes" | "Field Changes" | "Assumptions" | "Health History"
- Timeline view with icons for different event types
- Diff view showing what changed between versions
- Health drop explanations with color coding
- User avatars and timestamps

**Component structure:**

```jsx
const DecisionVersionsModal = ({ decision, onClose }) => {
  const [activeTab, setActiveTab] = useState("timeline");
  const [timeline, setTimeline] = useState([]);
  const [versions, setVersions] = useState([]);
  const [relationHistory, setRelationHistory] = useState([]);
  const [healthHistory, setHealthHistory] = useState([]);

  useEffect(() => {
    // Fetch all history data
    const fetchHistory = async () => {
      const [timelineData, versionsData, relationsData, healthData] =
        await Promise.all([
          api.getDecisionTimeline(decision.id),
          api.getDecisionVersions(decision.id),
          api.getDecisionRelationHistory(decision.id),
          api.getDecisionHealthHistory(decision.id),
        ]);
      // ...
    };
  }, [decision.id]);

  return (
    <Modal>
      <Tabs>
        <Tab name="timeline">All Changes</Tab>
        <Tab name="versions">Field Changes</Tab>
        <Tab name="assumptions">Assumptions & Constraints</Tab>
        <Tab name="health">Health History</Tab>
      </Tabs>

      {activeTab === "timeline" && <TimelineView data={timeline} />}
      {activeTab === "versions" && <VersionsView data={versions} />}
      {activeTab === "assumptions" && <RelationsView data={relationHistory} />}
      {activeTab === "health" && <HealthHistoryView data={healthHistory} />}
    </Modal>
  );
};
```

### 3. Add to `DecisionMonitoring.jsx`

**Add "Versions" button to each decision card:**

```jsx
<button
  onClick={() => setSelectedDecisionForVersions(decision)}
  className="btn-versions"
  title="View version history"
>
  <History size={16} />
  Versions
</button>;

{
  selectedDecisionForVersions && (
    <DecisionVersionsModal
      decision={selectedDecisionForVersions}
      onClose={() => setSelectedDecisionForVersions(null)}
    />
  );
}
```

## UI Design Recommendations

### Timeline View (Comprehensive)

```
┌─────────────────────────────────────────────────┐
│ 🔵 Health Changed           2 hours ago         │
│ System Evaluation                               │
│ Health: 85% → 75% (-10)                        │
│ Reason: Assumption "Budget approval" broken     │
│ Lifecycle: STABLE → UNDER_REVIEW               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 🔗 Assumption Linked       Yesterday            │
│ user@example.com                                │
│ Linked: "Market analysis shows 20% growth"     │
│ Reason: Supporting Q4 research data            │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ✏️ Fields Updated          2 days ago           │
│ user@example.com                                │
│ Category changed to "Strategic Initiative"      │
│ Fields updated: category, parameters            │
└─────────────────────────────────────────────────┘
```

### Health History View

```
Health Signal Over Time
     95% ─┐
         │  ╲
     75% │   ●───── Assumption broken
         │         "Budget approval missed"
     50% │
         └─────────────────────────────────
           Jan 1    Jan 15    Feb 1   Feb 16

Recent Health Changes:
• 95% → 75% (-20)  Assumption broken: Budget approval
• 80% → 95% (+15)  Manual review: All constraints verified
• 90% → 80% (-10)  Time decay: 30 days since last review
```

### Version Comparison

```
Version 3 vs Version 2          Changed by: user@example.com

Title:          [No changes]
Description:    [No changes]
Category:       Budget & Financial → Strategic Initiative
Parameters:     {...}  [View diff]
```

## Migration Instructions

1. **Run migration:**

   ```bash
   cd backend
   tsx scripts/run-migration.ts 016_add_decision_version_control.sql
   ```

2. **Verify tables created:**
   - `decision_versions`
   - `decision_relation_changes`

3. **Verify functions created:**
   - `create_decision_version()`
   - `track_relation_change()`
   - `get_decision_version_history()`
   - `get_decision_relation_history()`
   - `get_decision_health_history()`
   - `get_decision_change_timeline()`

4. **Test with existing data:**
   - Check that initial versions were created for all decisions
   - Verify version_number starts at 1

## Testing Strategy

1. **Create new decision** → Verify version 1 created
2. **Edit decision title** → Verify version 2 created with changed_fields
3. **Link assumption** → Verify relation_change record created
4. **Trigger evaluation** → Verify evaluation_history has explanation
5. **Fetch timeline** → Verify all events appear in order
6. **Compare versions** → Verify field differences show correctly

## Performance Considerations

- Indexes on `decision_id` and timestamps for fast queries
- Version snapshots are small (text fields only, no large binaries)
- Timeline function uses UNION ALL (no deduplication overhead)
- Consider archiving versions older than 1 year if volume grows

## Future Enhancements

- Compare any two versions (not just consecutive)
- Restore to previous version
- Export version history as PDF
- Notifications when health drops significantly
- AI-generated change summaries
