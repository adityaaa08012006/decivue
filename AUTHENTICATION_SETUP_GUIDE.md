# AUTHENTICATION SETUP & TESTING GUIDE

## 🎉 Implementation Complete!

The authentication system has been successfully implemented with the following features:
- ✅ Multi-organization support with unique organization codes
- ✅ Two-tier role system (Organization Lead & Team Member)
- ✅ Supabase Auth integration
- ✅ Row-Level Security (RLS) for data isolation
- ✅ Role-based UI and permissions
- ✅ Clean, minimal design matching your existing theme

---

## 📋 SETUP INSTRUCTIONS

### Step 1: Run Database Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration Script**
   - Open the file: `backend/migrations/006_add_authentication.sql`
   - Copy the entire contents
   - Paste into Supabase SQL Editor
   - Click **Run**

3. **Verify Migration Success**
   You should see a success message and these tables created:
   - `organizations`
   - `users`
   - All existing tables now have `organization_id` column

### Step 2: Update Environment Variables

**Backend** (`backend/.env`):
```env
# Existing
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
PORT=3001

# NEW - Required for auth (get from Supabase Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Frontend** (`frontend/.env` - create if it doesn't exist):
```env
VITE_API_URL=http://localhost:3001/api
```

### Step 3: Install Dependencies (if needed)

No new npm packages are required! Everything uses existing dependencies.

### Step 4: Start the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🧪 TESTING THE AUTHENTICATION FLOW

### Test 1: Create Organization & Leader Account

1. **Open the app** (http://localhost:5173)
2. You should see the **Login page**
3. Click **"Sign up"**
4. Click **"Create Organization"** tab
5. Fill in the form:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Password: `password123`
   - Organization Name: `Acme Corp`
6. Click **"Create Organization"**
7. **Success!** You should see:
   - Green success message with your organization code (e.g., `ORG-A1B2`)
   - Auto-redirect to dashboard after 3 seconds
8. **Verify Dashboard:**
   - Sidebar shows your name and email
   - Role badge shows "Org Lead" in blue
   - Organization code displayed in green
   - You can see the dashboard

### Test 2: Logout

1. Click **"Log out"** at the bottom of the sidebar
2. You should be redirected back to the login page

### Test 3: Login as Organization Lead

1. On login page:
   - Email: `john@example.com`
   - Password: `password123`
2. Click **"Sign In"**
3. You should be logged in and see the dashboard

### Test 4: Join Organization as Team Member

1. **Logout** first
2. Click **"Sign up"**
3. Click **"Join Team"** tab
4. Fill in the form:
   - Full Name: `Jane Smith`
   - Email: `jane@example.com`
   - Password: `password123`
   - Organization Code: `ORG-A1B2` (use the code from Test 1)
5. Click **"Join Organization"**
6. **Success!** You should be logged in
7. **Verify:**
   - Sidebar shows "Team Member" badge (gray)
   - NO organization code shown (only leaders see this)

### Test 5: Role-Based Permissions

**As Team Member (Jane):**
1. Create a new decision
2. Try to edit YOUR OWN decision → Should work ✅
3. **Logout** and login as Org Lead (John)
4. Edit Jane's decision → Should work ✅
5. **Test deletion:**
   - As Team Member: Should NOT see delete button ❌
   - As Org Lead: Should see and be able to delete ✅

### Test 6: Organization Data Isolation

1. **As John (Org Lead):** Create some decisions
2. **Logout** and **Create a new organization** with a different email
3. **Verify:** You should NOT see John's decisions
4. Each organization's data is completely isolated ✅

### Test 7: Session Persistence

1. Login as any user
2. **Refresh the page** (F5)
3. You should remain logged in ✅
4. **Close the browser** and reopen
5. Navigate to the app
6. You should still be logged in ✅

### Test 8: Invalid Organization Code

1. Go to registration page
2. Click "Join Team"
3. Enter **invalid organization code**: `INVALID`
4. Try to submit
5. Should see error: "Invalid organization code" ❌

---

## 🔍 TROUBLESHOOTING

### Issue: "permission denied for schema auth"
**Solution:** This was fixed in the migration script. Helper functions are now created in the `public` schema instead of the `auth` schema.

If you still see this error:
1. Make sure you're using the latest version of `006_add_authentication.sql`
2. The helper functions should be `public.user_organization_id()` and `public.can_edit_decision()`, NOT in the `auth` schema
3. Re-run the migration if needed (it's idempotent)

### Issue: "Failed to generate organization code"
**Solution:** Make sure the `generate_org_code()` function was created by the migration.
```sql
-- Run this in Supabase SQL Editor to verify:
SELECT generate_org_code();
-- Should return something like "ORG-A1B2"
```

### Issue: "User profile not found" after login
**Solution:** The `users` table might not have the profile. Check:
```sql
SELECT * FROM users WHERE email = 'your@email.com';
```

### Issue: Backend returns 401 errors
**Possible causes:**
1. Migration didn't run successfully
2. `SUPABASE_SERVICE_ROLE_KEY` not set in `.env`
3. Supabase RLS policies not applied

**Fix:**
- Re-run the migration script
- Verify environment variables
- Check Supabase Authentication settings

### Issue: "organization_id" column missing
**Solution:** Re-run the migration. It's idempotent (safe to run multiple times).

### Issue: Can't see other users' data in same organization
**Solution:** This might be correct! Check the rules:
- **Decisions:** Everyone in org can VIEW all decisions
- **Edit:** Leaders can edit any, Members only edit their own
- **Delete:** Only Leaders can delete

---

## 📊 WHAT WAS IMPLEMENTED

### Database Changes
- ✅ Created `organizations` table
- ✅ Created `users` table
- ✅ Added `organization_id` to all decision tables
- ✅ Implemented Row-Level Security (RLS) policies
- ✅ Organization code generation function
- ✅ Role-based edit permission function

### Backend Changes
- ✅ Authentication middleware (`backend/src/middleware/auth.ts`)
- ✅ Auth routes (register/login/logout)
- ✅ Protected all API routes with authentication
- ✅ Organization-scoped queries

### Frontend Changes
- ✅ Auth context for state management
- ✅ Login page (matches design theme)
- ✅ Registration page (dual-mode: create org vs join)
- ✅ API service with auth token interceptors
- ✅ Sidebar with user info and logout
- ✅ App.jsx with auth routing
- ✅ Session persistence in localStorage

---

## 🎯 NEXT STEPS (OPTIONAL ENHANCEMENTS)

While the core authentication is complete, you might consider these future enhancements:

### 1. Email Verification
- Enable Supabase email confirmation
- Add email verification flow

### 2. Password Reset
- Implement "Forgot Password" link
- Use Supabase password reset flow

### 3. Profile Management
- Allow users to update their name/email
- Change password functionality

### 4. Team Management (For Leaders)
- View all team members
- Remove team members
- Change member roles

### 5. Organization Settings (For Leaders)
- Edit organization name
- Regenerate organization code
- View organization statistics

### 6. Advanced Permissions
- More granular permissions (e.g., "can manage assumptions")
- Custom roles beyond Lead/Member

---

## 📁 FILES CREATED/MODIFIED

### New Files Created:
```
backend/
├── migrations/
│   └── 006_add_authentication.sql
├── src/
│   ├── middleware/
│   │   └── auth.ts
│   └── api/routes/
│       └── auth.ts

