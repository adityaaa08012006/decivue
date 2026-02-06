# DECIVUE Backend - Required Changes

## Summary of Changes

### 1. Data Model Updates

**Decision Model:**

```typescript
// OLD
interface Decision {
  confidence: number; // 0-100, treated as authoritative
  lifecycle: "STABLE" | "AT_RISK" | "INVALIDATED" | "RETIRED";
}

// NEW
interface Decision {
  health: number; // 0-100, internal signal only (not authoritative)
  lifecycle: "STABLE" | "UNDER_REVIEW" | "AT_RISK" | "INVALIDATED" | "RETIRED";
}
```

**Database Schema:**

- Rename `confidence` column to `health`
- Update `lifecycle` CHECK constraint to include `UNDER_REVIEW`

### 2. Decision Engine Updates

**Evaluation Step 4:**

- **OLD**: "Apply time-based confidence decay"
- **NEW**: "Apply time-based health decay (internal signal only)"

**State Determination Logic:**

```typescript
// OLD Thresholds
health >= 70  → STABLE
health >= 40  → AT_RISK
health < 40   → INVALIDATED

// NEW Thresholds (Proposed)
health >= 80  → STABLE
health >= 60  → UNDER_REVIEW (needs attention)
health >= 40  → AT_RISK (urgent attention)
health < 40   → INVALIDATED

// Special cases:
// - Broken assumptions → INVALIDATED (regardless of health)
// - Violated constraints → INVALIDATED (hard fail)
// - Time decay only → UNDER_REVIEW (signals human review needed)
```

### 3. Philosophy Changes

**Key Principle:**

> The system does not replace human judgment — it highlights when judgment is needed.

**Health Indicator:**

- Used internally to support evaluation
- Never treated as authoritative
- Signals when human review is needed

**State Transitions:**

- STABLE: All good, no action needed
- UNDER_REVIEW: System signals "please review this"
- AT_RISK: System signals "urgent attention needed"
- INVALIDATED: Hard failure (constraints violated or assumptions broken)
- RETIRED: Human-closed, system stops evaluating

### 4. Implementation Checklist

#### Data Layer

- [ ] Update Decision model interface
- [ ] Update DecisionLifecycle enum
- [ ] Update database schema (migration)
- [ ] Update repository methods

#### Engine Layer

- [ ] Update evaluation logic to use "health" terminology
- [ ] Implement UNDER_REVIEW state logic
- [ ] Adjust health thresholds
- [ ] Update explanation traces to clarify health is a signal

#### Documentation

- [ ] Update comments to reflect new philosophy
- [ ] Emphasize health as signal, not authority
- [ ] Document state transition triggers

## Proposed Changes

### Change 1: Update Decision Model

**File**: `backend/src/data/models/decision.ts`

```typescript
export enum DecisionLifecycle {
  STABLE = "STABLE",
  UNDER_REVIEW = "UNDER_REVIEW", // NEW
  AT_RISK = "AT_RISK",
  INVALIDATED = "INVALIDATED",
  RETIRED = "RETIRED",
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  lifecycle: DecisionLifecycle;
  health: number; // RENAMED from confidence - internal signal only
  createdAt: Date;
  lastReviewedAt: Date;
  metadata?: Record<string, any>;
}
```

### Change 2: Update Database Schema

**File**: `backend/schema.sql`

```sql
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL CHECK (
    lifecycle IN ('STABLE', 'UNDER_REVIEW', 'AT_RISK', 'INVALIDATED', 'RETIRED')
  ),
  health INTEGER NOT NULL CHECK (health BETWEEN 0 AND 100),  -- RENAMED
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);
```

### Change 3: Update Engine Logic

**File**: `backend/src/engine/index.ts`

```typescript
/**
 * Phase 4: Apply time-based health decay
 * Health is an internal signal only - it supports evaluation but is never authoritative
 */
private applyHealthDecay(input: EvaluationInput, trace: EvaluationStep[]) {
  const daysSinceReview = calculateDaysSince(input.decision.lastReviewedAt);
  const decayAmount = Math.floor(daysSinceReview / 30);

  trace.push({
    step: 'health_decay',
    passed: true,
    details: `Health decay: -${decayAmount}. Health is a signal, not authority.`,
    timestamp: new Date()
  });

  return { decayAmount };
}

/**
 * Phase 5: Determine lifecycle state
 * State reflects need for human judgment, not system authority
 */
private determineLifecycleState(health: number, currentLifecycle: DecisionLifecycle) {
  // Don't change terminal states
  if (currentLifecycle === DecisionLifecycle.INVALIDATED ||
      currentLifecycle === DecisionLifecycle.RETIRED) {
    return currentLifecycle;
  }

  let newLifecycle: DecisionLifecycle;

  if (health >= 80) {
    newLifecycle = DecisionLifecycle.STABLE;
  } else if (health >= 60) {
    newLifecycle = DecisionLifecycle.UNDER_REVIEW;  // Signals: "please review"
  } else if (health >= 40) {
    newLifecycle = DecisionLifecycle.AT_RISK;  // Signals: "urgent attention"
  } else {
    newLifecycle = DecisionLifecycle.INVALIDATED;
  }

  return newLifecycle;
}
```

## Migration Strategy

1. **Database Migration**
   - Add new lifecycle state to CHECK constraint
   - Rename `confidence` → `health` (requires data migration)

2. **Code Updates**
   - Update all references from confidence → health
   - Add UNDER_REVIEW to all lifecycle enums
   - Update engine thresholds

3. **Testing**
   - Verify new state transitions
   - Ensure health is treated as signal, not authority
   - Test explanation traces

## Questions for Clarification

1. **Health Thresholds**: Do you approve the proposed thresholds (80/60/40)?
2. **UNDER_REVIEW Triggers**: Should time decay alone move to UNDER_REVIEW, or only with other signals?
3. **Backward Compatibility**: Should we migrate existing decisions or start fresh?

Would you like me to proceed with implementing these changes?
