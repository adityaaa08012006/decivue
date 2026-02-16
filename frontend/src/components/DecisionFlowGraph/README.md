# Decision Flow Graph - React Flow Implementation

## Overview

This is a React Flow visualization that displays decision relationships by fetching data from your existing Supabase/REST API backend.

## Architecture

### Components

1. **DecisionNode.jsx** - Custom rectangular node for decisions
   - Shows title, description, and status badge
   - Color-coded border based on lifecycle (STABLE, AT_RISK, etc.)
   - Handles for incoming/outgoing connections

2. **OrgAssumptionNode.jsx** - Custom circular node for organizational assumptions
   - Small circular design
   - Shows label only (no status badge in graph)
   - Highlights when clicked

3. **DecisionDetailPanel.jsx** - Right-side panel
   - Opens when clicking a decision node
   - Shows BOTH organizational and decision-specific assumptions
   - Clearly separated sections

4. **index.jsx** - Main graph component
   - Fetches data from APIs
   - Transforms backend data into React Flow format
   - Handles click interactions

## Graph Elements

### Nodes

- **Decision nodes**: Rectangular, show title + status, color-coded
- **Organizational assumption nodes**: Circular, purple, show short label

### Edges

- **Decision → Decision**: Solid blue arrows (dependencies)
- **Org Assumption → Decision**: Dotted purple lines (no arrowhead)

### Why Only Org Assumptions Appear in Graph

- Decision-specific assumptions are unique to ONE decision
- Showing them would clutter the visualization
- They're revealed in the detail panel when clicking a decision
- Organizational assumptions affect MULTIPLE decisions, making them valuable to visualize

## Data Flow

### APIs Used

```javascript
// Fetch all decisions
GET /decisions

// Fetch all assumptions (filtered by scope)
GET /assumptions

// Fetch assumptions for specific decision
GET /assumptions?decisionId=X

// Fetch dependencies for a decision
GET /dependencies?decisionId=X
```

### Data Transformation

1. Backend returns normalized relational data (IDs, foreign keys)
2. Frontend transforms into React Flow format:
   ```javascript
   {
     nodes: [
       { id: 'decision-123', type: 'decision', position: {x, y}, data: {...} },
       { id: 'org-assumption-456', type: 'orgAssumption', position: {x, y}, data: {...} }
     ],
     edges: [
       { source: 'decision-123', target: 'decision-789', type: 'default' },
       { source: 'org-assumption-456', target: 'decision-123', style: { strokeDasharray: '5,5' } }
     ]
   }
   ```

## User Interactions

### Click a Decision Node

1. Opens right-side detail panel
2. Fetches assumptions via `GET /assumptions?decisionId=X`
3. Separates by scope:
   - `scope === 'UNIVERSAL'` → Organizational assumptions
   - `scope === 'DECISION_SPECIFIC'` → Decision-specific assumptions
4. Displays both sections clearly

### Click an Org Assumption Node

1. Highlights all connected decisions
2. Does NOT open detail panel
3. Click again to un-highlight

## Integration with Your App

### Step 1: Import the Component

```jsx
import DecisionFlowGraph from "./components/DecisionFlowGraph";
```

### Step 2: Use in Your Dashboard

```jsx
function Dashboard() {
  return (
    <div className="h-screen">
      <DecisionFlowGraph />
    </div>
  );
}
```

### Step 3: Ensure API Service Exists

The component uses `api.js` service which should have:

- `getDecisions()`
- `getAssumptions(decisionId, includeConflicts)`
- `getDependencies(decisionId)`

### Step 4: Backend Requirements

Your backend must:

- Filter data by `organizationId` (from authenticated user)
- Return assumptions with `scope` field ('UNIVERSAL' or 'DECISION_SPECIFIC')
- Support querying linked assumptions via `decision_assumptions` junction table

## Database Schema Requirements

```sql
-- Decisions table
CREATE TABLE decisions (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT CHECK (lifecycle IN ('STABLE', 'UNDER_REVIEW', 'AT_RISK', 'INVALIDATED', 'RETIRED')),
  organization_id UUID NOT NULL
);

-- Assumptions table with scope
CREATE TABLE assumptions (
  id UUID PRIMARY KEY,
  description TEXT NOT NULL,
  status TEXT CHECK (status IN ('VALID', 'SHAKY', 'BROKEN')),
  scope TEXT CHECK (scope IN ('UNIVERSAL', 'DECISION_SPECIFIC')) DEFAULT 'UNIVERSAL',
  organization_id UUID NOT NULL
);

-- Junction table for many-to-many relationship
CREATE TABLE decision_assumptions (
  decision_id UUID REFERENCES decisions(id),
  assumption_id UUID REFERENCES assumptions(id),
  PRIMARY KEY (decision_id, assumption_id)
);

-- Dependencies table
CREATE TABLE dependencies (
  id UUID PRIMARY KEY,
  source_decision_id UUID REFERENCES decisions(id),
  target_decision_id UUID REFERENCES decisions(id)
);
```

## Features

✅ Graph visualization with React Flow
✅ Custom node types (decisions + org assumptions)
✅ Edge types (solid arrows for dependencies, dotted lines for assumptions)
✅ Click decision → see org + decision-specific assumptions
✅ Click org assumption → highlight connected decisions
✅ Fetches real data from backend APIs
✅ No mocked business logic or authentication
✅ Responsive design with mini-map and controls

## Customization

### Layout

Currently uses simple vertical layout. To customize:

```javascript
// In transformDataToGraph()
decisions.forEach((decision, index) => {
  graphNodes.push({
    position: { x: 250, y: index * 200 }, // Change this
    ...
  });
});
```

Consider using:

- Dagre for automatic hierarchical layout
- Force-directed layout for organic clustering
- Custom algorithm based on dependencies

### Styling

- Edit `DecisionNode.jsx` for decision appearance
- Edit `OrgAssumptionNode.jsx` for assumption appearance
- Edit `styles.css` for animations and effects

### Additional Features

- Add filtering by lifecycle status
- Add search functionality
- Add zoom to node on select
- Add automatic layout algorithms
- Add export to image

## Performance Considerations

For large graphs (100+ nodes):

- Consider pagination or filtering
- Implement virtual rendering
- Add loading states for individual fetches
- Optimize re-renders with React.memo

## Troubleshooting

**Problem**: Assumptions not showing in detail panel

- Check that assumptions have `scope` field populated
- Verify `decision_assumptions` junction table has links
- Check console logs for API response structure

**Problem**: Dependencies not showing as edges

- Ensure backend returns dependencies for each decision
- Check that decision IDs match in dependencies table
- Verify graph transformation logic

**Problem**: Layout looks cramped

- Adjust `position` values in `transformDataToGraph()`
- Use `fitViewOptions` padding parameter
- Implement automatic layout algorithm

## Next Steps

1. ✅ Install React Flow: `npm install @xyflow/react`
2. ✅ Create custom nodes
3. ✅ Create main graph component
4. ✅ Create detail panel
5. ✅ Implement data fetching
6. ✅ Add click handlers
7. 🔲 Integrate into your main app
8. 🔲 Test with real backend data
9. 🔲 Add automatic layout (optional)
10. 🔲 Add filtering/search (optional)
