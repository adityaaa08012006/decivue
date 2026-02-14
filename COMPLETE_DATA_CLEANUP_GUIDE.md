# COMPLETE DATA CLEANUP & ISOLATION GUIDE

## Current Status
✅ Backend is running and all endpoints are accessible
✅ All code fixes are in place
⏳ Need to clean database and verify isolation

---

## STEP 1: Clean All Old Data in Supabase

### What This Does
- Deletes ALL old data without organization_id
- Optionally deletes test organizations and users
- Ensures fresh start for new signups
- Existing users keep only THEIR organization's data

### How to Run

1. **Open Supabase Dashboard**
   - Go to https://supabase.com
   - Select your project

2. **Go to SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "+ New query"

3. **Copy the Cleanup Script**
   - Open file: `backend/migrations/009_complete_cleanup_and_isolation.sql`
   - Copy the ENTIRE file content

4. **Execute the Script**
   - Paste into SQL Editor
   - Review the optional sections (STEP 2 and STEP 3)
   - If you want to delete ALL test organizations/users, uncomment those sections
   - Click "Run" or press Ctrl+Enter

5. **Review the Output**
   - Look for "ORPHANED DATA CLEANUP COMPLETE"
   - Check the verification results
   - Should show "NO ORPHANED DATA - CLEANUP SUCCESSFUL!"

### Expected Output
```
=== DELETING ALL ORPHANED DATA ===
Deleted X decisions
Deleted X assumptions
Deleted X constraints
...
=== ORPHANED DATA CLEANUP COMPLETE ===

[Shows remaining organizations and data distribution]

✅ NO ORPHANED DATA - CLEANUP SUCCESSFUL!
```

---

## STEP 2: Verify Organization Isolation

### Run Verification Script

1. **Still in Supabase SQL Editor**
2. **Open a New Query**
3. **Copy Verification Script**
   - File: `backend/migrations/verify_user_isolation.sql`
   - Copy the entire content
4. **Run the Script**

### Expected Results

When you run this as an authenticated user, you should see:
- ✅ Your user ID and email
- ✅ ONLY your organization's data
- ✅ ONLY team members from your organization
- ✅ Zero other organizations visible
- ✅ Counts matching only your organization's data

If you see data from other organizations, RLS is broken!

---

## STEP 3: Test the Complete Flow

### Test 1: Create New Organization (SIGNUP)

1. **Open your frontend** (http://localhost:5173)
2. **Click "Create New Organization"**
3. **Register with a new email**:
   ```
   Email: neworg@test.com
   Password: password123
   Full Name: Test User
   Organization Name: New Test Org
   ```
4. **After successful signup**:
   - ✅ Should show empty dashboard (NO old data)
   - ✅ Should show organization code (ORG-XXXX)
   - ✅ Decisions list should be EMPTY
   - ✅ Assumptions list should be EMPTY

5. **Create a test decision**:
   - Click "Add Decision"
   - Title: "Test Decision for New Org"
   - Should create successfully

### Test 2: Login with Existing User (SIGN IN)

1. **Logout from new organization**
2. **Login with an existing user** (one that has data)
3. **After successful login**:
   - ✅ Should see ONLY their organization's previous data
   - ✅ Should NOT see the "Test Decision for New Org" from Test 1
   - ✅ Should see their organization code
   - ✅ All data should be from their organization only

### Test 3: Verify Complete Isolation

1. **Create a second new organization**:
   ```
   Email: secondorg@test.com
   Password: password123
   Full Name: Second User
   Organization Name: Second Org
   ```

2. **Verify isolation**:
   - ✅ Second org should have ZERO data
   - ✅ Should NOT see data from "New Test Org"
   - ✅ Should have different organization code

3. **Switch between organizations**:
   - Login as neworg@test.com → should see data from New Test Org only
   - Login as secondorg@test.com → should see data from Second Org only
   - Each should have completely separate data

---

## STEP 4: Verify in Database

Run this query in Supabase SQL Editor to see data distribution:

```sql
SELECT
  o.name as organization_name,
  o.org_code,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT d.id) as decisions,
  COUNT(DISTINCT a.id) as assumptions,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN decisions d ON d.organization_id = o.id
LEFT JOIN assumptions a ON a.organization_id = o.id
GROUP BY o.id, o.name, o.org_code
ORDER BY o.created_at;
```

### Expected Results
Each organization should show:
- Exactly the number of users in that org
- Only decisions created by that org
- Only assumptions created by that org
- No overlap between organizations

---

## Troubleshooting

### If You See Old Data After Cleanup

**Run this query to check for orphans:**
```sql
SELECT
  'decisions' as table_name,
  COUNT(*) as orphan_count
FROM decisions
WHERE organization_id IS NULL

UNION ALL

SELECT 'assumptions', COUNT(*)
FROM assumptions
WHERE organization_id IS NULL

UNION ALL

SELECT 'constraints', COUNT(*)
FROM constraints
WHERE organization_id IS NULL;
```

**If you see any orphans**, re-run the cleanup script.

### If New Signups See Old Data

**This means RLS policies aren't working correctly.**

Check:
1. Run Migration 007 if you haven't: `backend/migrations/007_enable_rls_with_registration_support.sql`
2. Verify RLS is enabled on all tables
3. Check that all data has organization_id (no NULL values)

### If Existing Logins Don't See Their Data

**Check user's organization_id:**
```sql
SELECT
  u.email,
  u.organization_id,
  o.name as org_name,
  o.org_code
FROM users u
JOIN organizations o ON o.id = u.organization_id
WHERE u.email = 'your-email-here@example.com';
```

### If Errors During Cleanup

1. Make sure you're using an admin account in Supabase
2. Check for foreign key constraints
3. Review error messages carefully
4. Some sections may need to be run separately

---

## Success Checklist

After completing all steps, verify:

- [ ] Cleanup script ran successfully in Supabase
- [ ] No orphaned data (organization_id = NULL)
- [ ] Verification script shows proper isolation
- [ ] New signup creates organization with ZERO data
- [ ] Existing login shows ONLY their organization's data
- [ ] Multiple organizations completely isolated
- [ ] Each user identified by email correctly
- [ ] Backend is running without errors
- [ ] Frontend connects to backend successfully

---

## What Happens Now

### For NEW SIGNUPS (Create Organization):
1. User registers with email/password
2. Backend creates new organization with unique ORG-XXXX code
3. User starts with ZERO decisions/assumptions
4. Fresh, clean slate
5. All new data automatically tagged with their organization_id

### For EXISTING LOGINS (Sign In):
1. User logs in with email/password
2. Backend retrieves their organization_id from users table
3. Frontend shows ONLY data from their organization
4. All previous decisions/assumptions visible
5. RLS policies block data from other organizations

### Data Isolation Guarantee:
- ✅ Each organization has unique ID
- ✅ All data tables have organization_id column
- ✅ RLS policies enforce WHERE organization_id = user's org
- ✅ Backend auto-injects organization_id on create
- ✅ Users identified by email addresses
- ✅ Complete separation between organizations

---

## Summary

**What You Need to Do RIGHT NOW:**

1. **Go to Supabase Dashboard → SQL Editor**
2. **Run cleanup script**: `backend/migrations/009_complete_cleanup_and_isolation.sql`
3. **Run verification script**: `backend/migrations/verify_user_isolation.sql`
4. **Test the flow**: Create new org, login with existing user
5. **Verify isolation**: Each org sees only their data

That's it! After these steps:
- ✅ All old orphaned data deleted
- ✅ New signups start fresh
- ✅ Existing logins see only their data
- ✅ Complete organization isolation

Your application is now properly multi-tenant with complete data isolation!
