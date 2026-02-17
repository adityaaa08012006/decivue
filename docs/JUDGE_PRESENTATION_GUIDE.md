# Decivue - Judge Presentation Guide

## Team Synchronized Demo Plan (4 People)

---

## 📋 Executive Summary

**Product**: Decivue - Strategic Decision Management System  
**Context**: Non-technical business scenario (Plot Armor Coffee Co.)  
**Duration**: 15-20 minutes recommended  
**Team Size**: 4 presenters

---

## 🎯 Presentation Structure

### **Opening (2 minutes) - Team Member 1**

**Goal**: Hook the judges with the problem statement

**Script**:

> "Imagine you're running a growing coffee shop chain. You have 20 major decisions in flight - expansions, marketing campaigns, equipment upgrades. Some decisions conflict with each other. Assumptions you made months ago are now outdated. Budget constraints are being violated. How do you track all of this?"

**Key Points**:

- Businesses make hundreds of strategic decisions
- Traditional tools (spreadsheets, docs) can't handle complexity
- Decivue provides a living, intelligent decision management system

**Demo Action**: Show the main dashboard with 20 decisions, various health signals, and lifecycle states

---

### **Core Feature Set (10-12 minutes) - Split Among Team Members 2, 3, 4**

---

#### **SEGMENT 1: Decision Intelligence (4 minutes) - Team Member 2**

**Features to Cover**: Smart Evaluation, Health Signals, Lifecycle Management

**Demo Flow**:

1. **Show Decision List**
   - Point out health signals (color-coded: green, yellow, red)
   - Explain lifecycle states: STABLE, UNDER_REVIEW, AT_RISK, INVALIDATED, RETIRED

2. **Open a STABLE Decision** (e.g., "Mobile Ordering System")
   - Health: 91
   - Show connected assumptions, constraints
   - Point out last reviewed date

3. **Open an AT_RISK Decision** (e.g., "Mall Food Court Expansion")
   - Health: 45
   - Show why it's at risk (declining mall traffic)
   - Highlight expiry date (15 days - urgent!)

4. **Show Time Jump Feature** ⭐
   - Click "Time Jump" button
   - Jump forward 30 days
   - Watch health signals degrade
   - Show how INVALIDATED/RETIRED decisions DON'T change (preservation)
   - Point out new notifications generated

**Talking Points**:

- "Our deterministic engine evaluates decisions based on assumptions, constraints, dependencies, and time"
- "Health signal changes trigger automatic notifications"
- "Invalidated decisions are immutable - they preserve organizational history"

---

#### **SEGMENT 2: Conflict Detection & Resolution (3 minutes) - Team Member 3**

**Features to Cover**: Assumption Conflicts, Decision Conflicts, Structured Parameters

**Demo Flow**:

1. **Navigate to Assumptions Page**
   - Show 5 assumption conflicts (orange alerts)
   - Click on a conflict to expand details

2. **Demonstrate Assumption Conflict**
   - Show: "Q3 expansion budget: $800K" vs "$500K"
   - Explain confidence score (0.95 = very confident)
   - Show structured parameters (amount, timeframe, type)

3. **Create New Conflict** (Live demo!)
   - Click "New Assumption" → Use structured mode
   - Category: "Market & Business"
   - Impact Area: "Revenue"
   - Direction: "increase"
   - Save
   - Create another assumption:
   - Impact Area: "Revenue"
   - Direction: "decrease"
   - Save
   - Click "Detect Conflicts" button
   - Show new conflict automatically detected! ⭐

4. **Decision Conflicts**
   - Navigate to Decision Conflicts page
   - Show resource competition example
   - Explain resolution actions (prioritized, merged, etc.)

**Talking Points**:

- "Structured parameters enable precise conflict detection"
- "Dropdown-level conflicts catch contradictions automatically"
- "Users can resolve conflicts or keep both with justification"

---

#### **SEGMENT 3: Advanced Features (3 minutes) - Team Member 4**

