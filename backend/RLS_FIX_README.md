# RLS (Row Level Security) Configuration Fix

## Issues Found

After running a comprehensive check of the Decivue database, the following RLS configuration issues were identified:

### ❌ Missing `organization_id` Column

Several tables were missing the `organization_id` column, which is **critical** for proper data isolation between organizations:

1. **dependencies** - Missing `organization_id`
2. **decision_assumptions** - Missing `organization_id`
3. **decision_constraints** - Missing `organization_id`
4. **constraint_violations** - Missing `organization_id`

### ⚠️ Inconsistent RLS Policies

Some tables had RLS policies that relied on complex JOIN operations instead of directly using `organization_id`, which:
- Creates performance issues
- Can cause RLS recursion problems
- Makes policies harder to maintain

## Solution Created

### Migration 015: Fix All Tables RLS Configuration

A comprehensive migration has been created at:
- **File**: `backend/migrations/015_fix_all_tables_rls.sql`

This migration will:

✅ Add `organization_id` to all junction tables:
   - dependencies
   - decision_assumptions
   - decision_constraints
   - constraint_violations

✅ Populate `organization_id` from related tables (decisions)

✅ Make `organization_id` NOT NULL to prevent future data issues

✅ Add performance indexes on `organization_id` columns

✅ Simplify all RLS policies to use direct `organization_id` checks

✅ Verify organization_id exists on:
   - decision_tensions
   - decision_signals
   - evaluation_history

## How to Apply the Fix

### Option 1: Using the Script (Recommended)

1. Run the migration display script:
   ```bash
   cd backend
   npm run migrate:015
   ```

2. Copy the SQL output

3. Go to **Supabase Dashboard** > **SQL Editor**

4. Click **"New Query"**

5. Paste the SQL and click **"Run"**

### Option 2: Manual

1. Open `backend/migrations/015_fix_all_tables_rls.sql`

2. Copy the entire contents

3. Go to **Supabase Dashboard** > **SQL Editor**

4. Click **"New Query"**

5. Paste and execute

## Verification

After running the migration, verify it worked:

```bash
cd backend
npm run verify-rls
```

Expected output:
```
✅ All tables have RLS enabled!
✅ No orphaned data found! All records have organization_id.
✅ Your database appears to be correctly configured!
```

## What This Fixes

### Before Fix:
- ❌ Junction tables couldn't be queried efficiently
- ❌ Dependencies table had no organization isolation
- ❌ RLS policies caused performance issues
- ❌ Potential for cross-organization data leakage

### After Fix:
- ✅ All tables have proper organization isolation
- ✅ RLS policies are simple and performant
- ✅ Complete data segregation between organizations
- ✅ Indexed for optimal query performance
- ✅ No cross-organization data access possible

## Technical Details

### Junction Table Pattern

All junction tables now follow this pattern:

```sql
ALTER TABLE <table_name>
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate from parent table
UPDATE <table_name> t
SET organization_id = parent.organization_id
FROM <parent_table> parent
WHERE t.<parent_id> = parent.id
AND t.organization_id IS NULL;

-- Make NOT NULL
ALTER TABLE <table_name>
ALTER COLUMN organization_id SET NOT NULL;

-- Add index
CREATE INDEX idx_<table_name>_org_id ON <table_name>(organization_id);

-- Simple RLS policy
CREATE POLICY "Org scoped <table_name>"
ON <table_name> FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());
```

### Benefits of Direct organization_id

1. **Performance**: No complex JOINs in RLS policies
2. **Clarity**: Obvious what each policy does
3. **Maintainability**: Easy to update and test
4. **Reliability**: No RLS recursion issues

## Related Files

- Migration: `backend/migrations/015_fix_all_tables_rls.sql`
- Script: `backend/scripts/run-migration-015.ts`
- Verification: `backend/scripts/verify-and-fix-rls.ts`
- Documentation: This file

## Next Steps

1. **Run the migration** in Supabase (see instructions above)
2. **Verify** using `npm run verify-rls`
3. **Test** your application to ensure data isolation works
4. **Monitor** for any RLS-related errors in logs

## Questions or Issues?

If you encounter any problems:

1. Check the Supabase Dashboard > Logs for detailed errors
2. Verify the `user_organization_id()` function exists and works
3. Ensure all users have a valid `organization_id`
4. Check that the auth token contains the user's organization

## Status

- [x] Issues identified
- [x] Migration created
- [x] Scripts added to package.json
- [ ] **Migration executed in Supabase** ⬅️ **YOU ARE HERE**
- [ ] Verification completed
- [ ] Testing completed
