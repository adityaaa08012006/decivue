# 🔍 DECIVUE - Complete Logic Flaws & Issues Analysis

## Executive Summary

This document contains a comprehensive analysis of all logic flaws, bugs, and design issues found in the DECIVUE decision monitoring system. The analysis covers database schemas, business logic, evaluation engine behavior, and auto-depreciation mechanisms.

**Date**: February 16, 2026  
**Scope**: Full codebase audit

---

## 🚨 CRITICAL BUGS

### 1. **DecisionLifecycle.ACTIVE Does Not Exist** ⛔

**Severity**: CRITICAL  
**File**: `backend/src/engine/index.ts` (Lines 35-38)  
**Status**: 🔴 Active Bug

#### Problem

The evaluation engine tries to reset INVALIDATED decisions to `DecisionLifecycle.ACTIVE` to give them a fresh start for recovery:

```typescript
let lifecycle = input.decision.lifecycle === DecisionLifecycle.INVALIDATED 
  ? DecisionLifecycle.ACTIVE  // ❌ ACTIVE doesn't exist!
  : input.decision.lifecycle;
```

However, the `DecisionLifecycle` enum **does NOT have an ACTIVE state**:

```typescript
// backend/src/data/models/decision.ts
export enum DecisionLifecycle {
  STABLE = 'STABLE',
  UNDER_REVIEW = 'UNDER_REVIEW',
  AT_RISK = 'AT_RISK',
  INVALIDATED = 'INVALIDATED',
  RETIRED = 'RETIRED'
  // ❌ NO ACTIVE!
}
```

The database constraint also does not allow ACTIVE:

```sql
lifecycle TEXT NOT NULL CHECK (lifecycle IN (
  'STABLE', 'UNDER_REVIEW', 'AT_RISK', 'INVALIDATED', 'RETIRED'
))
```

#### Impact

1. When an INVALIDATED decision is evaluated, `lifecycle` gets set to `undefined`
2. The evaluation continues with undefined lifecycle, leading to unpredictable behavior
3. If the engine tries to persist this to the database, it will either:
   - Fail silently (undefined becomes null in JSON)
   - Throw a database constraint violation error
   - Cause downstream bugs in lifecycle determination

#### Root Cause

The code was likely written with the intent to have a neutral "ACTIVE" state that decisions could be reset to during evaluation, but:
1. The enum was never updated to include ACTIVE
2. The database schema was never updated to allow ACTIVE
3. No unit tests caught this mismatch

#### Solution

**Option A: Add ACTIVE to the enum** (Recommended)
- Add `ACTIVE = 'ACTIVE'` to `DecisionLifecycle` enum
- Update database schema to allow 'ACTIVE' in the CHECK constraint
- Use ACTIVE as the default state for new decisions
- ACTIVE means "all good, no issues detected"

**Option B: Use STABLE instead of ACTIVE**
- Change line 37 to: `? DecisionLifecycle.STABLE`
- STABLE means "healthy and reviewed"
- Simpler, no schema changes needed

**Option C: Remove the reset logic**
- Keep the current lifecycle when evaluating INVALIDATED decisions
- Let the evaluation flow determine the new state naturally
- Might prevent recovery in some edge cases

---

## ⚠️ AUTO-DEPRECIATION LOGIC ISSUES

### 2. **Decisions Auto-Retire After Expiry** 

**Severity**: HIGH (By Design, but potentially unexpected)  
**File**: `backend/src/engine/index.ts` (Lines 73-89)  
**Status**: 🟡 Working as Intended (but confusing)

#### Behavior

When a decision is evaluated and is **more than 30 days past its expiry date**, it automatically transitions to RETIRED:

```typescript
if (lifecycle !== DecisionLifecycle.INVALIDATED && 
    lifecycle !== DecisionLifecycle.RETIRED && 
    input.decision.expiryDate) {
  const daysUntilExpiry = 
    (input.decision.expiryDate.getTime() - input.currentTimestamp.getTime()) /
    (1000 * 60 * 60 * 24);
  
  if (daysUntilExpiry < -30) {
    // More than 30 days past expiry - automatically retire
    lifecycle = DecisionLifecycle.RETIRED;
    invalidatedReason = 'expired';
  }
}
```

#### Why This Happens

This is **intentional design** to automatically sunset old decisions that are well past their expiry date. The 30-day grace period allows for:
- Administrative lag
- Time to review and extend if needed
- Gradual sunset rather than hard cutoff

#### When Evaluations Are Triggered

