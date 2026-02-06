# DECIVUE Backend Refactoring Guide

**Date:** 2026-02-07
**Status:** IN PROGRESS (Schema & Models Complete, Repositories & Tests Pending)

---

## 🎯 Overview

This document tracks the major refactoring of DECIVUE's backend to align with improved design principles focused on:

- **Explainability**: Full transparency in all decision transitions
- **Reusability**: Global assumptions shared across decisions
- **Human Authority**: System highlights, humans decide
- **No Hidden Logic**: All state changes explicit, no auto-triggers

---

## ✅ Changes Completed

### 1. Database Schema (COMPLETE)

**File:** `backend/schema.sql`

#### Assumptions Made Global & Reusable

```sql
-- BEFORE: Tied to single decision
CREATE TABLE assumptions (
  decision_id UUID REFERENCES decisions(id),  -- ❌ One assumption per decision
  status TEXT CHECK (status IN ('VALID', 'BROKEN', 'UNKNOWN'))
);

-- AFTER: Global and reusable
CREATE TABLE assumptions (
  description TEXT NOT NULL UNIQUE,  -- ✅ Global, shared assumptions
  status TEXT CHECK (status IN ('HOLDING', 'SHAKY', 'BROKEN'))
);

CREATE TABLE decision_assumptions (  -- ✅ Many-to-many junction table
  decision_id UUID REFERENCES decisions(id),
  assumption_id UUID REFERENCES assumptions(id),
  PRIMARY KEY (decision_id, assumption_id)
);
```

#### Assumption Status → Drift Model

- **BEFORE**: VALID | BROKEN | UNKNOWN (truth-based)
- **AFTER**: HOLDING | SHAKY | BROKEN (drift-based)
  - **HOLDING**: Stable, assumption still holds
  - **SHAKY**: Deter iorating, needs attention
  - **BROKEN**: No longer valid, invalidates decisions

#### Auto-Update Triggers Removed

```sql
-- BEFORE: Automatic last_reviewed_at updates
CREATE TRIGGER trigger_update_last_reviewed_at...
-- Automatically updated last_reviewed_at whenhealth or lifecycle changed

-- AFTER: NO TRIGGERS
-- last_reviewed_at updated ONLY by explicit human review action
```

#### Decision Tensions Table Added

```sql
CREATE TABLE decision_tensions (
  decision_a_id UUID,
  decision_b_id UUID,
  reason TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')),
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,  -- NULL = unresolved
  resolution_notes TEXT
);
```

**Philosophy**: Conflicts are SURFACED, not auto-resolved. Humans make trade-offs.

#### Constraints Simplified

```sql
-- BEFORE: rule_expression required
CREATE TABLE constraints (
  rule_expression TEXT NOT NULL
);

-- AFTER: constraint_type added, rule_expression optional
CREATE TABLE constraints (
  constraint_type TEXT CHECK (constraint_type IN ('LEGAL', 'BUDGET', 'POLICY', 'TECHNICAL', 'COMPLIANCE', 'OTHER')),
  rule_expression TEXT  -- Optional, logic lives in engine
);
```

#### Decision Fields Updated

```sql
-- BEFORE
CREATE TABLE decisions (
  health INTEGER,
  -- No invalidated_reason field
);

-- AFTER
CREATE TABLE decisions (
  health_signal INTEGER,  -- Renamed to emphasize internal-only
  invalidated_reason TEXT  -- Why was this invalidated?
);
```

---

### 2. TypeScript Models (COMPLETE)

#### Assumption Model (`backend/src/data/models/assumption.ts`)

```typescript
// BEFORE
export enum AssumptionStatus {
  VALID = "VALID",
  BROKEN = "BROKEN",
  UNKNOWN = "UNKNOWN",
}

export interface Assumption {
  decisionId: string; // ❌ Tied to single decision
  // ...
}

// AFTER
export enum AssumptionStatus {
  HOLDING = "HOLDING", // Stable
  SHAKY = "SHAKY", // Deteriorating
  BROKEN = "BROKEN", // Invalidated
}

export interface Assumption {
  description: string; // ✅ Global, no decisionId
  // ...
}
```

#### Constraint Model (`backend/src/data/models/constraint.ts`)

```typescript
// ADDED: Constraint types
export enum ConstraintType {
  LEGAL = "LEGAL",
  BUDGET = "BUDGET",
  POLICY = "POLICY",
  TECHNICAL = "TECHNICAL",
  COMPLIANCE = "COMPLIANCE",
  OTHER = "OTHER",
}

export interface Constraint {
  constraintType: ConstraintType; // ✅ Category added
  ruleExpression?: string; // ✅ Now optional
}
```

#### Decision Model (`backend/src/data/models/decision.ts`)