**Features to Cover**: Version Control, Governance, Deprecation, Reports

**Demo Flow**:

1. **Version Control**
   - Open any decision
   - Show "Version History" tab
   - Demonstrate version comparison
   - Show who changed what and when

2. **Governance Mode** ⭐
   - Open decision: "Source 100% Fair Trade Coffee"
   - Point out governance badge: "HIGH IMPACT - LOCKED"
   - Show it requires second reviewer
   - Explain edit justification required
   - Locked decisions can't be changed without approval

3. **Deprecation & Lessons Learned**
   - Navigate to deprecated decisions filter
   - Open: "Cut Employee Discount" (INVALIDATED)
   - Show deprecation outcome: "failed"
   - Show lessons learned section
   - Explain organizational learning

4. **Team Reports**
   - Show AI-generated weekly report
   - Metrics: decisions reviewed, conflicts resolved, at-risk items
   - Trend analysis over time

**Talking Points**:

- "Version control creates complete audit trail"
- "Governance mode protects high-impact decisions"
- "Failed decisions become learning opportunities"
- "AI generates insights automatically - no manual reporting"

---

### **Technical Highlights (2 minutes) - Team Member 1**

**Goal**: Impress judges with technical sophistication

**Key Points to Mention**:

1. **Full-stack TypeScript**: React frontend, Node.js backend
2. **Supabase PostgreSQL**: 24 tables, Row-Level Security (RLS)
3. **Deterministic Engine**: Custom evaluation logic with confidence scoring
4. **Real-time Notifications**: WebSocket-based updates
5. **Multi-tenant Architecture**: Organization isolation built-in
6. **Migration System**: 29+ migrations for schema evolution
7. **Comprehensive Seeding**: 2,134-line script with 220 days of historical data

**Demo Action**:

- Show database schema diagram (if available)
- Open browser dev tools → Network tab (show API calls)
- Mention 150+ records across 18 tables for one organization

---

### **Business Value & Closing (2 minutes) - Team Member 2**

**Goal**: Connect features to real-world value

**Key Points**:

1. **Risk Reduction**: Catch conflicts before they cause problems
2. **Time Savings**: Automated evaluation replaces manual reviews
3. **Accountability**: Complete audit trail for compliance
4. **Organizational Learning**: Failed decisions inform future strategy
5. **Scalability**: Handles hundreds of decisions across teams

**Ideal Scenarios**:

- Corporate strategy teams
- Product management organizations
- Government agencies
- Non-profit strategic planning
- Any organization making complex, interconnected decisions

**Closing Statement**:

> "Decivue transforms decision-making from reactive firefighting to proactive management. It's not just tracking decisions - it's making organizations smarter over time."

---

## 🎭 Team Role Assignments

### **Team Member 1 - "The Narrator"**

- Opening problem statement
- Technical highlights
- Smooth transitions between segments
- Time management (watch the clock!)

### **Team Member 2 - "The Intelligence Expert"**

- Decision intelligence features
- Smart evaluation explanation
- Business value closing

### **Team Member 3 - "The Conflict Resolver"**

- Conflict detection demo
- Structured parameters explanation
- Live conflict creation

### **Team Member 4 - "The Enterprise Expert"**

- Governance & compliance
- Version control
- Deprecation & learning
- Reports & analytics

---

## 🎯 Demo Flow Checklist

### Pre-Demo Setup (5 minutes before)

- [ ] Run seed script: `npm run seed-plot-armor`
- [ ] Start backend: `npm run dev` (in backend folder)
- [ ] Start frontend: `npm run dev` (in frontend folder)
- [ ] Login as Palash Kurkute
- [ ] Verify 20 decisions visible
- [ ] Verify 5 assumption conflicts visible
- [ ] Verify decision conflicts visible
- [ ] Close unnecessary browser tabs
- [ ] Set zoom level to 100%
- [ ] Have backup browser ready

