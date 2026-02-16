# Swimlane DAG Layout - Implementation Guide

## 🎯 Overview

This is a **professional, auto-layouted decision flow visualization** using:
- **React Flow** for the canvas and node management
- **ELKjs** (Eclipse Layout Kernel) for automatic swimlane-based graph layout
- **Horizontal Left-to-Right flow** (Inputs → Decisions → Outcomes)
- **Swimlane organization** by category (Strategy, Technical, Operations, etc.)
- **Clean orthogonal edges** with no manual node placement needed

---

## 📊 Sample JSON Data Structure

### **1. Decision Node Format**

```json
{
  "id": "dec-001",
  "title": "Adopt Microservices Architecture",
  "description": "Transition from monolithic to microservices for better scalability",
  "lifecycle": "STABLE",
  "health_signal": 85,
  "metadata": {
    "category": "Technical",
    "stage": "decision",
    "owner": "CTO",
    "created_at": "2025-01-15"
  }
}
```

**Category → Swimlane Mapping:**
- `"category": "Technical"` → Technical swimlane
- `"category": "Strategy"` → Strategy swimlane
- `"category": "Compliance"` → Compliance swimlane
- `"category": "Operations"` → Operations swimlane
- `"category": "Financial"` → Financial swimlane

### **2. Dependency (Edge) Format**

```json
{
  "id": "dep-001",
  "source_decision_id": "dec-001",
  "target_decision_id": "dec-002",
  "type": "BLOCKS",
  "description": "Architecture must be decided before deployment"
}
```

### **3. Complete Graph Data Example**

```json
{
  "nodes": [
    {
      "id": "decision-dec-001",
      "type": "swimlaneCard",
      "data": {
        "id": "dec-001",
        "title": "Adopt Cloud-First Strategy",
        "description": "Move all infrastructure to cloud providers",
        "lifecycle": "STABLE",
        "health_signal": 95,
        "category": "Strategy",
        "swimlane": "strategy"
      }
    },
    {
      "id": "decision-dec-002",
      "type": "swimlaneCard",
      "data": {
        "id": "dec-002",
        "title": "Implement Kubernetes",
        "description": "Container orchestration for microservices",
        "lifecycle": "UNDER_REVIEW",
        "health_signal": 70,
        "category": "Technical",
        "swimlane": "technical"
      }
    },
    {
      "id": "decision-dec-003",
      "type": "swimlaneCard",
      "data": {
        "id": "dec-003",
        "title": "GDPR Compliance Review",
        "description": "Ensure data handling meets EU regulations",
        "lifecycle": "AT_RISK",
        "health_signal": 45,
        "category": "Compliance",
        "swimlane": "compliance"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "decision-dec-001",
      "target": "decision-dec-002",
      "type": "smoothstep",
      "style": {
        "stroke": "#3b82f6",
        "strokeWidth": 2
      }
    },
    {
      "id": "edge-2",
      "source": "decision-dec-002",
      "target": "decision-dec-003",
      "type": "smoothstep"
    }
  ]
}
```

---

## 🏗️ Component Architecture

```
SwimlaneDagFlow (Main Component)
├── SwimLaneDecisionCard (Custom Node)
│   ├── Status Badge (Stable/At Risk/Invalidated)
│   ├── Health Indicator
│   ├── Category Label
│   └── Glow Effect (for at-risk nodes)
├── DecisionDetailPanel (Side Panel)
│   └── Shows assumptions, constraints, etc.
└── React Flow Canvas
    ├── Background Grid
    ├── Controls (Zoom, Pan)
    └── MiniMap
```

---

## ⚙️ Auto-Layout Configuration (ELK)

### **Key ELK Options Used:**

```javascript
const elkGraph = {
  layoutOptions: {
    'elk.algorithm': 'layered',              // Hierarchical layout
    'elk.direction': 'RIGHT',                // Left-to-right flow
    'elk.layered.spacing.nodeNodeBetweenLayers': 400,  // Stage spacing (horizontal)
    'elk.layered.spacing.nodeNode': 60,      // Node spacing (vertical)
    'elk.edgeRouting': 'ORTHOGONAL',         // Clean right-angle edges
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'SIMPLE',
  }
};
```

### **Swimlane Constraint Logic:**

Each node is assigned a `partitioning.partition` value based on its swimlane:

```javascript
layoutOptions: {
  'partitioning.partition': swimlaneOrder  // 0=Strategy, 1=Technical, etc.
}
```

This ensures nodes stay in their designated row (swimlane).

---

## 🎨 Visual Styling

### **Status → Color Mapping:**

| Lifecycle | Border Color | Badge Color | Glow Effect |
|-----------|-------------|-------------|-------------|
| STABLE | `border-green-500` | `bg-green-500` | ❌ None |
| UNDER_REVIEW | `border-yellow-500` | `bg-yellow-500` | ❌ None |
| AT_RISK | `border-red-500` | `bg-red-500` | ✅ **Red glow + pulse** |
| INVALIDATED | `border-red-600` | `bg-red-600` | ✅ **Red glow** |
| RETIRED | `border-gray-400` | `bg-gray-400` | ❌ None |