```typescript
// BEFORE
export interface Decision {
  health: number;
}

// AFTER
export interface Decision {
  healthSignal: number; // ✅ Renamed
  invalidatedReason?: string; // ✅ Added
}
```

#### Decision Tension Model (NEW)

**File:** `backend/src/data/models/decision-tension.ts`

```typescript
export enum TensionSeverity {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export interface DecisionTension {
  decisionAId: string;
  decisionBId: string;
  reason: string;
  severity: TensionSeverity;
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
}
```

---

### 3. Engine Types & Logic (COMPLETE)

#### Engine Types (`backend/src/engine/types.ts`)

```typescript
// BEFORE
export interface EvaluationOutput {
  newHealth: number;
  // No invalidatedReason
}

// AFTER
export interface EvaluationOutput {
  newHealthSignal: number; // ✅ Renamed
  invalidatedReason?: string; // ✅ Added
}
```

#### Engine Implementation (`backend/src/engine/index.ts`)

**All references updated:**

- `health` → `healthSignal`
- `adjustedHealth` → `adjustedHealthSignal`
- Returns `invalidatedReason` in output
- Updated trace messages to use "health signal" terminology
- Assumption check now says "holding" instead of "valid"

---

## 🔄 Changes In Progress

### 4. Repositories (IN PROGRESS)

**File to update:** `backend/src/data/repositories/decision-repository.ts`

**Required changes:**

1. Replace all `health` with `healthSignal` in database operations
2. Add `invalidated_reason` to INSERT/UPDATE operations
3. Update `mapToDecision()` method to use `healthSignal`
4. Update `updateEvaluation()` signature to accept `invalidatedReason`

**Example:**

```typescript
// BEFORE
async create(data: DecisionCreate): Promise<Decision> {
  const { data: decision } = await this.db
    .from('decisions')
    .insert({ health: 100 })
    .select()
    .single();
  return this.mapToDecision(decision);
}

// AFTER
async create(data: DecisionCreate): Promise<Decision> {
  const { data: decision } = await this.db
    .from('decisions')
    .insert({ health_signal: 100, invalidated_reason: null })
    .select()
    .single();
  return this.mapToDecision(decision);
}

private mapToDecision(row: any): Decision {
  return {
    healthSignal: row.health_signal,  // ✅ Updated
    invalidatedReason: row.invalidated_reason,  // ✅ Added
    // ...
  };
}
```

---

### 5. Tests (PENDING)

**File to update:** `backend/tests/unit/engine/deterministic-engine.test.ts`

**Required changes:**

1. Update all test data to use `healthSignal` instead of `health`
2. Update assumption status: `status: AssumptionStatus.VALID` → `status: AssumptionStatus.HOLDING`
3. Update expected outputs to include `invalidatedReason`
4. Update assertions: `result.newHealth` → `result.newHealthSignal`

**Example:**

```typescript
// BEFORE
const input: EvaluationInput = {
  decision: createTestDecision({
    health: 95,
    lifecycle: DecisionLifecycle.STABLE,
  }),
  assumptions: [createTestAssumption({ status: AssumptionStatus.VALID })],
  // ...
};

expect(result.newHealth).toBe(95);

// AFTER
const input: EvaluationInput = {
  decision: createTestDecision({
    healthSignal: 95,
    lifecycle: DecisionLifecycle.STABLE,
  }),
  assumptions: [createTestAssumption({ status: AssumptionStatus.HOLDING })],
  // ...
};

expect(result.newHealthSignal).toBe(95);
expect(result.invalidatedReason).toBeUndefined(); // ✅ New assertion
```

---

## 📋 Next Steps

### Immediate (Before Schema Application)

1. **Update Decision Repository** ✅ (see section 4 above)
   - File: `backend/src/data/repositories/decision-repository.ts`
   - Estimated time: 15-20 minutes

2. **Update Tests**
   - File: `backend/tests/unit/engine/deterministic-engine.test.ts`
   - Estimated time: 20-30 minutes
   - **MUST RUN AND PASS before applying schema**

3. **Drop Old Schema from Supabase**

   ```sql
   DROP TABLE IF EXISTS evaluation_history CASCADE;
   DROP TABLE IF EXISTS decision_constraints CASCADE;
   DROP TABLE IF EXISTS dependencies CASCADE;
   DROP TABLE IF EXISTS constraints CASCADE;
   DROP TABLE IF EXISTS assumptions CASCADE;
   DROP TABLE IF EXISTS decisions CASCADE;
   DROP TABLE IF EXISTS decision_assumptions CASCADE;
   DROP TABLE IF EXISTS decision_tensions CASCADE;
   ```

4. **Apply New Schema**
   - Run `backend/schema.sql` in Supabase SQL Editor
   - Verify all 8 tables created
   - Verify sample data inserted

