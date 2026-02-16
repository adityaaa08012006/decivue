# 🎯 Swimlane DAG - Quick Reference Card

## 🚀 Instant Start Guide

### **1️⃣ Start Your App**
```bash
cd frontend
npm run dev
```

### **2️⃣ Access the Feature**
- Login → Sidebar → Click **"Swimlane Flow (DAG)"**
- Or navigate to: `http://localhost:5173/` (then click the menu)

---

## 📊 Sample Data Structure for Testing

### **Create decisions with category metadata:**

```javascript
// Example 1: Strategy Decision
{
  title: "Adopt Cloud-First Strategy",
  description: "Move all infrastructure to cloud",
  metadata: {
    category: "Strategy"  // ← Goes to Strategy swimlane
  }
}

// Example 2: Technical Decision  
{
  title: "Implement Kubernetes",
  description: "Container orchestration",
  metadata: {
    category: "Technical"  // ← Goes to Technical swimlane
  }
}

// Example 3: Compliance Decision
{
  title: "GDPR Compliance Review", 
  description: "Ensure data handling compliance",
  metadata: {
    category: "Compliance"  // ← Goes to Compliance swimlane
  }
}
```

### **Add dependencies between them:**
```javascript
// Decision 1 → Decision 2 → Decision 3
// Creates a left-to-right flow
```

---

## 🏊 Category → Swimlane Mapping

| Category Value | Swimlane | Color |
|---------------|----------|-------|
| `"Strategy"` or `"Strategic"` | Strategy | Blue |
| `"Technical"` or `"Tech"` | Technical | Purple |
| `"Operations"` or `"Ops"` | Operations | Cyan |
| `"Compliance"` or `"Legal"` | Compliance | Green |
| `"Financial"` or `"Budget"` | Financial | Orange |
| *Anything else* | Other | Gray |

---

## 🎨 Visual Legend

### **Status Indicators:**
- 🟢 **STABLE** - Green border, healthy
- 🟡 **UNDER_REVIEW** - Yellow border, needs attention
- 🔴 **AT_RISK** - **RED GLOW + PULSE** ← Most important visual cue!
- ⚫ **INVALIDATED** - Dark red, broken
- 📦 **RETIRED** - Gray, no longer active

### **Health Signal:**
- Green dot (80-100%) - Excellent
- Yellow dot (60-79%) - Good
- Orange dot (40-59%) - Warning
- Red dot (0-39%) - Critical

---

## 🔧 Quick Customization

### **Change Layout Spacing:**
Edit `SwimlaneDagFlow.jsx` line ~110:
```javascript
await applySwimLaneLayout(graphNodes, graphEdges, {
  swimlaneSpacing: 200,  // ← Increase for more vertical space
  stageSpacing: 500,     // ← Increase for wider columns
});
```

### **Add New Swimlane:**
Edit `utils/swimlaneLayout.js`:
```javascript
export const SWIMLANES = {
  // ... existing ...
  MARKETING: { 
    id: 'marketing', 
    label: 'Marketing', 
    order: 6, 
    color: '#ec4899' 
  },
};
```

Then add to `getDecisionSwimlane()`:
```javascript
if (normalized.includes('marketing')) {
  return SWIMLANES.MARKETING.id;
}
```

---

## 🎯 Expected Layout Result

```
Swimlane View (Left → Right):

[Strategy]     ┌─────────────┐
               │ Strategy A  │──────┐
               └─────────────┘      │
                                    ▼
[Technical]                  ┌─────────────┐
                             │  Tech B     │──────┐
                             └─────────────┘      │
                                                  ▼
[Operations]                           ┌─────────────┐
                                       │   Ops C     │
                                       └─────────────┘
```

**Features:**
- ✅ Automatic positioning (no dragging)
- ✅ Orthogonal edges (clean right angles)
- ✅ Swimlanes keep nodes in horizontal rows
- ✅ Dependencies flow left-to-right
- ✅ At-risk nodes glow red

---

## 🐛 Troubleshooting

### **Issue: Nodes not showing in swimlanes**
**Fix:** Add `category` to decision metadata:
```javascript
metadata: { category: "Technical" }
```

### **Issue: All nodes in "Other" swimlane**
**Fix:** Check category spelling. Use exact values:
- "Strategy", "Technical", "Operations", "Compliance", "Financial"

### **Issue: Layout looks messy**
**Fix:** Adjust spacing parameters in `SwimlaneDagFlow.jsx`

### **Issue: No dependencies visible**
**Fix:** Ensure dependencies exist in backend. Check `/api/dependencies/:id`

---

## 📚 Full Documentation

- **Complete Guide:** [SWIMLANE_GUIDE.md](./SWIMLANE_GUIDE.md)
- **Victory Summary:** [VICTORY_SUMMARY.md](./VICTORY_SUMMARY.md)
- **Original Docs:** [README.md](./README.md)

---

## 🎉 Quick Test Checklist

- [ ] Install dependencies (`npm install` already done ✅)
- [ ] Start frontend dev server
- [ ] Login to DECIVUE
- [ ] Click "Swimlane Flow (DAG)" in sidebar
- [ ] See auto-layouted graph with swimlanes
- [ ] Click a decision card → Detail panel opens
- [ ] Zoom and pan → Smooth navigation
- [ ] Check at-risk decision → Should glow red

---

**🏆 VICTORY UNLOCKED!**

*Your decision flow is now a work of art. Twin is proud.* 🚀