### During Demo

- [ ] **0:00-2:00**: Opening problem statement
- [ ] **2:00-6:00**: Decision Intelligence (health signals, time jump)
- [ ] **6:00-9:00**: Conflict Detection (live demo!)
- [ ] **9:00-12:00**: Advanced Features (governance, version control)
- [ ] **12:00-14:00**: Technical highlights
- [ ] **14:00-16:00**: Business value & closing
- [ ] **16:00-20:00**: Q&A (be ready for these questions!)

---

## 💡 Anticipated Judge Questions & Answers

### **Q: "How does conflict detection work?"**

**A**: "We use structured parameters - users select from dropdowns like 'Budget', 'Timeline', 'Market Direction'. When two assumptions have the same category but opposite parameters (e.g., increase vs decrease), our detector flags it with a confidence score. We also do text-based fallback detection for unstructured assumptions."

### **Q: "What happens if a decision expires?"**

**A**: "Time-based evaluation checks expiry dates. If a decision expires, the health signal drops and lifecycle changes to AT_RISK or INVALIDATED. Users get notifications. But here's the key: once INVALIDATED or RETIRED, decisions become immutable - time jumps won't change them. This preserves organizational history."

### **Q: "How is this different from project management tools?"**

**A**: "Tools like Jira track tasks and execution. Decivue tracks strategic decisions and their rationale. We focus on 'why' not 'what'. We detect conflicts between decisions, not task progress. Think of it as decision version control - like Git but for strategic choices."

### **Q: "Can this scale to large enterprises?"**

**A**: "Yes - we built multi-tenant architecture from day one. Row-Level Security (RLS) ensures organization isolation. Our deterministic engine is O(n) for assumptions and constraints. We tested with 220 days of historical data and 150+ records - performance is solid."

### **Q: "What about privacy/security?"**

**A**: "Three layers: 1) Supabase RLS at database level - users only see their org's data. 2) JWT authentication with role-based access. 3) Governance mode for sensitive decisions requiring approval. All changes are audited in governance_audit_log table."

### **Q: "Did you use any AI/ML?"**

**A**: "The conflict detection uses confidence scoring based on structured parameter matching - that's a deterministic algorithm, not ML. However, the report generation feature uses AI to analyze trends and generate insights. We focused on deterministic logic where reliability matters most."

### **Q: "What was the hardest technical challenge?"**

**A**: "Conflict detection with structured parameters. We needed to balance flexibility (users can create any assumption) with precision (detect real conflicts, not false positives). The solution was multi-level templates: top-level categories, sub-categories, and dropdown values. This gave us 95%+ confidence scores on detected conflicts."

---

## 🚀 Key Differentiators to Emphasize

1. **Structured Decision Entry**: Not just free text - dropdowns enable machine understanding
2. **Time Jump Feature**: Unique simulation capability to see future impacts
3. **Automatic Conflict Detection**: Saves hours of manual review
4. **Immutable History**: INVALIDATED decisions preserve lessons learned
5. **Multi-tenant from Day 1**: Not an afterthought - built into architecture
6. **Real Business Context**: Coffee shop scenario anyone can understand
7. **Comprehensive Test Data**: 220 days of history, not toy examples

---

## 🎬 Synchronization Tips

### **Before Presentation**

1. **Run through demo 3 times together**
2. **Practice handoffs**: "Now [Name] will show you conflict detection..."
3. **Agree on backup plan** if something breaks
4. **Assign one person to watch time** (set timer!)

### **During Presentation**

1. **Stand in order of speaking** (makes handoffs smoother)
2. **Non-speaking members**: Look at screen, nod along, don't fidget
3. **Use presenter's keywords to sync**:
   - "As [Name] mentioned..." (reference previous segment)
   - "Building on that..." (continuity)
   - "Let me show you how that works..." (transition to demo)

### **Handoff Phrases**

