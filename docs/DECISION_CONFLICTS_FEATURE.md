# Decision Conflicts Feature

## Overview

The Decision Conflicts system automatically detects contradictions between decisions across your organization, even when decisions are not explicitly linked. This feature helps maintain consistency in decision-making and ensures decisions don't work against each other.

## Key Features

### 1. Automatic Conflict Detection

The system uses semantic analysis to detect five major types of conflicts:

#### Conflict Types:

1. **CONTRADICTORY** - Direct contradiction in actions or goals
   - Example: "Reduce spending" vs "Hire 5 more vendors"
2. **RESOURCE_COMPETITION** - Competing for the same limited resources
   - Example: Two decisions both allocating the same budget
3. **OBJECTIVE_UNDERMINING** - One decision undermines another's objectives
   - Example: "Improve product quality" vs "Cut production costs by 50%"
4. **PREMISE_INVALIDATION** - A newer decision invalidates an older one's premise
   - Example: Newer decision changes fundamental assumptions of older decision
5. **MUTUALLY_EXCLUSIVE** - Both decisions cannot coexist
   - Example: "Centralize operations" vs "Decentralize operations"

### 2. Natural Language Explanations

Each detected conflict includes:

- Confidence score (0-100%)
- Conflict type classification
- Natural language explanation of why these decisions conflict
- References to both conflicting decisions

### 3. Resolution Actions

When a conflict is detected, users can choose from several resolution strategies:

- **Prioritize Decision A** - Keep A, reconsider B
- **Prioritize Decision B** - Keep B, reconsider A
- **Modify Both** - Both need adjustment to coexist
- **Deprecate Both** - Both are invalid
- **Keep Both** - False positive, both can coexist
- **Mark as False Positive** - Delete the conflict record

## Database Schema

### decision_conflicts Table

```sql
CREATE TABLE decision_conflicts (
  id UUID PRIMARY KEY,
  decision_a_id UUID NOT NULL,
  decision_b_id UUID NOT NULL,
  conflict_type TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  resolution_notes TEXT,
  explanation TEXT NOT NULL,
  organization_id UUID NOT NULL,
  metadata JSONB
);
```

## Backend Implementation

### Services

**File:** `backend/src/services/decision-conflict-detector.ts`

The `DecisionConflictDetector` class implements **five detection strategies**, prioritized by accuracy:

#### Strategy 0: Structured Parameter Conflict Detection (NEW)

**Most Accurate** - Uses explicitly structured data from dropdown parameters

- Works when both decisions have category and parameters from dropdown selections
- Supports multiple decision categories:
  - **Budget & Financial**: Detects conflicting budget allocations, contradictory directions (Increase vs Decrease)
  - **Resource Allocation**: Identifies conflicting resource actions (Allocate vs Deallocate, Hire vs Layoff)
  - **Timeline & Milestones**: Finds incompatible target dates or timeline expectations
  - **Strategic Initiative**: Detects conflicting priorities or contradictory directions on same impact area
  - **Technical Architecture**: Identifies mutually exclusive technology choices or architectural approaches
- Confidence: 78-96% (highest confidence due to structured data)
- Similar to assumption conflicts in structured mode

#### Strategy 1: Resource Competition Detection

- Identifies shared resource keywords (budget, headcount, time, etc.)
- Checks for allocation/usage patterns
- Confidence: 70-85%

#### Strategy 2: Contradictory Actions Detection

- Matches opposing action pairs (increase/decrease, expand/reduce, etc.)
- Finds common context between decisions
- Confidence: 80%

#### Strategy 3: Objective Undermining Detection

- Identifies goal/objective keywords
- Detects undermining patterns
- Confidence: 75%

#### Strategy 4: Premise Invalidation Detection

- Compares decision timestamps
- Looks for invalidation keywords in newer decisions
- Checks for negation patterns
- Confidence: 70-80%

### API Routes

**File:** `backend/src/api/routes/decision-conflicts.ts`

#### Endpoints:

- `GET /api/decision-conflicts` - Get all conflicts (with filter options)
- `GET /api/decision-conflicts/:decisionId` - Get conflicts for specific decision
- `POST /api/decision-conflicts/detect` - Run conflict detection
- `PUT /api/decision-conflicts/:id/resolve` - Resolve a conflict
- `DELETE /api/decision-conflicts/:id` - Delete a conflict (false positive)

## Frontend Implementation

### Components

#### 1. DecisionConflictsPage

**File:** `frontend/src/components/DecisionConflictsPage.jsx`

A dedicated page for viewing and managing all decision conflicts:

