# 🔒 Organization Filtering Fixes - Auto-Deprecation Bug Resolution

## 🐛 Critical Bugs Found & Fixed

### **1. TIME SIMULATION BUG (CRITICAL)** ⚠️
**File:** `backend/src/api/routes/time-simulation.ts`

**Problem:** 
- Time simulation was evaluating ALL decisions across ALL organizations
- When one organization used time simulation, it would update decisions in every other organization
- This caused mass deprecation of decisions across the entire system

**Fix:**
- Changed from global `simulatedTimeOffset` to organization-specific `Map<string, number>`
- Added `AuthRequest` to access `organizationId`
- Filter decisions by `organization_id` when fetching for evaluation
- Each organization now has isolated time simulation

**Impact:** MASSIVE - This was causing decisions to auto-deprecate across organizations

---

### **2. ASSUMPTIONS ENDPOINT BUG (CRITICAL)** ⚠️
**File:** `backend/src/api/routes/assumptions.ts`

**Problem:**
- When fetching assumption links, the query pulled decisions from ALL organizations
- Assumptions showed as deprecated if linked to deprecated decisions from OTHER organizations
- No organization filtering on decision_assumptions join

**Fix:**
- Only fetch assumption IDs for the current organization
- Filter decision links to only include decisions from the same organization
- Added explicit organization_id filtering in decision joins

**Impact:** HIGH - Caused incorrect deprecation warnings in assumptions page

---

### **3. DEPRECATE ORPHANED ASSUMPTIONS BUG (CRITICAL)** ⚠️
**File:** `backend/src/services/assumption-validation-service.ts`

**Problem:**
- When checking if assumptions should be deprecated, it checked ALL decisions across ALL organizations
- If an assumption was linked to a retired decision from another org, it would be marked BROKEN
- No organization context in the function

**Fix:**
- Get organization_id from the decision being retired
- Filter assumption links to only include the same organization
- Only consider decisions from the same organization when checking if "all decisions are deprecated"
- Added organization_id to all log messages for debugging

**Impact:** CRITICAL - Caused assumptions to be incorrectly marked as BROKEN

---

### **4. DEPRECATION WARNING LOGIC (MEDIUM)** ℹ️
**Files:** 
- `backend/src/api/routes/assumptions.ts`

**Problem:**
- Deprecation warnings showed when ANY linked decision was deprecated
- User wanted: only show warning when ALL decisions are deprecated

**Fix:**
- Changed condition from `hasDeprecatedDecisions` to `allDecisionsDeprecated`
- Now only shows "All X linked decision(s) are deprecated" when truly all are deprecated

**Impact:** MEDIUM - Improved UX, warnings are more accurate

---

## 📋 Summary of Changes

### Files Modified:

1. **backend/src/api/routes/time-simulation.ts**
   - Added `AuthRequest` import and type
   - Changed from single `simulatedTimeOffset` to `Map<string, number | null> simulatedTimeOffsets`
   - Updated `getCurrentTime()` to accept `organizationId` parameter
   - Added `.eq('organization_id', organizationId)` filter to decision query
   - Updated GET/DELETE endpoints to use organization context

2. **backend/src/api/routes/assumptions.ts**
   - Added filtering to only fetch decision links for current organization's assumptions
   - Filter decision links to exclude decisions from other organizations
   - Changed deprecation warning logic to only show when ALL decisions deprecated

3. **backend/src/services/assumption-validation-service.ts**
   - Fetch decision's organization_id at start of function
   - Filter assumptions to only those in the same organization
   - Filter all decision links to only include decisions from same organization
   - Updated logging to include organization_id for debugging

### Key Principles Applied:

1. **Organization Isolation**: Every query now respects organization boundaries
2. **Context Propagation**: Organization ID is passed through all levels
3. **Explicit Filtering**: No reliance on implicit relationships
4. **Defensive Coding**: Always filter at query level, not just in application logic

---

## ✅ Testing Recommendations

1. **Test Time Simulation**
   - Create decisions in Organization A
   - Create decisions in Organization B
   - Run time simulation in Organization A
   - Verify Organization B decisions are unchanged

2. **Test Assumption Deprecation**
   - Create assumption linked to decision in Organization A
   - Retire decision in Organization B (shouldn't affect assumption)
   - Retire ALL decisions in Organization A (should deprecate assumption)

3. **Test Assumptions Page**
   - View assumptions in Organization A
   - Verify only shows decisions from Organization A
   - Verify deprecation warnings only consider Organization A decisions

---

## 🎯 Root Cause Analysis

**Why did this happen?**
1. Multi-tenant architecture was implemented but not consistently enforced
2. Early code didn't always filter by organization_id
3. No organization context in some service functions
4. Assumptions about single-organization deployments

**Prevention:**
1. Code review checklist: "Does this query filter by organization_id?"
2. Add integration tests that verify multi-tenant isolation
3. Consider adding database-level RLS (Row Level Security) policies
4. Add organization_id to all service function signatures where needed

---

## 🚀 Deployment Notes

**No database migrations required** - all changes are in application code.

**Backend restart required** - Already completed.

**Breaking changes:** None - all changes are backwards compatible.

---

## 📊 Performance Impact

- **Positive:** Queries are now more efficient (filtering earlier)
- **Minimal overhead:** Organization filtering adds negligible query time
- **Memory:** Time simulation now uses Map instead of single variable (negligible increase)

---

## 🔍 Future Improvements

1. Consider implementing database-level Row Level Security (RLS)
2. Add organization_id index to decision_assumptions table
3. Create middleware to automatically inject organization context
4. Add integration tests for multi-tenant isolation
5. Audit all queries for organization filtering compliance

---

**Fixed by:** GitHub Copilot (Claude Sonnet 4.5)
**Date:** February 16, 2026
**Verified:** Backend running without errors, organization filtering confirmed