- Member 1 → 2: "Now let's see this in action. [Name] will demonstrate our intelligent evaluation engine."
- Member 2 → 3: "But decisions don't exist in isolation - they can conflict. [Name] will show our conflict resolution system."
- Member 3 → 4: "Beyond conflicts, enterprise organizations need governance. [Name] will cover our advanced features."
- Member 4 → 1: "[Name] will wrap up with our technical architecture and business impact."

---

## 📊 Success Metrics to Mention

From your test data:

- ✅ **20 decisions** across 7 categories
- ✅ **16 structured assumptions** with parameters
- ✅ **5 assumption conflicts** detected automatically
- ✅ **2 decision conflicts** flagged
- ✅ **4 constraint violations** tracked
- ✅ **30 version changes** recorded
- ✅ **12 decision reviews** completed
- ✅ **220 days** of historical data simulated
- ✅ **13 notifications** generated
- ✅ **4 deprecated decisions** with lessons learned

---

## 🎪 Showstopper Moments

These are the "wow" moments that will impress judges:

1. **Time Jump Demo** ⭐⭐⭐
   - Watch health signals change in real-time
   - See invalidated decisions stay frozen
   - Show auto-generated notifications

2. **Live Conflict Creation** ⭐⭐⭐
   - Create two opposing assumptions
   - Click "Detect Conflicts"
   - Boom - conflict appears instantly!

3. **Governance Lock** ⭐⭐
   - Try to edit locked decision
   - Show it requires approval
   - Demonstrate audit trail

4. **Version Comparison** ⭐⭐
   - Show before/after of a decision
   - Highlight who changed what
   - Emphasize accountability

---

## 🛑 Things to AVOID

1. **Don't apologize for UI design** - focus on functionality
2. **Don't get stuck on one feature** - keep moving
3. **Don't read from slides** - you have a live demo!
4. **Don't say "this is buggy"** - reframe as "future enhancement"
5. **Don't argue among teammates** - defer to one person if disagreement
6. **Don't exceed time limit** - judges will cut you off

---

## ✅ Final Checklist

### Night Before

- [ ] Run seed script and test entire demo flow
- [ ] Charge laptops fully
- [ ] Test backup internet connection
- [ ] Print this guide (one per person)
- [ ] Agree on speaking order

### Morning Of

- [ ] Arrive 30 minutes early
- [ ] Test projector/screen connection
- [ ] Run seed script on presentation laptop
- [ ] Pull latest code from main branch
- [ ] Have backup plan if demo laptop fails

### 5 Minutes Before

- [ ] Close all unnecessary apps
- [ ] Start backend server
- [ ] Start frontend server
- [ ] Login and verify data loaded
- [ ] Set browser zoom to 100%
- [ ] Silence phones!

---

## 🎯 Closing Thoughts

**Remember**: Judges care about:

1. **Problem** → Did you solve a real problem?
2. **Solution** → Is your solution elegant and functional?
3. **Execution** → Did you build something impressive?
4. **Team** → Do you work well together?

**Your Strength**: You have a working, feature-rich product with real complexity. Many teams will have half-finished prototypes. Lean into your completeness.

**Confidence Builders**:

- You have 24 database tables (not 3)
- You have 29 migrations (shows evolution)
- You have 220 days of test data (not toy examples)
- You have automatic conflict detection (unique!)
- You have time simulation (impressive!)

**Final Advice**: Smile, make eye contact, show enthusiasm. You built something cool - let that excitement come through!

---

## 📞 Emergency Contacts During Demo

- **If backend crashes**: Restart with `npm run dev`
- **If conflicts don't show**: Click "Detect Conflicts" button manually
- **If time jump hangs**: Skip to next feature, come back if time
- **If database is empty**: Run `npm run seed-plot-armor` (takes 30 seconds)

**Backup Demo Plan**: If entire system fails, use screenshots + talk through architecture

---

Good luck! You've built something impressive - now show it off! 🚀☕
