# QUICK FIX - Run This Script Instead

## The Problem
The original cleanup script (009) had syntax that Supabase SQL Editor doesn't like.

## The Solution
Use the new simplified script: **`009_cleanup_simple.sql`**

---

## STEP 1: Clean Orphaned Data

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project
   - Click "SQL Editor" in left sidebar

2. **Run Simple Cleanup Script**
   - Open file: `backend/migrations/009_cleanup_simple.sql`
   - Copy the ENTIRE content
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Review Results**
   - Check the verification section
   - All `orphaned_count` should be 0
   - Shows remaining organizations and their data

**Expected Output:**
```
table_name             | orphaned_count
-----------------------|---------------
decisions              | 0
assumptions            | 0
constraints            | 0
... (all should be 0)

organization_name      | org_code | users_count | decisions_count
-----------------------|----------|-------------|----------------
Your Org Name          | ORG-ABCD | 1           | 5
```

---

## STEP 2: (Optional) Delete Test Organizations

**ONLY if you want to delete entire test organizations:**

1. **Open the optional script**
   - File: `backend/migrations/010_delete_test_orgs_optional.sql`

2. **Run STEP 1 to find test organizations**
   - Copy just the first SELECT query (STEP 1)
   - Run it in Supabase SQL Editor
   - Note the `id` of organizations you want to delete

3. **Delete specific organization**
   - Uncomment STEP 2 in the script
   - Replace `'YOUR-ORG-ID-HERE'` with the actual UUID
   - Replace it in ALL places (there are multiple)
   - Run the entire STEP 2

4. **Verify deletion**
   - Run STEP 3 to see remaining organizations

---

## STEP 3: Verify Isolation

Run the verification script to confirm everything works:
- File: `backend/migrations/verify_user_isolation.sql`
- Copy entire content
- Paste into Supabase SQL Editor
- Click "Run"

**Expected Results:**
- Shows your user ID and organization ID
- Shows ONLY your organization's data
- No other organizations visible

---

## STEP 4: Test in Frontend

1. **Open frontend**: http://localhost:5173

2. **Test New Signup:**
   ```
   Email: newtest@test.com
   Password: password123
   Full Name: New Test User
   Organization Name: Brand New Org
   ```
   - ✅ Should show EMPTY dashboard
   - ✅ Should get unique ORG-XXXX code
   - ✅ NO old data visible

3. **Test Existing Login:**
   - Logout
   - Login with existing user
   - ✅ Should see ONLY their organization's data
   - ✅ Should NOT see "Brand New Org" data

4. **Test Isolation:**
   - Create second new organization
   - ✅ Should be completely separate
   - ✅ Each org sees only their own data

---

## What Each Script Does

### `009_cleanup_simple.sql` (RUN THIS FIRST)
- ✅ Deletes ALL data without organization_id
- ✅ Safe - won't delete valid organizations
- ✅ Shows verification results
- ✅ Works with Supabase SQL Editor

### `010_delete_test_orgs_optional.sql` (OPTIONAL)
- ⚠️ Deletes entire organizations
- ⚠️ Use carefully - irreversible
- ⚠️ Only if you want to remove test orgs completely

### `verify_user_isolation.sql` (RUN LAST)
- ✅ Confirms isolation is working
- ✅ Shows only your organization's data
- ✅ Verifies RLS policies work correctly

---

## If You Still Get Errors

### Error: "syntax error at or near..."
- Make sure you're copying the entire script
- Don't modify the SQL
- Run in Supabase SQL Editor (not another tool)

### Error: "permission denied"
- Make sure you're logged into Supabase Dashboard
- Use the SQL Editor (not the Table Editor)
- Verify you have admin access to the project

### Error: "relation does not exist"
- Make sure Migration 006 and 007 were run first
- Check that tables exist in Table Editor
- Verify you're in the correct project

---

## Summary

**What to do RIGHT NOW:**

1. ✅ Run `009_cleanup_simple.sql` in Supabase SQL Editor
2. ✅ Check all orphaned counts are 0
3. ✅ Run `verify_user_isolation.sql` to confirm
4. ✅ Test new signup (should be empty)
5. ✅ Test existing login (should see their data)

**That's it! The simpler scripts will work without syntax errors.**
