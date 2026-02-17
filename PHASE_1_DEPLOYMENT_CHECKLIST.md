# Phase 1 Deployment Checklist

## Overview
Deploy notification spam fix: Reduce emails by 90%, maintain productivity

**Estimated Time:** 15-20 minutes  
**Rollback Time:** 5 minutes  
**Risk Level:** LOW (no breaking changes, rollback available)

---

## Pre-Deployment Check

- [ ] Backend server is running
- [ ] Database connection is healthy
- [ ] You have Supabase admin access
- [ ] You can receive test emails

---

## Step 1: Apply Database Migration (5 min)

### Option A: Using Supabase Dashboard
1. Navigate to SQL Editor in Supabase Dashboard
2. Open `backend/migrations/027_add_email_sent_to_notifications.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **Run**
6. Verify success message

### Option B: Using psql Command Line
```bash
cd backend/migrations
psql $DATABASE_URL -f 027_add_email_sent_to_notifications.sql
```

### Verification
Run this query in SQL Editor:
```sql
-- Should return 1 row
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND column_name = 'email_sent';
```

**Expected Output:**
```
column_name | data_type | column_default
email_sent  | boolean   | false
```

✅ **Checkpoint:** Migration applied successfully

---

## Step 2: Configure Environment Variables (2 min)

Edit `backend/.env`:

```bash
# Add or update these lines:
NOTIFICATION_CHECK_CRON=0 */6 * * *
EMAIL_NOTIFICATIONS_ENABLED=true
FRONTEND_URL=http://localhost:5173  # or your frontend URL
```

✅ **Checkpoint:** Environment configured

---

## Step 3: Restart Backend Server (3 min)

```bash
cd backend

# Stop current process (Ctrl+C or kill process on port 3001)

# Start fresh
npm run dev
```

### Verify Logs Show:
```
✓ Notification scheduler started (runs every 6 hours)
✓ Next check will run at: [timestamp]
```

✅ **Checkpoint:** Backend running with new code

---

## Step 4: Smoke Tests (5 min)

### Test 1: Non-Critical Notification (Should NOT Send Email)
1. Create a decision with health = 60%
2. Expected:
   - ✅ Notification appears in app
   - ✅ Backend log shows: `📬 Non-critical notification queued for morning briefing`
   - ❌ NO email received

### Test 2: Critical Notification (Should Send Email)
1. Create a decision with health = 35%
2. Expected:
   - ✅ Notification appears in app
   - ✅ Backend log shows: `🚨 Critical notification - sent immediate email`
   - ✅ Email received within 30 seconds

### Test 3: Throttling (Should Prevent Duplicate)
1. Trigger the same notification type again for the same decision
2. Expected:
   - ✅ Backend log shows: `Throttling notification - duplicate within 24h window`
   - ❌ No new notification created

### Test 4: Scheduler Frequency
1. Note the time
2. Wait 15 minutes
3. Expected:
   - ❌ Scheduler did NOT run (old behavior would have run)
4. Check backend logs after 6 hours
5. Expected:
   - ✅ Log shows: `Running notification checks...`

✅ **Checkpoint:** All tests passed

---

## Step 5: Monitor Production (24h)

### Key Metrics to Track

Run these queries after 24 hours:

#### 1. Notification Volume
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emails_sent,
  ROUND(100.0 * COUNT(CASE WHEN email_sent = true THEN 1 END) / COUNT(*), 2) as email_percentage
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE(created_at);
```

**Expected:** email_percentage < 15% (down from ~90%)

#### 2. Critical Notifications
```sql
SELECT 
  type,
  severity,
  COUNT(*) as count,
  COUNT(CASE WHEN email_sent = true THEN 1 END) as emailed
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
AND severity = 'CRITICAL'
GROUP BY type, severity;
```

**Expected:** All CRITICAL notifications have email_sent = true

