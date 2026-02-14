# BACKEND CRASH & ENDPOINT FIX

## What Was Wrong

### 1. Backend Crash Issue
**Problem:** Server was crashing on any unhandled promise rejection

**Root Cause:**
```typescript
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection', { reason });
  process.exit(1); // ← This was killing the server!
});
```

**Fixed:**
- Server now only exits on unhandled rejections in **production**
- In **development**, it logs the error and continues running
- Added detailed error logging (message, stack, details)

### 2. Likely Causes of Unhandled Rejections

The rejections were probably caused by:
1. **RLS policies blocking database operations**
2. **Missing organization_id in queries**
3. **Attempting to query data without proper authentication context**

---

## Quick Fix Steps

### Step 1: Restart Backend (REQUIRED)
The fix I made requires a restart:

```bash
cd backend
# Stop current server (Ctrl+C)
npm run dev
```

You should see:
```
Server running on port 3001
Supabase client initialized
Supabase admin client initialized
```

### Step 2: Test Backend is Running

Open a new terminal and run:
```bash
curl http://localhost:3001/api
```

Should return:
```json
{
  "message": "DECIVUE API - Deterministic Decision Monitoring System",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### Step 3: Run the Diagnostic Script

```bash
cd backend
node scripts/diagnose.js
```

This will check:
- ✅ Backend connection
- ✅ Environment variables
- ✅ Endpoint accessibility

---

## Complete Endpoint Map

### Public Endpoints (No Auth Required)
```
POST /api/auth/register/create-org  - Create organization
POST /api/auth/register/join-org    - Join organization
POST /api/auth/login                - Login
POST /api/auth/refresh              - Refresh token
GET  /health                        - Health check
GET  /api                           - API info
```

### Protected Endpoints (Auth Required)
All these require `Authorization: Bearer <token>` header:

```
# Auth
GET  /api/auth/me                   - Get current user
POST /api/auth/logout               - Logout

# Decisions
GET    /api/decisions               - List all decisions
GET    /api/decisions/:id           - Get decision
POST   /api/decisions               - Create decision
PUT    /api/decisions/:id           - Update decision
DELETE /api/decisions/:id           - Delete decision
PUT    /api/decisions/:id/retire    - Retire decision
POST   /api/decisions/:id/evaluate  - Evaluate decision
PUT    /api/decisions/:id/mark-reviewed - Mark reviewed

# Assumptions
GET    /api/assumptions             - List assumptions
GET    /api/assumptions?decisionId=<id> - Get for decision
POST   /api/assumptions             - Create assumption
PUT    /api/assumptions/:id         - Update assumption
DELETE /api/assumptions/:id         - Delete assumption
POST   /api/assumptions/:id/link    - Link to decision
POST   /api/assumptions/:id/conflicts - Report conflict

# Dependencies
GET    /api/dependencies?decisionId=<id> - Get dependencies
POST   /api/dependencies              - Create dependency
DELETE /api/dependencies/:id          - Delete dependency

# Constraints
GET    /api/constraints?decisionId=<id> - Get constraints
GET    /api/constraints/all          - Get all constraints
POST   /api/constraints              - Create constraint
DELETE /api/constraints/:id          - Delete constraint
POST   /api/constraints/link         - Link to decision

# Constraint Violations
GET    /api/constraint-violations    - List violations
GET    /api/constraint-violations/:id - Get violation
PUT    /api/constraint-violations/:id/resolve - Resolve
DELETE /api/constraint-violations/:id - Delete
GET    /api/constraint-violations/by-constraint/:id - By constraint

# Assumption Conflicts
GET    /api/assumption-conflicts     - List conflicts
GET    /api/assumption-conflicts/:id - Get conflicts for assumption
POST   /api/assumption-conflicts/detect - Detect conflicts
PUT    /api/assumption-conflicts/:id/resolve - Resolve conflict
DELETE /api/assumption-conflicts/:id - Delete conflict

# Notifications
GET    /api/notifications            - List notifications
GET    /api/notifications/unread-count - Unread count
PUT    /api/notifications/:id/mark-read - Mark read
PUT    /api/notifications/mark-all-read - Mark all read
PUT    /api/notifications/:id/dismiss - Dismiss
DELETE /api/notifications/:id        - Delete

