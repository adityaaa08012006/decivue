# Migration Steps - Run These in Order

## Step 1: Check Current State (DIAGNOSTIC)

Run this file in Supabase SQL Editor:
```
backend/check-current-assumptions.sql
```

**What to look for:**
- Total number of assumptions you have
- Which assumptions are linked to which decisions
- Assumptions that appear on multiple decisions (good candidates for UNIVERSAL)
- Whether the `scope` column already exists

## Step 2: Add Schema Changes

Run this file in Supabase SQL Editor:
```
backend/schema-updates.sql
```

**This will:**
- ✅ Add `scope` column to assumptions table
- ✅ Create `assumption_conflicts` table
- ✅ Add `get_assumption_conflicts()` function

## Step 3: Migrate Existing Data

Run this file in Supabase SQL Editor:
```
backend/migrate-existing-assumptions.sql
```

**This will:**
- Set all existing assumptions to `DECISION_SPECIFIC` by default
- Give you examples to update specific ones to `UNIVERSAL`

**Important:** After running the default migration, review your assumptions and manually update the ones that should be UNIVERSAL (organizational rules).

### Examples of UNIVERSAL assumptions:
- "Budget must not exceed $500K"
- "Team size limited to 8 developers"
- "All changes require security approval"
- "Must comply with GDPR"
- "Infrastructure costs must be tracked"

### Examples of DECISION_SPECIFIC assumptions:
- "Team has React expertise" (specific to React decision)
- "PostgreSQL can scale to our expected load" (specific to database decision)
- "Microservices overhead is manageable" (specific to architecture decision)

## Step 4: Verify Migration

Run these queries to check everything worked:

```sql
-- Check scope distribution
SELECT scope, COUNT(*) as count 
FROM assumptions 
GROUP BY scope;
-- Should show: UNIVERSAL and DECISION_SPECIFIC (no NULL)

-- View all assumptions with their scope
SELECT 
  scope,
  description,
  status,
  (SELECT COUNT(*) FROM decision_assumptions da WHERE da.assumption_id = a.id) as linked_to_decisions
FROM assumptions a
ORDER BY scope, description;
```

## Step 5: Restart Backend & Test

```powershell
# Stop backend if running (Ctrl+C)
cd backend
npm run dev
```

Then open your app and check:
- ✅ Universal assumptions appear in purple section on ALL decisions
- ✅ Decision-specific assumptions only appear on their linked decisions
- ✅ No confidence bars are shown
- ✅ Status shows HOLDING/SHAKY/BROKEN

## Troubleshooting

### Issue: All assumptions still showing on all decisions
**Cause:** Scope values are still NULL
**Fix:** Run `backend/migrate-existing-assumptions.sql` again

### Issue: No assumptions showing at all
**Cause:** Backend not restarted or database connection issue
**Fix:** Restart backend server, check Supabase connection

### Issue: Conflicts not appearing
**Cause:** You haven't created any conflicts yet
**Fix:** Use the API to report conflicts:
```bash
curl -X POST http://localhost:3001/api/assumptions/{id}/conflicts \
  -H "Content-Type: application/json" \
  -d '{"conflictingAssumptionId": "{other-id}", "reason": "These contradict each other"}'
```

## Summary

1. ✅ **Diagnose:** Run `check-current-assumptions.sql`
2. ✅ **Schema:** Run `schema-updates.sql`
3. ✅ **Migrate:** Run `migrate-existing-assumptions.sql`
4. ✅ **Customize:** Update specific assumptions to UNIVERSAL
5. ✅ **Verify:** Check scope distribution
6. ✅ **Test:** Restart backend and check UI

🎯 **Expected Result:** Each decision shows only its linked assumptions + universal rules!