#### 3. User Email Load
```sql
SELECT 
  u.email,
  COUNT(n.id) as total_notifications,
  COUNT(CASE WHEN n.email_sent = true THEN 1 END) as immediate_emails,
  COUNT(CASE WHEN n.email_sent = false THEN 1 END) as queued_for_briefing
FROM notifications n
JOIN decisions d ON n.decision_id = d.id
JOIN users u ON u.organization_id = d.organization_id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
GROUP BY u.email
ORDER BY immediate_emails DESC;
```

**Expected:** immediate_emails < 5 per user (down from 30-50)

✅ **Checkpoint:** Metrics show 90% email reduction

---

## Success Criteria

✅ **Must Have (P0):**
- Database migration applied without errors
- Backend server running with new code
- Critical notifications send immediate emails
- Non-critical notifications do NOT send immediate emails
- All notifications appear in-app regardless of email status

✅ **Should Have (P1):**
- Email volume reduced by 80%+ within 24 hours
- No user complaints about missed critical issues
- Scheduler running every 6 hours (not 15 minutes)
- Throttling preventing duplicate notifications

✅ **Nice to Have (P2):**
- Email volume reduced by 90%+ within 48 hours
- Zero notification-related errors in logs
- User feedback: "Much less email noise!"

---

## Rollback Plan (If Needed)

### Scenario 1: Too Many Emails Still Being Sent
**Problem:** email_sent = true for too many notifications

**Quick Fix:**
```bash
# Increase critical threshold in backend/.env
# (Or add temporary killswitch)
EMAIL_NOTIFICATIONS_ENABLED=false
```

Restart backend. All emails stop, in-app continues.

### Scenario 2: Critical Emails Not Being Sent
**Problem:** isCritical() logic too strict

**Quick Fix:**
1. Edit `backend/src/services/notification-service.ts`
2. Lower threshold in isCritical() method (line ~80)
3. Change `health < 40` to `health < 60`
4. Restart backend

### Scenario 3: Complete Rollback
**Nuclear option:** Revert to pre-Phase 1 code

```bash
cd backend

# Revert scheduler frequency
# In src/services/scheduler.ts line 15:
const cronSchedule = process.env.NOTIFICATION_CHECK_CRON || '*/15 * * * *';

# Revert notification-service.ts
# Remove throttling check and email routing logic
# (Restore original create() method)

# Restart
npm run dev
```

**Database Cleanup (optional):**
```sql
-- Remove email_sent column (if causing issues)
ALTER TABLE notifications DROP COLUMN IF EXISTS email_sent;
DROP INDEX IF EXISTS idx_notifications_email_sent;
```

---

## Support & Debugging

### Common Issues

#### Issue: "column email_sent does not exist"
**Solution:** Migration not applied. Run Step 1 again.

#### Issue: Emails still sending every 15 minutes
**Solution:** Backend not restarted. Run Step 3 again.

#### Issue: No notifications appearing at all
**Solution:** Check Supabase connection and RLS policies.

#### Issue: All notifications marked critical
**Solution:** Check isCritical() logic in notification-service.ts

### Debug Logging

Enable verbose logging:
```bash
# backend/.env
LOG_LEVEL=debug
```

Restart backend and watch for:
- `Checking throttle for notification type: [type]`
- `Notification is critical: [true/false]`
- `📬 Non-critical notification queued`
- `🚨 Critical notification - sent immediate email`

---

## Next Steps After Phase 1

Once Phase 1 is stable (2-3 days):

1. **Implement Phase 3: Morning Briefing System**
   - Create daily digest email at 8 AM
   - Group notifications by severity
   - Include statistics and summaries

2. **Add User Preferences**
   - Let users choose briefing time
   - Allow opting out of briefings (critical-only)
   - Custom notification thresholds

3. **Enhanced Analytics**
   - Dashboard for notification trends
   - Email open rates
   - User engagement metrics

---

## Contact

If you encounter issues during deployment:
- Check backend logs: `npm run dev` output
- Review database logs in Supabase Dashboard
- Test queries in SQL Editor
- Check email service status (SMTP connection)

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Deployment Status:** ⬜ Success / ⬜ Rollback Required  
**Notes:** _____________________________________________

---

Last Updated: Phase 1 Implementation