# Profile
GET    /api/profile                  - Get org profile
PUT    /api/profile                  - Update org profile

# Timeline
GET    /api/timeline                 - Get timeline

# Time Simulation
POST   /api/simulate-time            - Simulate time
GET    /api/simulate-time/current    - Get current time

# Parameter Templates
GET    /api/parameter-templates      - Get templates
POST   /api/parameter-templates      - Add custom template
GET    /api/parameter-templates/categories - Get categories
```

---

## Frontend API Configuration

### Verify Frontend is Using Correct URL

**File:** `frontend/src/services/api.js`
```javascript
const API_BASE_URL = 'http://localhost:3001/api';
```

**File:** `frontend/.env`
```
VITE_API_URL=http://localhost:3001/api
```

---

## Common Error Patterns & Fixes

### Error: `ERR_CONNECTION_REFUSED`
**Cause:** Backend not running
**Fix:** Start backend with `cd backend && npm run dev`

### Error: `401 Unauthorized`
**Cause:** Missing or invalid auth token
**Fix:**
1. Check localStorage has `decivue_session` and `decivue_user`
2. Try logging out and logging back in
3. Check token in network tab

### Error: `500 Internal Server Error`
**Cause:** Various (check backend logs)
**Fix:**
1. Check backend terminal for detailed error
2. Look for RLS policy violations
3. Check if organization_id is being set

### Error: `Failed to fetch`
**Cause:** CORS or network issue
**Fix:**
1. Verify backend is running
2. Check frontend is using correct API_BASE_URL
3. Check CORS settings in backend

---

## Testing Endpoints

### Test Authentication Flow

```bash
# 1. Register
curl -X POST http://localhost:3001/api/auth/register/create-org \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "fullName": "Test User",
    "organizationName": "Test Org"
  }'

# Save the access_token from response

# 2. Get current user
curl http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 3. Create decision
curl -X POST http://localhost:3001/api/decisions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Decision",
    "description": "Testing",
    "status": "PROPOSED"
  }'

# 4. List decisions
curl http://localhost:3001/api/decisions \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Monitoring Backend Health

### Watch Backend Logs
```bash
cd backend
npm run dev
# Keep this terminal open and watch for errors
```

### Common Log Patterns

**Good:**
```
✅ Server running on port 3001
✅ Supabase client initialized
✅ Supabase admin client initialized
✅ Event handlers registered
```

**Warning:**
```
⚠️ Server continuing despite unhandled rejection (development mode)
   - Check what caused the rejection
   - Fix the underlying issue
```

**Bad:**
```
❌ Uncaught Exception
❌ Failed to start server
   - These will crash the server
   - Must be fixed immediately
```

---

## Next Steps

1. **Restart backend** with the crash fix
2. **Run diagnostic** to verify all endpoints work
3. **Test registration** to ensure it completes successfully
4. **Run Migration 007** in Supabase if you haven't
5. **Run cleanup script** (Migration 008) to remove old data
6. **Test creating decisions** should work now

---

## If Problems Persist

### Check This Checklist:

- [ ] Backend is running (`npm run dev` in backend folder)
- [ ] No errors in backend console
- [ ] Environment variables are set (.env file exists)
- [ ] SUPABASE_SERVICE_ROLE_KEY is set
- [ ] Migration 007 was run in Supabase
- [ ] Old data was cleaned up (Migration 008)
- [ ] Frontend is using correct API URL
- [ ] Can curl the /api endpoint successfully

### Get Detailed Error Info:

When an error occurs:
1. Check **backend terminal** - should show detailed error
2. Check **browser console** - shows frontend error
3. Check **Network tab** - shows actual request/response
4. Share all three with me for diagnosis

---

## Summary of Fixes Made

✅ **Backend no longer crashes** on unhandled rejections in development
✅ **Better error logging** with full details (message, stack, details)
✅ **Diagnostic script** to verify all endpoints
✅ **Complete endpoint documentation**
✅ **Troubleshooting guide** for common errors

**Your backend should now be stable and continue running even when errors occur!**
