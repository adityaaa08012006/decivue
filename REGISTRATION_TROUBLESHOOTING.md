# Registration Troubleshooting Checklist

## ✅ Pre-Registration Checklist

### Step 1: Verify Database Migration
Run this in Supabase SQL Editor to check if the migration was applied:

```sql
-- Check if organizations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'organizations'
);

-- Check if users table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'users'
);

-- Check if generate_org_code function exists
SELECT generate_org_code();
```

If any of these fail, you need to run the migration: `backend/migrations/006_add_authentication.sql`

### Step 2: Verify Supabase Auth is Enabled

1. Go to your Supabase Dashboard
2. Navigate to **Authentication > Providers**
3. Make sure "Email" provider is **ENABLED**
4. Check "Confirm email" setting:
   - For testing, **disable** email confirmation
   - Go to **Authentication > Settings**
   - Turn OFF "Enable email confirmations"

### Step 3: Check Backend is Running

```bash
# In backend directory
npm run dev
```

You should see:
```
Server running on port 3001
Supabase client initialized
Supabase admin client initialized  <-- Important!
```

If you don't see "Supabase admin client initialized", check your `.env` file.

### Step 4: Check Frontend is Running

```bash
# In frontend directory
npm run dev
```

Should start on `http://localhost:5173`

### Step 5: Check Browser Console

Open Browser DevTools (F12) and check:
1. **Network tab**: Look for failed requests to `/api/auth/register/create-org`
2. **Console tab**: Look for JavaScript errors

---

## 🔍 Common Registration Errors & Fixes

### Error: "Failed to create user"

**Possible causes:**
1. Email already exists in Supabase Auth
2. Supabase email confirmation is enabled (blocks signups)
3. Password doesn't meet Supabase requirements

**Fixes:**
```sql
-- Check if email already exists
SELECT email FROM auth.users WHERE email = 'your@email.com';

-- If it exists, delete it (testing only!)
DELETE FROM auth.users WHERE email = 'your@email.com';
```

Or in **Supabase Dashboard > Authentication > Users**, manually delete the user.

### Error: "Failed to generate organization code"

**Fix:** Run this in SQL Editor:
```sql
-- Test the function
SELECT generate_org_code();

-- If it fails, recreate it
CREATE OR REPLACE FUNCTION generate_org_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'ORG-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM organizations WHERE org_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;
```

### Error: "Failed to create organization"

**Check RLS policies:**
```sql
-- Temporarily disable RLS for testing
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Try registration again

-- Re-enable RLS after testing
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

### Error: "Failed to create user profile"

**Check if users table has correct structure:**
```sql
-- Should show: id, email, full_name, role, organization_id, created_at, updated_at
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users';
```

### Error: Network Error / Can't reach backend

**Check:**
1. Backend is running on port 3001
2. No CORS errors in browser console
3. Frontend API_URL is correct: `http://localhost:3001/api`

---

## 🧪 Manual Test Registration via API

Test the registration endpoint directly:

```bash
# Create Organization
curl -X POST http://localhost:3001/api/auth/register/create-org \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "organizationName": "Test Org"
  }'
```

Expected response:
```json
{
  "message": "Organization created successfully",
  "session": { ... },
  "user": {
    "id": "uuid",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "lead",
    "organizationId": "uuid",
    "organizationName": "Test Org",
    "orgCode": "ORG-XXXX"
  }
}
```

---

## 📝 Quick Debug Steps

1. **Restart Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Check Backend Logs:** Look for errors when you try to register

3. **Check Browser Network Tab:**
   - Find the `/api/auth/register/create-org` request
   - Click on it
   - Check the **Response** tab for error details

4. **Check Supabase Logs:**
   - Go to Supabase Dashboard
   - Click on your project
   - Navigate to **Logs > Auth Logs**
   - Look for failed sign-up attempts

---

## 🚨 If Still Failing

**Provide these details:**

1. **Exact error message** from the frontend
2. **Backend console output** (terminal where backend is running)
3. **Browser console errors** (F12 > Console tab)
4. **Network request details:**
   - Request URL
   - Request payload
   - Response status code
   - Response body

Run this command and share the output:
```bash
# Check if migration was applied
cd backend
node -e "console.log('DB URL:', process.env.SUPABASE_URL ? '✓' : '✗'); console.log('Anon Key:', process.env.SUPABASE_ANON_KEY ? '✓' : '✗'); console.log('Service Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');"
```