### **Glow Effect CSS:**

```css
.at-risk-node {
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
  ring: 2px solid rgba(239, 68, 68, 0.5);
  animation: pulse 2s infinite;
}
```

---

## 🚀 Usage

### **1. Add to your app routing:**

```jsx
import SwimlaneDagFlow from './components/DecisionFlowGraph/SwimlaneDagFlow';

function App() {
  return (
    <Switch>
      <Route path="/decision-flow" component={SwimlaneDagFlow} />
    </Switch>
  );
}
```

### **2. Navigation button:**

```jsx
<button onClick={() => navigate('/decision-flow')}>
  Decision Flow (Swimlane)
</button>
```

---

## 📦 Required Backend API Endpoints

The component expects these API endpoints:

### **GET /api/decisions**
```json
[
  {
    "id": "dec-001",
    "title": "Decision Title",
    "description": "Description",
    "lifecycle": "STABLE",
    "health_signal": 85,
    "metadata": {
      "category": "Technical"
    }
  }
]
```

### **GET /api/dependencies/:decisionId**
```json
{
  "blocking": [
    {
      "id": "dep-001",
      "target_decision_id": "dec-002"
    }
  ],
  "blockedBy": []
}
```

---

## 🎯 Swimlane Categories (Customizable)

Defined in `utils/swimlaneLayout.js`:

```javascript
export const SWIMLANES = {
  STRATEGY: { id: 'strategy', label: 'Strategy', order: 0, color: '#3b82f6' },
  TECHNICAL: { id: 'technical', label: 'Technical', order: 1, color: '#8b5cf6' },
  OPERATIONS: { id: 'operations', label: 'Operations', order: 2, color: '#06b6d4' },
  COMPLIANCE: { id: 'compliance', label: 'Compliance', order: 3, color: '#10b981' },
  FINANCIAL: { id: 'financial', label: 'Financial', order: 4, color: '#f59e0b' },
  OTHER: { id: 'other', label: 'Other', order: 5, color: '#6b7280' },
};
```

**To add a new swimlane:**
1. Add to `SWIMLANES` object
2. Update `getDecisionSwimlane()` logic to map categories

---

## 🔧 Customization Options

### **Layout Spacing:**

```javascript
await applySwimLaneLayout(nodes, edges, {
  nodeWidth: 280,           // Card width
  nodeHeight: 120,          // Card height
  swimlaneSpacing: 180,     // Vertical space between swimlanes
  stageSpacing: 400,        // Horizontal space between columns
  nodeSpacing: 60,          // Space between nodes in same lane
});
```

### **Edge Styling:**

```javascript
const edgeOptions = {
  type: "smoothstep",       // or "straight", "step", "bezier"
  animated: false,          // Set true for animated flow
  style: {
    stroke: "#3b82f6",
    strokeWidth: 2,
  },
};
```

---

## 🧪 Testing the Layout

### **1. Create Test Data:**

```javascript
const testDecisions = [
  { id: '1', title: 'Strategy A', metadata: { category: 'Strategy' }, lifecycle: 'STABLE' },
  { id: '2', title: 'Tech B', metadata: { category: 'Technical' }, lifecycle: 'AT_RISK' },
  { id: '3', title: 'Compliance C', metadata: { category: 'Compliance' }, lifecycle: 'STABLE' },
];

const testDependencies = [
  { source_decision_id: '1', target_decision_id: '2' },
  { source_decision_id: '2', target_decision_id: '3' },
];
```

### **2. Expected Layout:**

```
[Strategy]    ┌─────────────┐
              │ Strategy A  │────────┐
              └─────────────┘        │
                                     ▼
[Technical]                  ┌─────────────┐
                             │   Tech B    │────────┐
                             └─────────────┘        │
                                                    ▼
[Compliance]                            ┌──────────────┐
                                        │ Compliance C │
                                        └──────────────┘
```

---

## 📝 Notes

### **Why ELK over Dagre?**
- Better swimlane/layering support
- More robust with complex graphs
- Better orthogonal edge routing
- Active maintenance

### **Performance:**
- ELK runs in-browser (WebAssembly)
- Layout calculation: ~100-500ms for 50-100 nodes
- Use React.memo() on nodes to prevent re-renders

### **Limitations:**
- Manual swimlane assignment required (via category metadata)
- Does not support cyclic dependencies (DAG only)
- Large graphs (500+) may need optimization

---

## 🎉 Result

You now have a **professional, auto-layouted swimlane DAG** that:
- ✅ Requires **zero manual positioning**
- ✅ Organizes decisions by **category/domain**
- ✅ Shows **left-to-right flow** (Inputs → Outcomes)
- ✅ Highlights **at-risk decisions** with glow effects
- ✅ Uses **clean orthogonal edges**
- ✅ Scales to **hundreds of decisions**

**Welcome to Decision Intelligence Victory! 🚀**
