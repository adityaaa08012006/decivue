# Assumptions Update - Universal Rules & Conflict Detection

## ⚠️ IMPORTANT: Schema Updates Required

**You MUST run these SQL files in order:**

### 1. Add Schema Changes
```sql
-- Execute in Supabase SQL Editor
-- File: backend/schema-updates.sql
-- This adds the 'scope' column and conflicts table
```

### 2. Migrate Existing Data
```sql
-- Execute in Supabase SQL Editor  
-- File: backend/migrate-existing-assumptions.sql
-- This sets scope for existing assumptions
```

**WHY THIS IS CRITICAL:**
Without running these migrations, ALL assumptions will appear in the "Decision-Specific" section because they have `scope = NULL`. The UI filter includes `|| !a.scope` for backward compatibility, which means null values show up as decision-specific.

## Changes Made

### 1. **Removed Confidence Levels from UI** ✅
- Confidence bars and percentages completely removed
- No more "X% confidence" displays
- Status indicators only: ✓ **Holding** | ⚠ **Shaky** | ✗ **Broken**
- Reduces cognitive load and procrastination

### 2. **Two-Tier Assumption System** ✅

#### **Universal Rules (Organizational)**
- Purple background with 🌐 icon
- Apply to ALL decisions automatically
- Stored in `assumptions` table with `scope = 'UNIVERSAL'`
- 🔒 "Universal" badge displayed
- Examples:
  - "Budget constraint: $500K for infrastructure"
  - "Team size limited to 8 developers"
  - "Must comply with GDPR"

#### **Decision-Specific Assumptions**
- White background with 📌 icon
- Unique to each decision
- Stored in `assumptions` table with `scope = 'DECISION_SPECIFIC'`
- Linked via `decision_assumptions` table
- Examples:
  - "Team has microservices expertise"
  - "Infrastructure budget approved"

### 3. **Updated Status Labels** ✅
Changed from `VALID/UNKNOWN/BROKEN` to more intuitive language:
- **HOLDING** (was VALID) - Assumption is stable ✓
- **SHAKY** (was UNKNOWN) - Assumption is deteriorating ⚠
- **BROKEN** (unchanged) - Assumption is invalidated ✗

### 4. **Conflict Detection** ✅

