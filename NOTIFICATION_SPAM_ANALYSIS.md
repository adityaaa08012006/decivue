# 🚨 Notification Spam Analysis & Recommendations

## Problem Summary
Users are receiving excessive notifications and emails, creating a spam-like experience. This analysis identifies the root causes and provides actionable recommendations.

---

## 📊 Current Notification Triggers

### 1. **Automated Scheduler (Every 15 Minutes)**
**Location:** `backend/src/services/scheduler.ts`

```typescript
const cronSchedule = process.env.NOTIFICATION_CHECK_CRON || '*/15 * * * *';
```

**Runs 4 automated checks:**
- `checkAssumptionConflicts()` - Checks all assumptions for conflicts
- `checkDegradedHealth()` - Scans all decisions with health < 65%
- `checkNeedsReview()` - Finds decisions not reviewed in 30+ days
- `checkExpiringDecisions()` - Identifies decisions expiring within 30 days

**Issue:** Runs **96 times per day**, creating duplicate notifications if detection logic fails.

---

### 2. **Manual Conflict Detection**
Users can manually trigger conflict detection from the UI:
- Assumption Conflicts Page → "Detect Conflicts" button
- Decision Conflicts Page → "Detect Conflicts" button

**Issue:** Creates notifications for **every conflict found**, not just new ones.

---

### 3. **Assumption Status Validation**
**Location:** `backend/src/services/assumption-validation-service.ts`

**Triggers:**
- When user manually changes assumption status (VALID → SHAKY → BROKEN)
- When all decisions using an assumption are retired (auto-deprecation)

**Creates notifications for:**
- Status mismatches (manual override vs. AI validation)
- Auto-deprecated assumptions

---

### 4. **Each Notification = Automatic Email**
**Location:** `backend/src/services/notification-service.ts` → `EmailNotificationHandler`

```typescript
// Every notification creation automatically sends emails
await EmailNotificationHandler.sendForNotification({
  type: params.type,
  severity: params.severity,
  title: params.title,
  message: params.message,
  // ...
});
```

**Issue:** No batching, no digest mode - every notification sends individual emails to ALL team members.

---

## 🔥 Critical Issues

### Issue 1: Duplicate Notification Detection is Inconsistent

| Check Type | Deduplication | Time Window | Problem |
|------------|--------------|-------------|---------|
| **Degraded Health** | ✅ Yes | 24 hours | Good |
| **Needs Review** | ✅ Yes | Until dismissed | Good |
| **Assumption Conflicts** | ✅ Yes | Until dismissed | Good |
| **Expiring Decisions** | ⚠️ Partial | Checks for "expiring" text | Can create duplicates |
| **Status Mismatches** | ✅ Yes | Until dismissed | Good |
| **Auto-Deprecation** | ✅ Yes | Until dismissed | Good |

**Problem:** The scheduler running every 15 minutes can still create near-duplicates if:
- A notification is dismissed right before the next check
- The detection logic has edge cases

---

### Issue 2: No Email Batching

**Current Flow:**
```
1 Decision Health Degrades → 1 Notification → 1 Email (to all 5 team members) = 5 emails
2 Assumptions Conflict → 2 Notifications → 2 Emails = 10 emails total
3 Decisions Need Review → 3 Notifications → 3 Emails = 15 emails total
───────────────────────────────────────────────────────────────────────────
Total: 6 notifications = 30 individual emails sent
```

**Users receive:**
- Multiple emails within minutes
- Each email for a single issue
- No way to get a daily digest

---

### Issue 3: Scheduler Frequency Too High