- Filter by conflict type
- Search by decision title or explanation
- Statistics dashboard showing conflict counts by type
- Side-by-side decision comparison
- One-click resolution workflow

#### 2. DecisionConflictModal

**File:** `frontend/src/components/DecisionConflictModal.jsx`

Modal dialog for resolving individual conflicts:

- Displays both conflicting decisions
- Shows conflict explanation and confidence score
- Radio button selection for resolution action
- Optional resolution notes
- Mark as false positive option

#### 3. Integration with DecisionMonitoring

**File:** `frontend/src/components/DecisionMonitoring.jsx`

Decision details view now shows:

- Decision conflict badges in decision cards
- Dedicated "Decision Conflicts" section in expanded view
- Conflicts affect decision lifecycle status
- Link to full Decision Conflicts page

### Navigation

Added to sidebar under "ANALYTICS" section:

- "Decision Conflicts" menu item with AlertTriangle icon
- Accessible via `currentView === 'decision-conflicts'`

## Usage Workflow

### 1. Detect Conflicts

```javascript
// Detect conflicts across all decisions
const result = await api.detectDecisionConflicts();
// Returns: { conflictsDetected: 5, totalConflictsFound: 7, conflicts: [...] }

// Detect conflicts for specific decisions
const result = await api.detectDecisionConflicts([decisionId1, decisionId2]);
```

### 2. View Conflicts

Users can:

- Navigate to "Decision Conflicts" page from sidebar
- See conflicts in DecisionMonitoring expanded view
- Filter by conflict type
- Search by decision title or explanation

### 3. Resolve Conflicts

For each conflict, users can:

1. Review both decisions side-by-side
2. Read the natural language explanation
3. Select a resolution action
4. Add optional notes
5. Submit resolution

### 4. False Positives

If the system incorrectly flags a conflict:

- Click "Mark as False Positive"
- Conflict is permanently deleted
- Helps improve future detection accuracy

## Semantic Detection Logic

### Resource Keywords

The system recognizes these resource types:

- **Financial:** budget, money, cost, spending, expense, investment, fund
- **Human Resources:** hire, headcount, staff, team, employee, personnel
- **Time:** time, resource, capacity, bandwidth
- **Physical:** space, office, facility, equipment

### Action Conflicts

Detected opposing actions:

- increase/decrease, reduce/expand, more/less
- hire/layoff, add/remove, start/stop
- create/delete, build/dismantle, grow/shrink
- accelerate/slow, prioritize/deprioritize
- invest/divest, acquire/sell, centralize/decentralize

### Confidence Thresholds

- Conflicts with confidence ≥ 65% are recorded
- High confidence (≥ 80%): Likely genuine conflict
- Medium confidence (70-79%): Review recommended
- Lower confidence (65-69%): Potential conflict, may be false positive

## Using Structured Parameters for Enhanced Conflict Detection

### Overview

When creating decisions using **dropdown parameters** (structured mode), the system can detect conflicts with much higher accuracy (78-96% confidence) compared to text-based analysis. This is similar to how assumption conflicts work in structured mode.

### Supported Decision Categories with Structured Parameters:

#### 1. Budget & Financial

**Parameters:**

- `amount`: Budget amount (e.g., "500000")
- `timeframe`: Time period (e.g., "Q3 2026")
- `direction`: Increase, Decrease, Approve, Reject
- `resourceType`: Type of budget resource
- `allocation`: Specific allocation details

**Example Conflicts Detected:**

- Different budget amounts for same timeframe (92% confidence)
- Opposite directions (Increase vs Decrease) on same budget (95% confidence)
- Same resource with different allocations (88% confidence)

#### 2. Resource Allocation

**Parameters:**

- `resourceType`: Personnel, Budget, Equipment, etc.
- `timeframe`: When the allocation applies
- `action`: Allocate, Deallocate, Add, Remove, Hire, Layoff, Increase, Decrease
- `quantity`: Amount of resource

**Example Conflicts Detected:**

- Contradictory actions on same resource in same timeframe (94% confidence)
- Resource competition for same type + timeframe (82% confidence)

#### 3. Timeline & Milestones

**Parameters:**

- `milestone`: Milestone name or identifier
- `targetDate`: Target completion date
- `expectation`: Accelerate, Delay, On Track, At Risk, Meet Deadline, Miss Deadline

**Example Conflicts Detected:**

- Same milestone with different target dates (90% confidence)
- Incompatible timeline expectations (93% confidence)

#### 4. Strategic Initiative

**Parameters:**

- `priority`: Critical, High, Medium, Low
- `impactArea`: Revenue, Cost, Timeline, Quality, etc.
- `direction`: Increase, Decrease, Improve, Reduce, Expand, Contract, Grow, Shrink

