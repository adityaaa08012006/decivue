# How to Create and Display Assumption Conflicts

## Overview
This guide walks through creating test assumption conflicts and seeing them displayed in the frontend.

## Step-by-Step Instructions

### Step 1: Run the SQL Script in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New query**
4. Open the file: `backend/test-data/create_assumption_conflict.sql`
5. Copy all the SQL code
6. Paste it into the Supabase SQL Editor
7. Click **Run** (or press Ctrl+Enter)

**Expected Results:**
```
Assumptions Created: 2
Conflicts Created: 1
```

You should also see the conflict details in the query results showing:
- Assumption A: "Budget will remain at $50,000 for Q1..."
- Assumption B: "Budget will be reduced by 30% in Q1..."
- Conflict Type: CONTRADICTORY
- Confidence: 0.95 (95%)

### Step 2: Verify in Database (Optional)

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check assumptions were created
SELECT id, description, scope, status 
FROM assumptions 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Check conflict was created
SELECT 
  ac.*,
  a1.description as assumption_a_description,
  a2.description as assumption_b_description
FROM assumption_conflicts ac
JOIN assumptions a1 ON ac.assumption_a_id = a1.id
JOIN assumptions a2 ON ac.assumption_b_id = a2.id
WHERE ac.id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Use the RPC function (same as API)
SELECT * FROM get_all_assumption_conflicts(FALSE);
```

### Step 3: View in Frontend

1. **Start the backend** (if not running):
   ```bash
   cd backend
   npm run dev
   ```
   Backend should start on http://localhost:3001

2. **Start the frontend** (in a separate terminal):
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should start on http://localhost:5173 (or similar)

3. **Navigate to Assumptions Page**:
   - Open the application in your browser
   - Click on **"Assumptions Section"** in the left sidebar
   - Scroll down to see the **"Detected Conflicts"** section

### Step 4: Expected Frontend Display

You should see a conflict card that looks like this:

```
┌─────────────────────────────────────────────────────────┐
│ Detected Conflicts          [1 unresolved]              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  CONTRADICTORY                95% confidence   [Resolve] │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │ Assumption A         │  │ Assumption B         │    │
│  │ Budget will remain at│  │ Budget will be       │    │
│  │ $50,000 for Q1       │  │ reduced by 30% in Q1 │    │
│  └──────────────────────┘  └──────────────────────┘    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Step 5: Test Conflict Resolution

Click on the conflict card or "Resolve" button to open the resolution modal.

You'll see resolution options:
- **✅ Validate A** - Mark first assumption as correct
- **✅ Validate B** - Mark second assumption as correct  
- **🔀 Merge** - Combine both assumptions
- **❌ Deprecate Both** - Mark both as invalid
- **⚠️ Keep Both** - Accept both (not truly contradictory)

After resolving, the conflict should:
1. Disappear from the "Detected Conflicts" section
2. Update `resolved_at` timestamp in database
3. Store the resolution action and notes

## Troubleshooting

### Conflict Not Showing Up?

**Check Backend API:**
```bash
# Test the API endpoint directly
curl http://localhost:3001/api/assumption-conflicts
```

Expected response:
```json
[
  {
    "id": "cccccccc-cccc-cccc-cccc-cccccccccccc",
    "assumption_a_id": "11111111-1111-1111-1111-111111111111",
    "assumption_b_id": "22222222-2222-2222-2222-222222222222",
    "conflict_type": "CONTRADICTORY",
    "confidence_score": 0.95,
    "detected_at": "2026-02-08T...",
    "resolved_at": null,
    "assumption_a": {
      "id": "11111111-1111-1111-1111-111111111111",
      "description": "Budget will remain at $50,000 for Q1...",
      ...
    },
    "assumption_b": {
      "id": "22222222-2222-2222-2222-222222222222",
      "description": "Budget will be reduced by 30% in Q1...",
      ...
    }
  }
]
```

**Check Browser Console:**
- Open DevTools (F12)
- Go to Console tab
- Look for errors when loading the Assumptions page
- Check Network tab for the `/api/assumption-conflicts` request

**Check Database Directly:**
```sql
-- Ensure RPC function exists
SELECT proname FROM pg_proc WHERE proname = 'get_all_assumption_conflicts';

-- Test the function
SELECT * FROM get_all_assumption_conflicts(FALSE);
```

### Frontend Not Refreshing?

1. Hard refresh the page (Ctrl+Shift+R)
2. Clear browser cache
3. Check that the Assumptions page component is fetching conflicts:
   ```javascript
   // Should be calling this in useEffect
   api.getAssumptionConflicts(false)
   ```

## Creating Additional Conflicts

To create more test conflicts, modify the SQL script with different scenarios:

### Example: Mutually Exclusive Conflict
```sql
-- Framework choice conflict
INSERT INTO assumptions (id, description, status, scope) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
   'Project will use React framework - Development will be done using React.js', 
   'HOLDING', 'UNIVERSAL'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Project will use Angular framework - Development will be done using Angular',
   'HOLDING', 'UNIVERSAL');

INSERT INTO assumption_conflicts 
  (assumption_a_id, assumption_b_id, conflict_type, confidence_score)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'MUTUALLY_EXCLUSIVE',
   0.99);
```

### Example: Incompatible Conflict
```sql
-- Timeline vs scope conflict
INSERT INTO assumptions (id, description, status, scope) VALUES
  ('33333333-3333-3333-3333-333333333333',
   'Development timeline is 3 months - Project must be completed in 3 months',
   'HOLDING', 'DECISION_SPECIFIC'),
  ('44444444-4444-4444-4444-444444444444',
   'All features from 6-month roadmap required - Complete feature set from 6-month plan must be delivered',
   'HOLDING', 'DECISION_SPECIFIC');

INSERT INTO assumption_conflicts
  (assumption_a_id, assumption_b_id, conflict_type, confidence_score)
VALUES
  ('33333333-3333-3333-3333-333333333333',
   '44444444-4444-4444-4444-444444444444',
   'INCOMPATIBLE',
   0.88);
```

## Cleanup

To remove test data:

```sql
-- Remove the conflict
DELETE FROM assumption_conflicts 
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Remove the assumptions
DELETE FROM assumptions 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
```

## API Endpoints Reference

- `GET /api/assumption-conflicts` - Get all conflicts
- `GET /api/assumption-conflicts?includeResolved=true` - Include resolved conflicts
- `GET /api/assumption-conflicts/:assumptionId` - Get conflicts for specific assumption
- `POST /api/assumption-conflicts/detect` - Run AI conflict detection
- `POST /api/assumption-conflicts/:id/resolve` - Resolve a conflict
- `DELETE /api/assumption-conflicts/:id` - Delete conflict (mark as false positive)