Running every **15 minutes** (96x/day) is excessive for:
- Health checks (decisions don't degrade that fast)
- Review reminders (30-day review window)
- Expiry warnings (30-day expiry window)

Only assumption validation needs near-real-time detection.

---

### Issue 4: No User Control Over Email Cadence

Users can disable email types via preferences:
```sql
email_notifications: {
  assumption_conflict: true,
  health_degraded: true,
  lifecycle_changed: true,
  // ...
}
```

**But cannot control:**
- Email frequency (immediate vs. daily digest)
- Notification priority levels
- Quiet hours
- Batching preferences

---

## ✅ Recommended Actions

### 🎯 Priority 1: Immediate Fixes

#### 1.1 Reduce Scheduler Frequency
**Change:** `*/15 * * * *` (every 15 min) → `0 */6 * * *` (every 6 hours)

```typescript
// backend/src/services/scheduler.ts
const cronSchedule = process.env.NOTIFICATION_CHECK_CRON || '0 */6 * * *';
```

**Impact:** Reduces automated checks from 96/day to 4/day (morning, noon, evening, night)

---

#### 1.2 Add Email Digest Mode

**Create daily digest batching:**

```typescript
// Option 1: Batch by time window
// Collect notifications from last 24 hours
// Send single email with summary at 8 AM daily

// Option 2: Batch by threshold
// If 3+ notifications in 1 hour → batch into single email
```

**Implementation:**
- Add user preference: `email_delivery_mode: 'immediate' | 'daily_digest' | 'hourly_batch'`
- Queue notifications instead of sending immediately
- Send digest emails at scheduled times

---

#### 1.3 Improve Duplicate Detection for Expiring Decisions

**Current logic:**
```typescript
.like('message', '%expiring%')  // Too loose
```

**Better approach:**
```typescript
// Store notification fingerprint
.eq('metadata->expiryDate', decision.expiry_date)
.eq('decision_id', decision.id)
```

---

### 🎯 Priority 2: Short-Term Improvements

#### 2.1 Add Notification Throttling

**Per decision/assumption:**
- Max 1 notification per type per decision per 24 hours
- Max 3 total notifications per decision per 24 hours

**Implementation:**
```typescript
// Before creating notification
const recentCount = await db
  .from('notifications')
  .select('id')
  .eq('decision_id', decisionId)
  .gte('created_at', oneDayAgo)
  .count();

if (recentCount >= 3) {
  logger.info('Throttling notification - too many recent alerts');
  return;
}
```

---

#### 2.2 Implement Notification Priority Levels

```typescript
type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

// LOW: Only in-app notification (no email)
// MEDIUM: Daily digest email
// HIGH: Immediate email (current behavior)
// URGENT: Immediate email + SMS (future)
```

**Rules:**
- `NEEDS_REVIEW` → LOW (in-app only)
- `HEALTH_DEGRADED` (65-40%) → MEDIUM (daily digest)
- `HEALTH_DEGRADED` (<40%) → HIGH (immediate)
- `LIFECYCLE_CHANGED` to INVALIDATED → URGENT

---

#### 2.3 Add Notification Aggregation UI

Instead of:
```
❌ 5 separate notifications: "Decision A needs review", "Decision B needs review"...
```

Show:
```
✅ 1 aggregated notification: "5 decisions need review" (click to expand)
```

---

### 🎯 Priority 3: Long-Term Enhancements

#### 3.1 User Notification Preferences Dashboard

Allow users to configure:
- Email delivery schedule (immediate, hourly, daily, weekly)
- Quiet hours (e.g., no emails 10 PM - 8 AM)
- Priority thresholds (only email for HIGH+ priority)
- Channel preferences (email, in-app, SMS, Slack)

---

#### 3.2 Smart Notification Grouping

```typescript
// Group related notifications
"3 decisions related to 'Cloud Migration' need attention"
  ├─ Decision A: Health degraded to 45%
  ├─ Decision B: Assumption conflict detected
  └─ Decision C: Expiring in 5 days
```

---

#### 3.3 Notification Trends & Analytics

Show users:
- "You've received 47% fewer notifications this week"
- "3 decisions are creating 80% of notifications"
- "Most notifications occur during deployment windows"

---

## 📋 Implementation Checklist

### Phase 1: Stop the Bleeding (TODAY)
- [ ] Change cron schedule to `0 */6 * * *` (6 hours)
- [ ] Add environment variable `EMAIL_DIGEST_MODE=true` to disable immediate emails
- [ ] Fix duplicate detection for expiring decisions
- [ ] Add logging to track notification volume

### Phase 2: Add Control (THIS WEEK)
- [ ] Implement daily digest email batching
- [ ] Add notification throttling (3 per decision per 24h)
- [ ] Add priority levels to notifications
- [ ] Update user preferences schema

### Phase 3: Polish (NEXT SPRINT)
- [ ] Build notification preferences UI
- [ ] Add notification aggregation
- [ ] Implement smart grouping
- [ ] Add notification analytics dashboard

---

## 🔧 Quick Fixes You Can Apply Now

### Disable Scheduler Temporarily
Set in `.env`:
```bash
NOTIFICATION_CHECK_CRON=0 0 * * *  # Run once daily at midnight
```

### Disable Email Notifications
Set in `.env`:
```bash
EMAIL_NOTIFICATIONS_ENABLED=false
```

### Manual Notification Review
Run SQL to see notification volume:
```sql
-- Notifications created in last 24 hours
SELECT 
  type,
  COUNT(*) as count,
  COUNT(DISTINCT decision_id) as unique_decisions
FROM notifications
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY count DESC;

-- Users receiving most notifications
SELECT 
  u.email,
  COUNT(*) as notification_count
FROM notifications n
JOIN decisions d ON n.decision_id = d.id
JOIN users u ON u.organization_id = d.organization_id
WHERE n.created_at > NOW() - INTERVAL '24 hours'
GROUP BY u.email
ORDER BY notification_count DESC;
```

---

## 💡 Key Metrics to Track

After implementing fixes, monitor:
- **Notifications created per day** (target: <20 for typical org)
- **Emails sent per user per day** (target: <5)
- **Duplicate notification rate** (target: <5%)
- **Notification dismissal rate** (target: >70% actionable)
- **User email preference opt-out rate** (target: <20%)

---

## 🎯 Success Criteria

You'll know the spam problem is fixed when:
1. ✅ Users receive **<5 emails per day** on average
2. ✅ No duplicate notifications for same issue
3. ✅ Users can choose daily digest mode
4. ✅ Critical alerts arrive immediately, low-priority batched
5. ✅ Notification dismissal rate >70% (meaning they're actionable)

---

## 📞 Next Steps

1. **Review this analysis** with the team
2. **Choose implementation approach**:
   - Quick fix: Reduce scheduler frequency + add throttling
   - Comprehensive: Implement full digest system + preferences
3. **Set timelines** for each phase
4. **Monitor metrics** after deployment

---

*Generated: 2026-02-17*
*Analysis based on: notification-service.ts, scheduler.ts, email-notification-handler.ts*