Evaluations (and thus auto-retirement) are triggered by:

1. **Manual evaluation** - User clicks "Evaluate" button
2. **Assumption status changes** - When an assumption is marked BROKEN, SHAKY, or VALID
3. **Constraint violations** - When constraints are added or modified
4. **Time simulation** - When organization uses time-travel feature
5. **Frontend auto-evaluation** - On page load, all decisions are evaluated:

```javascript
// frontend/src/components/DecisionMonitoring.jsx
const autoEvaluateDecisions = async (decisionsList) => {
  for (const decision of decisionsList) {
    await api.evaluateDecision(decision.id);
  }
};
```

#### The Problem

Users report that "decisions get auto-depreciated after evaluation is run" because:

1. **Frequent evaluations**: Every page load triggers evaluation of ALL decisions
2. **Expiry enforcement**: Any decision >30 days past expiry gets RETIRED
3. **No warning**: Users aren't warned before auto-retirement happens
4. **Irreversible**: RETIRED is a terminal state (can't be undone)

#### Impact

- Decisions can unexpectedly disappear from active monitoring
- No notification is sent when auto-retirement happens
- Users may lose track of why a decision was retired
- Creates confusion about system behavior

#### Recommendations

**Option 1: Add a warning period** (Recommended)
- At 15-25 days past expiry: Change to UNDER_REVIEW with warning
- At 26-30 days past expiry: Change to AT_RISK with urgent warning
- At 30+ days past expiry: Auto-retire

**Option 2: Require manual retirement**
- Never auto-retire decisions
- Instead, move to AT_RISK and create a notification
- Require explicit user action to retire

**Option 3: Make it configurable**
- Add organization setting for auto-retirement behavior
- Allow orgs to disable or customize the grace period

**Option 4: Reduce evaluation frequency**
- Don't auto-evaluate on every page load
- Only evaluate when something changes (assumption, constraint, etc.)
- Add a "last_evaluated_at" timestamp to avoid redundant evaluations

---

### 3. **Orphaned Assumptions Auto-Deprecated**

**Severity**: MEDIUM  
**File**: `backend/src/services/assumption-validation-service.ts` (Lines 266-440)  
**Status**: 🟢 Fixed (organization filtering added)

#### Behavior

When a decision is RETIRED, the system checks if any linked DECISION_SPECIFIC assumptions are now "orphaned" (not linked to any active decisions). If all linked decisions in the same organization are RETIRED, the assumption is marked as BROKEN:

```typescript
static async deprecateOrphanedAssumptions(decisionId: string): Promise<void> {
  // Get DECISION_SPECIFIC assumptions linked to this decision
  // Check if ALL linked decisions (in same org) are RETIRED
  if (allDeprecated) {
    // Mark assumption as BROKEN
    await db.from('assumptions').update({ status: 'BROKEN' })
  }
}
```

#### Why This Happens

This is **intentional design** to maintain data hygiene:
- DECISION_SPECIFIC assumptions only make sense if there are active decisions using them
- If all decisions using an assumption are retired, the assumption is no longer relevant
- Marking it BROKEN signals that it's deprecated and shouldn't be reused

#### Recent Fixes Applied

The `ORGANIZATION_FILTERING_FIXES.md` document shows this was recently fixed to:
1. Only consider decisions from the **same organization**
2. Ignore decisions from other organizations
3. Only deprecate if **all same-org decisions** are retired

#### Remaining Issues

1. **INVALIDATED vs RETIRED distinction**:
   - Code treats INVALIDATED as "can recover" (doesn't trigger deprecation)
   - Only RETIRED (permanent) triggers assumption deprecation
   - This is correct by design

2. **No undo mechanism**:
   - Once an assumption is marked BROKEN due to deprecation, there's no way to "revive" it
   - If a new decision needs the assumption, user must:
     a. Manually change status back to VALID
     b. Link it to the new decision
   - This could be automated

3. **Silent deprecation**:
   - A notification is created, but it's not very prominent
   - Users might miss that assumptions were auto-deprecated

#### Recommendations

**Option 1: Auto-revive on new link** (Recommended)
- When a BROKEN (deprecated) assumption is linked to an active decision, automatically change its status to SHAKY or VALID
- Add validation warning: "This assumption was deprecated. Review its validity."

**Option 2: Soft delete instead of BROKEN**
- Add an `is_deprecated` boolean flag separate from `status`
- Keep status as VALID/SHAKY/BROKEN for actual validity
- Use `is_deprecated` flag to hide from UI by default

**Option 3: Make it optional**
- Add organization setting to enable/disable auto-deprecation
- Some orgs may want to keep assumptions around for historical record

---

## 🔧 DESIGN ISSUES

### 4. **Health Signal Reset on Every Evaluation**

**Severity**: MEDIUM  
**File**: `backend/src/engine/index.ts` (Line 39)  
**Status**: 🟡 By Design (questionable)

#### Behavior

Every evaluation starts by resetting health to 100 and recalculating from scratch:

```typescript
evaluate(input: EvaluationInput): EvaluationOutput {
  let healthSignal = 100; // Start fresh at 100 and recalculate
  // ... then apply all penalties
}
```

#### Implications

1. **No accumulation**: Health doesn't accumulate or degrade over time organically
2. **Always recalculated**: Every evaluation is a fresh start
3. **Time decay applied**: Then time decay is applied as a "penalty"

#### Question

Is this the intended behavior? Or should health:
- Carry forward from previous evaluation?
- Accumulate decay over multiple evaluations?
- Have different recovery mechanisms?

The comment says "Start fresh at 100 and recalculate" which suggests this is intentional, but it might not match user expectations of a "health signal" that degrades over time.

---

### 5. **Evaluation Triggered on Every Page Load**

**Severity**: LOW (Performance & Cost)  
**File**: `frontend/src/components/DecisionMonitoring.jsx` (Lines 97-115)  
**Status**: 🟡 By Design

#### Behavior

When the Decision Monitoring page loads, it evaluates ALL decisions:

```javascript
const fetchDecisions = async () => {
  const data = await api.getDecisions();
  setDecisions(data);
  
  // Auto-evaluate all decisions that need it
  autoEvaluateDecisions(data);
};

const autoEvaluateDecisions = async (decisionsList) => {
  for (const decision of decisionsList) {
    await api.evaluateDecision(decision.id);
  }
  // Refresh decisions after evaluation
  const updatedData = await api.getDecisions();
  setDecisions(updatedData);
};
```

#### Implications

1. **O(N) API calls**: One evaluation API call per decision on every page load
2. **Double data fetch**: Fetches decisions before and after evaluation
3. **Unnecessary evaluations**: Re-evaluates even if nothing changed
4. **Triggers auto-retirement**: Can cause decisions to auto-retire just from viewing the page
5. **Poor UX**: Loading takes longer with many decisions

#### Recommendations

**Option 1: Lazy evaluation** (Recommended)
- Only evaluate when expanding a decision's details
- Or add an "Evaluate All" button for explicit action

**Option 2: Smart evaluation**
- Track `last_evaluated_at` timestamp on each decision
- Only re-evaluate if:
  - More than X hours since last evaluation
  - Linked assumptions changed
  - Constraints changed
  - Dependencies changed

**Option 3: Background evaluation**
- Server-side scheduled job evaluates all decisions periodically
- Frontend just displays current state
- Add manual "Re-evaluate" button for on-demand updates

**Option 4: Event-driven evaluation**
- Only evaluate when something changes (assumption status, constraint, etc.)
- Use event system already in place (EventBus)

---

### 6. **Lifecycle State Terminal Behavior**

**Severity**: LOW  
**File**: `backend/src/engine/index.ts` (Lines 351-365)  
**Status**: 🟢 By Design

#### Behavior

INVALIDATED and RETIRED are "terminal states" that cannot be automatically changed:

```typescript
private determineLifecycleState(
  healthSignal: number,
  currentLifecycle: DecisionLifecycle,
  trace: EvaluationStep[]
): DecisionLifecycle {
  // Don't change terminal states
  if (
    currentLifecycle === DecisionLifecycle.INVALIDATED ||
    currentLifecycle === DecisionLifecycle.RETIRED
  ) {
    return currentLifecycle; // ❌ Can never escape!
  }
  // ... calculate new lifecycle based on health
}
```

#### The Paradox

1. Line 36-38 tries to reset INVALIDATED to ACTIVE (bug)
2. Line 351-362 says terminal states can't change
3. These two behaviors conflict!

**Which is the intended behavior?**

- Should INVALIDATED decisions be able to recover automatically?
- Or should they require manual intervention (mark reviewed)?

#### Current Workaround

The "Mark Reviewed" endpoint explicitly resets lifecycle:

```typescript
// backend/src/api/controllers/decision-controller.ts
async markReviewed(req: AuthRequest, res: Response) {
  // Update last_reviewed_at and re-evaluate
  // This allows INVALIDATED decisions to recover
}
```

#### Recommendation

**Clarify the intent:**

**Option A: Terminal means terminal**
- Remove the reset logic in line 36-38
- INVALIDATED decisions can only recover via "Mark Reviewed"
- Makes system behavior predictable

**Option B: Allow automatic recovery**
- Fix the ACTIVE bug (use STABLE instead)
- Allow INVALIDATED decisions to auto-recover if issues are fixed
- More forgiving, less manual intervention

**Option C: Hybrid approach**
- INVALIDATED can auto-recover based on evaluation
- RETIRED is truly terminal (requires admin action to un-retire)
- Clear distinction between temporary and permanent states

---

## 📊 DATABASE SCHEMA ISSUES

### 7. **Missing Columns and Indexes**

**Severity**: LOW  
**Status**: 🟡 Enhancement Opportunity

#### Missing Useful Columns

**decisions table:**
- `last_evaluated_at` - Track when each decision was last evaluated (avoid redundant evals)
- `auto_retired_at` - Track when/if decision was auto-retired (for auditing)
- `expiry_warning_sent` - Track if user was warned about approaching expiry

**assumptions table:**
- `deprecated_at` - Track when assumption was auto-deprecated
- `deprecated_reason` - Why was it deprecated? (all_decisions_retired, manual, etc.)

**evaluation_history table:**
- `evaluation_trigger` - What triggered this evaluation? (page_load, assumption_change, manual, time_simulation, etc.)

#### Missing Indexes

These queries could benefit from indexes:

```sql
-- Decision Repository: findAll with organization filter
CREATE INDEX idx_decisions_organization ON decisions(organization_id, created_at DESC);

-- Assumption links filtered by organization
CREATE INDEX idx_decision_assumptions_org ON decision_assumptions(decision_id, assumption_id);

-- Find all DECISION_SPECIFIC assumptions
CREATE INDEX idx_assumptions_scope_org ON assumptions(scope, organization_id);

-- Find decisions by expiry date (for warning system)
CREATE INDEX idx_decisions_expiry ON decisions(expiry_date) 
  WHERE expiry_date IS NOT NULL AND lifecycle NOT IN ('RETIRED', 'INVALIDATED');
```

---

## 🔄 EVALUATION ENGINE FLOW ANALYSIS

### Evaluation Steps (Correct Order)

1. **Reset lifecycle** (if INVALIDATED) - ❌ BUG HERE
2. **Validate constraints** - Hard fail → INVALIDATED
3. **Evaluate dependencies** - Propagate risk (health penalty)
4. **Check assumptions** - Hard fail if universal broken or 70%+ specific broken
5. **Check expiry** - Auto-retire if >30 days past expiry
6. **Apply health decay** - Time-based penalty
7. **Determine lifecycle** - Based on final health signal
   - health ≥ 80 → STABLE
   - 60 ≤ health < 80 → UNDER_REVIEW
   - 40 ≤ health < 60 → AT_RISK
   - health < 40 → AT_RISK (never auto-invalidate from health alone)

### Health Calculation Logic

```typescript
Starting health: 100

Constraints violated?
  YES → health = 0, lifecycle = INVALIDATED, STOP
  NO → continue

Dependencies:
  health = min(health, lowestDependencyHealth)

Universal assumptions:
  ANY broken? → health = 0, lifecycle = INVALIDATED, STOP

Decision-specific assumptions:
  % broken < 70%? → health -= (% * 60)  // Max 60 point penalty
  % broken ≥ 70%? → health = 0, lifecycle = INVALIDATED, STOP

Expiry:
  > 30 days past? → lifecycle = RETIRED, STOP

Time decay:
  If expiry set:
    decay = f(daysUntilExpiry)  // Accelerates as expiry approaches
  Else:
    decay = daysSinceReview / 30  // 1 point per 30 days

Final health = health - decay
```

### Key Insights

1. **Multiple paths to INVALIDATED**:
   - Constraint violation (hard fail)
   - Universal assumption broken (hard fail)
   - ≥70% decision-specific assumptions broken (hard fail)

2. **RETIRED only from expiry**:
   - Only auto-retirement path is >30 days past expiry
   - No other automatic way to retire

3. **Health is never authoritative**:
   - Low health (even 0) doesn't cause INVALIDATED
   - Only actual constraint/assumption failures do
   - Health is just a "signal" for human attention

4. **Lifecycle transitions**:
   ```
   STABLE ←→ UNDER_REVIEW ←→ AT_RISK → INVALIDATED (one-way unless reviewed)
                                    ↓
                                 RETIRED (terminal)
   ```

---

## 🎯 RECOMMENDATIONS SUMMARY

### Immediate Fixes (Critical)

1. ✅ **Fix DecisionLifecycle.ACTIVE bug**
   - Change line 37 to use `DecisionLifecycle.STABLE`
   - Or add ACTIVE to enum and database schema

### High Priority Improvements

2. ✅ **Reduce evaluation frequency**
   - Don't auto-evaluate on every page load
   - Add `last_evaluated_at` tracking
   - Only evaluate when needed

3. ✅ **Add expiry warnings**
   - Warn users 15 days before auto-retirement
   - Create notifications for approaching expiry
   - Give time to extend or review

4. ✅ **Clarify terminal state behavior**
   - Document when INVALIDATED can/cannot recover
   - Make recovery path clear (manual review vs auto)

### Medium Priority Enhancements

5. ✅ **Add undo for auto-deprecation**
   - Auto-revive assumptions when linked to new decisions
   - Add "Restore" button for deprecated assumptions

6. ✅ **Improve notifications**
   - Make auto-retirement notifications more prominent
   - Add email notifications for critical events
   - Show warning before auto-retirement happens

7. ✅ **Add database indexes**
   - Organization + created_at
   - Scope + organization
   - Expiry date (non-retired only)

### Long-term Considerations

8. ✅ **Make auto-behaviors configurable**
   - Organization settings for auto-retirement
   - Toggle for auto-deprecation of assumptions
   - Customize grace periods

9. ✅ **Add evaluation trigger tracking**
   - Record what triggered each evaluation
   - Help debug unexpected auto-retirements
   - Audit trail for compliance

10. ✅ **Performance optimization**
    - Batch evaluation API endpoint
    - Background job for periodic evaluations
    - Cache evaluation results

---

## 📝 Testing Gaps

### Critical Test Cases Missing

1. **Evaluation with INVALIDATED decision**
   - What happens when evaluating a decision that's already INVALIDATED?
   - Does it recover? Stay invalidated? Throw error?

2. **Auto-retirement edge cases**
   - Decision exactly 30 days past expiry
   - Decision with no expiry date
   - Decision evaluated multiple times past expiry

3. **Orphaned assumption scenarios**
   - Assumption linked to decisions in multiple organizations
   - Assumption manually changed to BROKEN vs auto-deprecated
   - Linking deprecated assumption to new decision

4. **Concurrent evaluation**
   - Multiple users evaluating same decision simultaneously
   - Race conditions in assumption deprecation
   - Database transaction handling

---

## 🔍 Code Quality Observations

### Good Practices Found

✅ Comprehensive logging throughout evaluation engine  
✅ Event system for tracking state changes  
✅ Audit trail via `evaluation_history` table  
✅ Row-level security (RLS) for multi-tenancy  
✅ Immutable constraints concept  
✅ Clear separation between health (signal) and lifecycle (state)  

### Areas for Improvement

⚠️ Inconsistent error handling between controller and repository  
⚠️ Magic numbers (30 days, 70%, 60 points) should be constants  
⚠️ Evaluation logic split between engine and controller  
⚠️ Frontend auto-evaluation not configurable  
⚠️ Missing TypeScript strict mode checks  
⚠️ Limited input validation on API endpoints  

---

## 🏁 Conclusion

The DECIVUE system has a solid architectural foundation with clear separation of concerns (engine, repository, controller). However, there are several critical bugs and design issues that cause unexpected behavior, particularly around:

1. **Auto-depreciation** - Works as designed, but users find it surprising
2. **Lifecycle management** - ACTIVE enum bug causes evaluation failures
3. **Evaluation frequency** - Too many unnecessary evaluations
4. **Recovery paths** - Unclear how INVALIDATED decisions recover

The primary complaint about "decisions getting auto-depreciated after evaluation" is caused by:
- The ACTIVE enum bug potentially causing issues
- Auto-retirement of expired decisions (30+ days past expiry)
- Frontend triggering evaluation on every page load
- Lack of warnings before auto-retirement

**Recommended priority order:**
1. Fix the ACTIVE enum bug (CRITICAL)
2. Reduce frontend evaluation frequency (HIGH)
3. Add expiry warnings (HIGH)
4. Clarify recovery behavior (MEDIUM)
5. Add configuration options (MEDIUM)

---

**Generated by**: GitHub Copilot Analysis  
**Date**: February 16, 2026  
**Files Analyzed**: 30+ TypeScript/SQL files across backend, frontend, and migrations
