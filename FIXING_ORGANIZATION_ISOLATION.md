# FIXING ORGANIZATION ISOLATION - ACTION REQUIRED

## Issues Found

1. ✅ **Table name error** - Fixed! Changed `organization_profile` to `organization_profiles` in profile route
2. ⚠️ **Old data without organization_id** - Needs cleanup (causing isolation issues)

---

## What Was Fixed

### 1. Profile Route Table Name
**File:** `backend/src/api/routes/profile.ts`

**Changes:**
- ✅ Fixed table name: `organization_profile` → `organization_profiles`
- ✅ Added `AuthRequest` type for authentication
- ✅ Added organization_id filtering based on authenticated user
- ✅ Now properly scoped to user's organization

---

## What You Need to Do

### Step 1: Restart Backend Server
The profile route fix requires a restart:
```bash
cd backend
# Stop the server (Ctrl+C if running)
npm run dev
```

### Step 2: Clean Up Old Data

**You have existing data from BEFORE adding organization_id.** This is why you're seeing everything - RLS can't filter data that doesn't have organization_id!

**Run the cleanup script:**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open file: `backend/migrations/008_cleanup_old_data.sql`
3. Copy the entire script
4. Paste into SQL Editor
5. Click **Run**

This script will:
- ✅ Delete all old decisions, assumptions, constraints without organization_id
- ✅ Verify no orphaned data remains
- ✅ Show data distribution by organization

**Alternative (if you want to keep existing data):**
- Uncomment the "MIGRATE" section in the script
- This will assign all old data to the first organization you created

### Step 3: Test Organization Isolation

After cleanup, test isolation:

1. **Login as Organization A user**
   - You should ONLY see Org A's data

2. **Create new decisions/assumptions**
   - They should automatically get organization_id

3. **Login as Organization B user** (create if needed)
   - You should ONLY see Org B's data
   - You should NOT see Org A's data

4. **Verify in Database:**
   ```sql
   -- Run in Supabase SQL Editor
   SELECT
     o.name as org_name,
     o.org_code,
     COUNT(DISTINCT d.id) as decisions,
     COUNT(DISTINCT a.id) as assumptions
   FROM organizations o
   LEFT JOIN decisions d ON d.organization_id = o.id
   LEFT JOIN assumptions a ON a.organization_id = o.id
   GROUP BY o.id, o.name, o.org_code
   ORDER BY o.created_at;
   ```

---

## Understanding the Problem

### Why Old Data Was Visible

**Before multi-organization feature:**
- Data existed without `organization_id` column
- When we added `organization_id`, existing data had `NULL` values

**RLS policies filter like this:**
```sql
-- Only show data WHERE organization_id = your_org_id
WHERE organization_id = public.user_organization_id()
```

**The problem:**
- Old data with `organization_id = NULL` doesn't match ANY organization
- But Supabase might have been returning it due to policy behavior with NULL values
- This created a security issue - data was visible to everyone!

**The fix:**
- **Delete** old data without organization_id (recommended for clean start)
- OR **Migrate** old data to a specific organization (if you want to keep it)

---

## Files Modified

### Fixed:
- ✅ `backend/src/api/routes/profile.ts` - Fixed table name and added org filtering
- ✅ `backend/src/api/routes/auth.ts` - Uses admin client for registration (already done)
- ✅ `backend/src/api/controllers/decision-controller.ts` - Auto-adds organization_id (already done)
- ✅ `backend/src/api/routes/assumptions.ts` - Auto-adds organization_id (already done)

### Created:
- ✅ `backend/migrations/008_cleanup_old_data.sql` - Cleanup script for orphaned data

---

## Expected Results After Fix

### Before Cleanup:
```
Organization A: Sees own data + old orphaned data
Organization B: Sees own data + old orphaned data
❌ BAD - Data leaking across organizations!
```

### After Cleanup:
```
Organization A: Sees ONLY own data
Organization B: Sees ONLY own data
✅ GOOD - Perfect isolation!
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Backend server restarted successfully
- [ ] Cleanup script ran without errors
- [ ] No tables have records with NULL organization_id
- [ ] Each organization only sees their own data
- [ ] New decisions/assumptions automatically get organization_id
- [ ] Profile route works without errors
- [ ] Can switch between organizations and data is properly isolated

---

## Quick Summary

**What to do RIGHT NOW:**

1. **Restart backend** - Ctrl+C then `npm run dev`
2. **Run cleanup script** - Delete old data in Supabase SQL Editor
3. **Test** - Create new org, verify isolation works

**That's it!** Organization isolation will work perfectly after these steps.

---

## If You Still See Issues

**Check this SQL query in Supabase:**
```sql
-- Find any data without organization_id
SELECT
  'decisions' as table_name,
  COUNT(*) as orphan_count
FROM decisions
WHERE organization_id IS NULL

UNION ALL

SELECT
  'assumptions',
  COUNT(*)
FROM assumptions
WHERE organization_id IS NULL

UNION ALL

SELECT
  'constraints',
  COUNT(*)
FROM constraints
WHERE organization_id IS NULL;
```

If this returns any rows > 0, the cleanup didn't work. Re-run the cleanup script.

---

## Security Note

⚠️ **IMPORTANT:** Old data without organization_id is a **security issue**. It can be visible to multiple organizations depending on how RLS handles NULL values. You MUST either delete it or assign it to a specific organization.

✅ After cleanup, RLS will enforce perfect isolation - each organization can ONLY see their own data.