**Example Conflicts Detected:**

- Same impact area with different priorities (78% confidence)
- Opposite directions on same impact area (96% confidence)

#### 5. Technical Architecture

**Parameters:**

- `component`: System component or module
- `technology`: Specific technology choice
- `approach`: Monolith, Microservices, Centralized, Distributed, SQL, NoSQL, etc.

**Example Conflicts Detected:**

- Different technologies for same component (91% confidence)
- Conflicting architectural approaches (89% confidence)

### How to Use Structured Parameters:

1. **When Creating a Decision:**
   - Select a category from the dropdown
   - Fill in the structured parameter fields
   - The more parameters you provide, the better the conflict detection

2. **Parameter Best Practices:**
   - Be consistent with terminology across decisions
   - Use the provided dropdown options when available
   - Fill in all relevant parameters, especially:
     - `timeframe` for budget and resource decisions
     - `impactArea` and `direction` for strategic initiatives
     - `resourceType` for allocation decisions

3. **Benefits:**
   - **Higher Confidence**: Structured conflicts have 78-96% confidence vs 65-85% for text-based
   - **Fewer False Positives**: Parameters are explicit, no ambiguity
   - **Better Explanations**: System can reference specific parameter conflicts
   - **Automatic Resolution Suggestions**: System can suggest specific parameter changes

## Best Practices

### For Organizations

1. **Run Regular Detection**
   - Schedule weekly conflict detection
   - Run after major decision-making sessions

2. **Resolve Promptly**
   - Don't let conflicts accumulate
   - High-confidence conflicts should be addressed first

3. **Document Resolutions**
   - Always add resolution notes
   - Explain why you chose a particular resolution action

4. **Review False Positives**
   - Track patterns in false positives
   - Help improve the detection algorithm

### For Decision Authors

1. **Be Descriptive**
   - Use clear, specific language in decisions
   - Mention resources explicitly

2. **Check for Conflicts**
   - Before finalizing a decision, check the conflicts page
   - Review conflicts with your decision immediately

3. **Coordinate**
   - When conflicts arise, coordinate with other decision authors
   - Consider modifying both decisions to work together

## Migration

To add this feature to an existing database:

```bash
# Apply the migration
psql -d your_database -f backend/migrations/019_add_decision_conflicts.sql
```

The migration creates:

- `decision_conflicts` table
- RLS policies for organization scoping
- Helper functions for querying conflicts
- Proper indexes for performance

## Example Scenarios

### Scenario 1: Budget Conflict

**Decision A:** "Allocate $500K to marketing campaign"
**Decision B:** "Use $500K budget surplus for R&D expansion"

**Detection:**

- Type: RESOURCE_COMPETITION
- Confidence: 85%
- Explanation: "Both decisions compete for limited budget resources..."

### Scenario 2: Contradictory Goals

**Decision A:** "Reduce operational costs by 30%"
**Decision B:** "Hire 10 new support staff"

**Detection:**

- Type: CONTRADICTORY
- Confidence: 80%
- Explanation: "Direct contradiction: Decision A aims to reduce while Decision B aims to hire..."

### Scenario 3: Premise Invalidation

**Decision A (Older):** "Expand to European market based on current regulations"
**Decision B (Newer):** "Do not expand internationally - new regulations prohibit our business model abroad"

**Detection:**

- Type: PREMISE_INVALIDATION
- Confidence: 75%
- Explanation: "The newer decision may invalidate the premise of the earlier decision..."

## Future Enhancements

Potential improvements for future versions:

1. Machine learning for improved detection accuracy
2. Automatic suggestion of resolution actions
3. Conflict prediction before decision finalization
4. Integration with external AI services for deeper semantic analysis
5. Historical conflict patterns and analytics
6. Automated notifications when new conflicts are detected

## Technical Notes

### Performance Considerations

- Conflict detection runs on-demand, not automatically
- Detection compares all decision pairs: O(n²) complexity
- Use `decisionIds` parameter to limit scope for large organizations
- Indexes on organization_id and decision IDs ensure fast queries

### Security

- All operations respect organization-level RLS
- Users can only see conflicts for decisions in their organization
- Resolution actions are logged with timestamps

### Monitoring

- All conflict operations are logged
- Confidence scores help track detection quality
- Resolution patterns can be analyzed for insights

## Support

For issues or questions about the Decision Conflicts feature:

1. Check the logs for detection details
2. Review confidence scores for borderline cases
3. Use resolution notes to document edge cases
4. Report persistent false positives for algorithm improvement