5. **Test Backend**
   ```bash
   cd backend
   npm test  # All tests must pass
   npm run dev  # Start server
   curl http://localhost:3001/api/decisions  # Verify API works
   ```

### Future Work

6. **Create Assumption Repository**
   - New file: `backend/src/data/repositories/assumption-repository.ts`
   - CRUD for global assumptions
   - Link/unlink assumptions to decisions

7. **Create Decision Tension Repository**
   - New file: `backend/src/data/repositories/decision-tension-repository.ts`
   - Track and resolve conflicts

8. **Add Assumption Change Propagation**
   - When an assumption status changes → re-evaluate ALL linked decisions
   - Event-driven: `AssumptionStatusChanged` event → trigger mass re-evaluation

9. **Update API Controllers**
   - Update decision controller to use `healthSignal`
   - Add assumption CRUD endpoints
   - Add tension endpoints

10. **Update Frontend**
    - Remove any health display (it's internal only)
    - Add tension visualization
    - Show assumption drift (HOLDING/SHAKY/BROKEN)

---

## 🔍 Key Philosophy Changes

### Before

- Assumptions belonged to decisions (1:1)
- `health` seemed like a score
- Auto-triggers updated state silently
- Constraints had mandatory rule expressions
- No conflict modeling

### After

- **Assumptions are global** (many:many via junction table)
- **healthSignal** emphasizes internal-only, not authoritative
- **No auto-triggers** - all state changes explicit
- **Constraints simplified** - logic in engine, not SQL
- **Tensions surfaced** - conflicts highlighted for human resolution
- **Drift model** - HOLDING/SHAKY/BROKEN represents drift from original state
- **Full explainability** - invalidatedReason always captured

---

## ⚠️ Breaking Changes

### Database

- **Table changes**: `assumptions` structure completely different
- **New tables**: `decision_assumptions`, `decision_tensions`
- **Column renames**: `health` → `health_signal`
- **Triggers removed**: `trigger_update_last_reviewed_at` deleted
- **Enum changes**: Assumption status values changed

### API

- Response fields: `health` → `healthSignal`
- New field: `invalidatedReason` in decision responses
- Assumption endpoints will change (no longer tied to decision ID)

### Frontend

- **MUST update** all references to `health`
- **MUST NOT display** `healthSignal` (internal only)
- **SHOULD display** assumption drift status
- **SHOULD display** decision tensions

---

## 📚 Files Modified

### Completed ✅

- `backend/schema.sql` - Complete rewrite
- `backend/src/data/models/assumption.ts` - Updated status enum, removed decisionId
- `backend/src/data/models/constraint.ts` - Added constraint_type
- `backend/src/data/models/decision.ts` - Renamed health→healthSignal, added invalidatedReason
- `backend/src/data/models/decision-tension.ts` - NEW FILE
- `backend/src/data/models/index.ts` - Export decision-tension
- `backend/src/engine/types.ts` - Updated EvaluationOutput
- `backend/src/engine/index.ts` - All health→healthSignal, added invalidatedReason

### Pending ⏳

- `backend/src/data/repositories/decision-repository.ts` - Update for healthSignal
- `backend/tests/unit/engine/deterministic-engine.test.ts` - Update test data & assertions

### Future 🔮

- `backend/src/data/repositories/assumption-repository.ts` - NEW
- `backend/src/data/repositories/decision-tension-repository.ts` - NEW
- `backend/src/api/controllers/decision-controller.ts` - Update for healthSignal
- `backend/src/events/handlers/*` - Add assumption change propagation
- `frontend/*` - Update all health references

---

## 🧪 Testing Strategy

### Unit Tests

1. **Engine tests** - Verify healthSignal calculations
2. **Repository tests** - Verify database mappings
3. **Assumption tests** - Verify global assumption reuse

### Integration Tests

1. **Assumption propagation** - Change assumption → re-evaluate all linked decisions
2. **Tension detection** - Create conflicting decisions → tension created
3. **No auto-triggers** - Update healthSignal → last_reviewed_at unchanged

### Manual Testing

1. Create global assumption
2. Link assumption to multiple decisions
3. Change assumption status to BROKEN
4. Verify all linked decisions invalidated
5. Verify `invalidatedReason` = 'broken_assumptions'

---

## 💡 Migration Notes

**For existing data:**
This is a BREAKING schema change. Cannot migrate data automatically due to:

- Assumptions now global (can't 1:1 map from old decision-bound assumptions)
- Status enum values changed
- healthSignal vs health column rename

**Recommended approach:**

1. Export critical decisions as JSON
2. Drop old schema
3. Apply new schema
4. Manually recreate decisions with new global assumptions

---

**Next: Update decision repository, then run tests!** 🚀