frontend/
├── src/
│   ├── contexts/
│   │   └── AuthContext.jsx
│   └── components/
│       ├── LoginPage.jsx
│       └── RegisterPage.jsx
```

### Files Modified:
```
backend/
└── src/
    └── server.ts (added auth routes, protected endpoints)

frontend/
└── src/
    ├── App.jsx (added auth routing)
    ├── components/
    │   └── Sidebar.jsx (added user info, logout)
    └── services/
        └── api.js (added auth interceptors)
```

---

## 🔐 SECURITY NOTES

### What's Secure:
- ✅ Passwords hashed by Supabase Auth
- ✅ JWT tokens for authentication
- ✅ Row-Level Security enforces data isolation
- ✅ Organization data completely isolated
- ✅ Role checks on both frontend and backend

### Important:
- 🔒 NEVER commit `.env` files to git
- 🔒 Keep `SUPABASE_SERVICE_ROLE_KEY` secret
- 🔒 RLS policies prevent cross-organization data access
- 🔒 Backend validates all permissions (don't rely on frontend checks only)

---

## 💡 TIPS

1. **Organization Codes:**
   - Format: `ORG-XXXX` (4 random alphanumeric characters)
   - Automatically generated when creating an organization
   - Only Organization Leads can see their code
   - Share the code with team members to let them join

2. **Roles:**
   - **Lead:** Full access - create, edit any, delete any
   - **Member:** Limited access - create, edit own only, view all

3. **Data Isolation:**
   - Each organization is completely isolated
   - No way to access another organization's data
   - Enforced at database level (RLS)

---

## ✅ VERIFICATION CHECKLIST

Before deploying to production, verify:

- [ ] Database migration ran successfully
- [ ] All tables have `organization_id` column
- [ ] Can register new organization
- [ ] Can join existing organization
- [ ] Login works
- [ ] Logout works
- [ ] Session persists across page refresh
- [ ] Organization Lead sees org code
- [ ] Team Member does NOT see org code
- [ ] Lead can edit any decision
- [ ] Member can only edit own decisions
- [ ] Lead can delete decisions
- [ ] Member cannot delete decisions
- [ ] Different organizations cannot see each other's data
- [ ] Invalid org code is rejected

---

## 🎊 YOU'RE DONE!

Your DECIVUE application now has a complete authentication system with:
- Multi-organization support
- Role-based access control
- Clean, minimal UI
- Production-ready security

Enjoy your authenticated decision monitoring system! 🚀
