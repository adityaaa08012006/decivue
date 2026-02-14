# NUKE EVERYTHING - Complete Reset

## What This Does
Deletes **EVERYTHING**:
- All organizations
- All users
- All decisions, assumptions, constraints
- All notifications, evaluations, etc.
- **Complete clean slate**

---

## Step 1: Delete All Data

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy entire content** of `backend/migrations/NUKE_EVERYTHING.sql`
3. **Paste into SQL Editor**
4. **Click "Run"**

**Expected Result:**
```
table_name                  | remaining_count
----------------------------|----------------
organizations               | 0
users                       | 0
decisions                   | 0
assumptions                 | 0
... (all 0)
```

---

## Step 2: Delete Auth Users (Optional)

The script doesn't delete from `auth.users` table (requires special permissions).

**Option A: Delete via UI**
1. Go to Supabase Dashboard
2. Click "Authentication" → "Users"
3. Manually delete each user
4. Click the trash icon for each

**Option B: Delete via SQL** (if you have permissions)
```sql
DELETE FROM auth.users;
```

If you get permission error, use Option A.

---

## Step 3: Start Fresh

Now your database is completely empty!

**Create Your First Real Organization:**

1. Open frontend: http://localhost:5173
2. Click "Create New Organization"
3. Register with YOUR REAL email:
   ```
   Email: your-real-email@gmail.com
   Password: [your-password]
   Full Name: [your-name]
   Organization Name: [your-org-name]
   ```

4. You'll get:
   - ✅ Empty dashboard (zero data)
   - ✅ Unique organization code (ORG-XXXX)
   - ✅ Role: Organization Lead
   - ✅ Complete isolation

5. Start creating decisions/assumptions from scratch!

---

## What Happens After Reset

### You Get:
- ✅ Clean database with zero test data
- ✅ No orphaned records
- ✅ Perfect organization isolation from day 1
- ✅ Fresh start with your real organization

### When You Create New Org:
1. Backend creates organization with unique ORG-XXXX
2. Creates user profile with "lead" role
3. All future data auto-tagged with organization_id
4. Complete isolation from any future organizations

### When Others Join:
- They register with "Join Organization" using your ORG-XXXX code
- They get "member" role
- They see same data as you (same organization)
- Complete isolation from other organizations

---

## Verify Everything is Clean

After nuking, run verification:

```sql
-- Should return 0 for everything
SELECT COUNT(*) as total_organizations FROM organizations;
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_decisions FROM decisions;
```

All should be **0**.

---

## Summary

**Right Now:**
1. ✅ Run `NUKE_EVERYTHING.sql` in Supabase SQL Editor
2. ✅ Verify all counts are 0
3. ✅ Delete auth users via Dashboard → Authentication → Users
4. ✅ Register your real organization in frontend
5. ✅ Start fresh with clean data!

**You'll have a completely clean, properly isolated multi-tenant system!** 🚀