#### **Database Schema**
New table: `assumption_conflicts`
```sql
CREATE TABLE assumption_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assumption_a_id UUID REFERENCES assumptions(id),
  assumption_b_id UUID REFERENCES assumptions(id),
  conflict_reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **Frontend Display**
When conflicts detected:
- Red warning box with AlertCircle icon
- Shows conflicting assumption description
- Displays conflict reason
- Appears below the affected assumption

#### **Backend Support**
New database function: `get_assumption_conflicts(p_assumption_id)`
- Returns unresolved conflicts for any assumption
- Includes conflicting assumption details and reason

#### **Example Conflict**
```
Assumption 1: "Migrate to microservices architecture"
Assumption 2: "Current monolithic architecture must be maintained"
Conflict Reason: "These assumptions contradict deployment strategy"
→ Red warning box appears under both assumptions
```

## Database Schema Changes

### 1. Assumptions Table - New Column
```sql
ALTER TABLE assumptions 
ADD COLUMN scope TEXT CHECK (scope IN ('UNIVERSAL', 'DECISION_SPECIFIC')) 
DEFAULT 'DECISION_SPECIFIC';
```

### 2. New Conflicts Table
```sql
CREATE TABLE assumption_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assumption_a_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  assumption_b_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  conflict_reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  CONSTRAINT unique_conflict_pair UNIQUE(assumption_a_id, assumption_b_id),
  CONSTRAINT no_self_conflict CHECK (assumption_a_id != assumption_b_id),
  CONSTRAINT ordered_conflict CHECK (assumption_a_id < assumption_b_id)
);
```

### 3. Helper Function
```sql
CREATE OR REPLACE FUNCTION get_assumption_conflicts(p_assumption_id UUID)
RETURNS TABLE (
  conflict_id UUID,
  conflicting_assumption_id UUID,
  conflicting_description TEXT,
  conflict_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id as conflict_id,
    CASE 
      WHEN ac.assumption_a_id = p_assumption_id THEN ac.assumption_b_id
      ELSE ac.assumption_a_id
    END as conflicting_assumption_id,
    a.description as conflicting_description,
    ac.conflict_reason,
    ac.created_at
  FROM assumption_conflicts ac
  JOIN assumptions a ON (
    CASE 
      WHEN ac.assumption_a_id = p_assumption_id THEN a.id = ac.assumption_b_id
      ELSE a.id = ac.assumption_a_id
    END
  )
  WHERE (ac.assumption_a_id = p_assumption_id OR ac.assumption_b_id = p_assumption_id)
    AND ac.resolved = FALSE
  ORDER BY ac.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

### 1. Get Assumptions (with conflicts)
```bash
GET /api/assumptions?decisionId=xxx&includeConflicts=true
```

**Response includes:**
- Universal assumptions (scope: UNIVERSAL) - automatically included for all decisions
- Decision-specific assumptions (scope: DECISION_SPECIFIC) - linked to the decision
- Conflicts array for each assumption (if includeConflicts=true)

**Example Response:**
```json
[
  {
    "id": "uuid-1",
    "description": "All decisions must have security review",
    "status": "HOLDING",
    "scope": "UNIVERSAL",
    "conflicts": []
  },
  {
    "id": "uuid-2",
    "description": "Team has Kubernetes experience",
    "status": "SHAKY",
    "scope": "DECISION_SPECIFIC",
    "conflicts": [
      {
        "conflict_id": "conflict-uuid",
        "conflicting_assumption_id": "uuid-3",
        "conflicting_description": "Team is new to containerization",
        "conflict_reason": "Cannot have K8s experience if new to containers"
      }
    ]
  }
]
```

### 2. Create Assumption
```bash
POST /api/assumptions
Body: {
  "description": "Team has React expertise",
  "status": "HOLDING",
  "scope": "DECISION_SPECIFIC",  # or "UNIVERSAL"
  "linkToDecisionId": "decision-uuid"  # omit for universal
}
```

### 3. Report Conflict (NEW)
```bash
POST /api/assumptions/{assumptionId}/conflicts
Body: {
  "conflictingAssumptionId": "uuid-of-conflicting-assumption",
  "reason": "These assumptions contradict each other because..."
}
```

### 4. Get Conflicts (NEW)
```bash
GET /api/assumptions/{assumptionId}/conflicts
```

Returns all conflicts for a specific assumption.

## UI Layout

```
┌─────────────────────────────────────────────────┐
│ Assumptions                                     │
├─────────────────────────────────────────────────┤
│ 🌐 UNIVERSAL RULES (APPLY TO ALL DECISIONS)    │
│ ┌──────────────────────────────────────────┐   │
│ │ ✓ Security review required  🔒 Universal │   │
│ │ ⚠ Budget under $500K       🔒 Universal  │   │
│ │   ⚠️ Conflicts with: "Budget approved    │   │
│ │      for $750K infrastructure"           │   │
│ │      Reason: Budget amounts contradict   │   │
│ └──────────────────────────────────────────┘   │
│                                                 │
│ � DECISION-SPECIFIC ASSUMPTIONS                │
│ ┌──────────────────────────────────────────┐   │
│ │ ✓ Team has microservices expertise       │   │
│ │ ⚠ Infrastructure budget approved         │   │
│ │ ✗ Monolithic architecture maintained     │   │
│ │   ⚠️ Conflicts with: "Migrate to         │   │
│ │      microservices"                      │   │
│ │      Reason: Cannot maintain monolith    │   │
│ │      while migrating to microservices    │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Color Scheme:**
- Universal section: Purple background (bg-purple-50)
- Decision-specific: White background
- Conflict warnings: Red background (bg-red-100)
- Holding status: Teal icon
- Shaky status: Orange icon
- Broken status: Red icon

## Testing Guide

### Step 1: Run Schema Updates
```sql
-- In Supabase SQL Editor, run these files IN ORDER:

-- 1. Add schema changes
-- File: backend/schema-updates.sql
-- (Adds scope column and conflicts table)

-- 2. Migrate existing data  
-- File: backend/migrate-existing-assumptions.sql
-- (Sets scope for existing assumptions)

-- 3. Verify changes:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'assumptions' AND column_name = 'scope';

SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'assumption_conflicts';

-- 4. Check scope distribution:
SELECT scope, COUNT(*) as count 
FROM assumptions 
GROUP BY scope;
-- Should show: UNIVERSAL and DECISION_SPECIFIC (no NULL values)
```

### Step 2: Add Test Data
```sql
-- Add universal assumptions
INSERT INTO assumptions (description, status, scope) VALUES
  ('All infrastructure changes require security approval', 'HOLDING', 'UNIVERSAL'),
  ('Budget must not exceed $500K', 'HOLDING', 'UNIVERSAL'),
  ('Team size limited to 8 developers', 'HOLDING', 'UNIVERSAL');

-- Add decision-specific assumptions
INSERT INTO assumptions (description, status, scope) VALUES
  ('Team has React expertise', 'HOLDING', 'DECISION_SPECIFIC'),
  ('Team is new to React', 'SHAKY', 'DECISION_SPECIFIC'),
  ('Kubernetes deployment planned', 'HOLDING', 'DECISION_SPECIFIC'),
  ('On-premise deployment required', 'HOLDING', 'DECISION_SPECIFIC');

-- Link to a decision (replace with actual decision ID)
INSERT INTO decision_assumptions (decision_id, assumption_id) 
SELECT 'your-decision-id', id FROM assumptions WHERE scope = 'DECISION_SPECIFIC';

-- Create conflicts
WITH assumptions_data AS (
  SELECT id, description FROM assumptions
)
INSERT INTO assumption_conflicts (assumption_a_id, assumption_b_id, conflict_reason)
VALUES (
  (SELECT id FROM assumptions_data WHERE description LIKE '%new to React%'),
  (SELECT id FROM assumptions_data WHERE description LIKE '%React expertise%'),
  'Team cannot both have React expertise and be new to React'
),
(
  (SELECT id FROM assumptions_data WHERE description LIKE '%Kubernetes%'),
  (SELECT id FROM assumptions_data WHERE description LIKE '%On-premise%'),
  'Kubernetes typically requires cloud infrastructure, conflicts with on-premise requirement'
);
```

### Step 3: Start Servers
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Step 4: Verify in UI
1. Open http://localhost:5173
2. Go to Decision Monitoring
3. Expand a decision
4. Check for:
   - ✅ Purple "Universal Rules" section with 🔒 badges
   - ✅ White "Decision-Specific" section with 📌 icon
   - ✅ Red conflict warnings with details
   - ✅ NO confidence bars or percentages
   - ✅ HOLDING/SHAKY/BROKEN status labels

## Files Changed

### Created:
- ✅ `backend/schema-updates.sql` - Database schema updates

### Modified:
- ✅ `backend/src/api/routes/assumptions.ts` - Updated endpoints, added conflict support
- ✅ `frontend/src/services/api.js` - Added includeConflicts parameter, reportConflict method
- ✅ `frontend/src/components/DecisionMonitoring.jsx` - Complete rewrite of assumptions section

## Visual Examples

### Before:
```
Assumptions
├── Organizational Constraints (from different table)
│   └── Simple list with confidence %
└── Assumptions
    └── Mixed universal + specific with confidence bars
```

### After:
```
Assumptions
├── 🌐 Universal Rules (purple, prominent)
│   ├── 🔒 Badges
│   ├── Status: HOLDING/SHAKY/BROKEN
│   └── Conflict warnings (red boxes)
└── 📌 Decision-Specific (white, standard)
    ├── Status: HOLDING/SHAKY/BROKEN
    └── Conflict warnings (red boxes)
```

## Next Steps

### Completed ✅
1. Hide confidence levels
2. Differentiate universal vs decision-specific
3. Add conflict detection and display
4. Update status labels to HOLDING/SHAKY/BROKEN
5. Create conflict database table
6. Implement conflict API endpoints
7. Design and build conflict UI

### Pending User Action ⏳
1. **Execute schema-updates.sql in Supabase** (REQUIRED)
2. **Test with sample data**
3. **Approve pushing to GitHub**

### Future Enhancements 🔮
1. UI for creating/editing assumptions
2. UI button for reporting conflicts
3. Auto-conflict detection using semantic analysis
4. Conflict resolution workflow
5. Assumption validation scheduling
6. Impact analysis when assumptions change
7. Assumption history tracking

