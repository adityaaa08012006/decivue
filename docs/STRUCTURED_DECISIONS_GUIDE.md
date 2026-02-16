# Structured Decision Creation - Implementation Guide

## Overview

**Completed:** Structured decision creation with dropdown-based category and parameter selection - similar to the existing assumption form.

## What Changed

### 1. Database Schema (Migration 014)

- Added `category` column to decisions table
- Added `parameters` JSONB column to decisions table
- Added index on category for faster filtering
- Backfilled existing metadata into new columns

### 2. Frontend Components

#### **New Component: `StructuredDecisionForm.jsx`**

Location: `frontend/src/components/StructuredDecisionForm.jsx`

Provides dropdown-based decision creation with 10 predefined categories:

- Strategic Initiative
- Budget & Financial
- Resource Allocation
- Technical Architecture
- Timeline & Milestones
- Operational Process
- Product Direction
- Market & Competitive
- Risk & Compliance
- Organizational Change

**Category-Specific Parameters:**

**Strategic Initiative:**

- Strategic Goal (Revenue Growth, Market Expansion, Cost Reduction, etc.)
- Expected Impact (Transformational, Significant, Moderate, Incremental)
- Target Timeframe

**Budget & Financial:**

- Budget Type (CAPEX, OPEX, Investment, Cost Reduction)
- Amount (USD)
- Budget Allocation (Fixed, Range, Not to Exceed, Minimum Required)
- Timeframe

**Resource Allocation:**

- Resource Type (Engineering, Product, Design, Marketing, etc.)
- Headcount Required
- Allocation Type (Full-time, Part-time, Contract, Temporary)
- Duration

**Technical Architecture:**

- Architecture Domain (Frontend, Backend, Database, Infrastructure, etc.)
- Technology/Tool
- Change Scope (New Implementation, Migration, Upgrade, Replacement, Decommission)

**Timeline & Milestones:**

- Timeline Type (Fixed Deadline, Target Date, Flexible Timeline, Milestone-based)
- Duration
- Urgency (Critical, High, Medium, Low)

**Other Categories:**

- Impact Area (from parameter templates)
- Expected Direction (Increase, Decrease, Maintain, Optimize)
- Timeframe

#### **Updated Component: `AddDecisionModal.jsx`**

Location: `frontend/src/components/AddDecisionModal.jsx`

**Step 1:** Now uses `StructuredDecisionForm` instead of free-form text fields

- Captures category and parameters
- Stores in `formData.category` and `formData.parameters`

**Step 2:** Unchanged (link assumptions, constraints, dependencies)

### 3. Backend Updates

#### **Updated: `DecisionRepository.create()`**

Location: `backend/src/data/repositories/decision-repository.ts`

- Extracts `category` from `metadata.category`
- Extracts `parameters` from `metadata.parameters`
- Saves to dedicated database columns
- Maintains backward compatibility with metadata field

#### **Database Columns:**

```sql
decisions table:
  - category TEXT
  - parameters JSONB
  - metadata JSONB (still used for backward compatibility)
```

## Data Flow

### Creating a Structured Decision

1. **User Action:** Opens "Add Decision" modal
2. **Step 1:** Fills out structured form:
   - Title (required)
   - Category dropdown (required)
   - Category-specific parameters
   - Description (optional)
   - Expiry Date (optional)
3. **Submit:** Moves to Step 2 (link relationships)
4. **Final Submit:** API call to `/api/decisions`

### API Request Format

```json
{
  "title": "Migrate to Cloud Infrastructure",
  "description": "Migrate all production workloads to AWS to improve scalability",
  "metadata": {
    "category": "Technical Architecture",
    "parameters": {
      "domain": "Infrastructure",
      "technology": "AWS",
      "scope": "Migration"
    }
  },
  "expiry_date": "2025-12-31T00:00:00.000Z"
}
```

### Database Storage

```sql
INSERT INTO decisions (
  title,
  description,
  category,
  parameters,
  metadata,
  expiry_date,
  organization_id,
  created_by
) VALUES (
  'Migrate to Cloud Infrastructure',
  'Migrate all production workloads to AWS...',
  'Technical Architecture',  -- extracted from metadata
  '{"domain": "Infrastructure", "technology": "AWS", "scope": "Migration"}',  -- extracted from metadata
  '{"category": "Technical Architecture", "parameters": {...}}',  -- original metadata
  '2025-12-31T00:00:00.000Z',
  '5c1b5451-9aae-45b7-b1b2-c2b90c2c01ac',
  'user-id-here'
);
```

## Why This Matters

### 1. **Contradiction Detection (Phase 3)**

Structured parameters enable objective conflict detection:

**Budget Conflicts:**

```javascript
// Decision A: "Maximum cloud budget is $50k/month"
{ category: "Budget & Financial", parameters: { budgetType: "CAPEX", amount: 50000, allocation: "Not to Exceed" }}

// Decision B: "Migrate all services to cloud" (estimated $80k/month)
{ category: "Budget & Financial", parameters: { budgetType: "OPEX", amount: 80000, allocation: "Minimum Required" }}

// CONFLICT DETECTED: Minimum Required ($80k) > Not to Exceed ($50k)
```

**Resource Conflicts:**

```javascript
// Decision A: "Allocate 10 engineers to Project Alpha"
{ category: "Resource Allocation", parameters: { resourceType: "Engineering", headcount: 10, allocationType: "Full-time" }}

// Decision B: "Allocate 8 engineers to Project Beta"
{ category: "Resource Allocation", parameters: { resourceType: "Engineering", headcount: 8, allocationType: "Full-time" }}

// CONFLICT DETECTED: Total demand (18) > available headcount (12 engineers in org)
```

**Timeline Conflicts:**

```javascript
// Decision A: "Launch product by Q1 2025"
{ category: "Timeline & Milestones", parameters: { timelineType: "Fixed Deadline", timeframe: "1-3 months", urgency: "Critical" }}

// Decision B: "Complete 6-month technical migration before product launch"
{ category: "Technical Architecture", parameters: { scope: "Migration", timeframe: "6-12 months" }}

// CONFLICT DETECTED: Migration (6 months) cannot complete before launch (3 months)
```

### 2. **Review Intelligence (Phase 4)**

Parameters inform urgency scoring:

- Budget decisions with `urgency: "Critical"` → Higher review priority
- Strategic decisions with `impact: "Transformational"` → Executive escalation
- Technical decisions with `scope: "Replacement"` → Stability monitoring

### 3. **Governance Mode (Phase 5)**

Categories map to approval workflows:

- `Budget & Financial` + `amount > $100k` → CFO approval required
- `Strategic Initiative` + `impact: "Transformational"` → Board review
- `Resource Allocation` + `headcount > 5` → HR coordination

### 4. **Versioning (Phase 1)**

Parameter changes tracked across versions:

```javascript
Version 1: { category: "Budget & Financial", parameters: { amount: 50000 }}
Version 2: { category: "Budget & Financial", parameters: { amount: 80000 }}
// Change detected: Budget increased by $30k (60% increase)
```

### 5. **Better Search & Filtering**

```sql
-- Find all budget decisions
SELECT * FROM decisions WHERE category = 'Budget & Financial';

-- Find high-urgency timeline decisions
SELECT * FROM decisions WHERE category = 'Timeline & Milestones' AND parameters->>'urgency' = 'Critical';

-- Find infrastructure migrations
SELECT * FROM decisions WHERE category = 'Technical Architecture' AND parameters->>'scope' = 'Migration';
```

## Migration Path

### For Existing Decisions

**Option 1: Manual Update**

1. Edit decision
2. Select category
3. Fill in parameters
4. Save (creates new version with metadata)

**Option 2: Bulk Migration Script** (if needed)

```typescript
// backend/scripts/backfill-decision-categories.ts
// Map existing titles to categories based on keywords
// e.g., "Migrate to..." → Technical Architecture
// e.g., "Hire..." → Resource Allocation
// e.g., "Budget for..." → Budget & Financial
```

### For Future Decisions

All new decisions **require** category selection in Step 1.

- Cannot proceed without selecting a category
- Ensures data quality for upcoming features

## Testing

### Manual Testing

1. **Create Strategic Decision:**
   - Category: Strategic Initiative
   - Goal: Revenue Growth
   - Impact: Significant
   - Verify stored in database with category/parameters

2. **Create Budget Decision:**
   - Category: Budget & Financial
   - Amount: $500,000
   - Budget Type: CAPEX
   - Verify parameters captured

3. **Create Resource Decision:**
   - Category: Resource Allocation
   - Resource Type: Engineering
   - Headcount: 5
   - Verify parameters captured

4. **Create Technical Decision:**
   - Category: Technical Architecture
   - Domain: Infrastructure
   - Technology: Kubernetes
   - Scope: New Implementation

### Database Verification

```sql
-- Check decision was created with metadata
SELECT id, title, category, parameters, metadata
FROM decisions
WHERE title = 'Your Test Decision';

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'decisions';
-- Should include: idx_decisions_category
```

### API Testing

```bash
# Create decision with structured data
curl -X POST http://localhost:3001/api/decisions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "title": "Test Structured Decision",
    "description": "Testing category and parameters",
    "metadata": {
      "category": "Strategic Initiative",
      "parameters": {
        "goal": "Revenue Growth",
        "impact": "Significant",
        "timeframe": "6-12 months"
      }
    }
  }'

# Verify response includes category and parameters
```

## Next Steps

### Phase 3: Contradiction Engine (Week 4-5)

**Now that decisions have structured parameters, you can implement:**

1. **`DecisionContradictionDetector` Service**
   - Similar to `AssumptionConflictDetector`
   - Detect budget conflicts (max < min, over-allocation)
   - Detect resource conflicts (total demand > available supply)
   - Detect timeline conflicts (dependencies longer than deadlines)
   - Detect objective conflicts (opposing goals)

2. **Contradiction API Routes**
   - `GET /api/contradictions` - List all detected contradictions
   - `POST /api/contradictions/detect` - Run detection manually
   - `GET /api/decisions/:id/contradictions` - Decision-specific contradictions
   - `PUT /api/contradictions/:id/resolve` - Mark contradiction resolved

3. **UI Components**
   - Contradiction notification badges
   - Contradiction detail modal
   - Resolution workflow

### Immediate Wins

1. **Filterable Decision Dashboard**
   - Filter by category
   - Filter by parameters (e.g., show all critical timeline decisions)
   - Category-based grouping

2. **Decision Analytics**
   - Budget distribution across decisions
   - Resource allocation visualization
   - Timeline heatmap

3. **Smart Recommendations**
   - "You have 3 budget decisions totaling $500k"
   - "5 decisions depend on Engineering resources (20 FTE total)"
   - "2 decisions have critical timeline urgency"

## Files Changed

### Created

- `frontend/src/components/StructuredDecisionForm.jsx` (660 lines)
- `backend/migrations/014_add_decision_categories.sql` (42 lines)
- `docs/STRUCTURED_DECISIONS_GUIDE.md` (this file)

### Modified

- `frontend/src/components/AddDecisionModal.jsx`
  - Imported `StructuredDecisionForm`
  - Updated `formData` to include `category` and `parameters`
  - Replaced Step 1 with structured form
  - Updated `handleSubmit` to include metadata

- `backend/src/data/repositories/decision-repository.ts`
  - Updated `create()` to extract category/parameters from metadata
  - Saves to dedicated database columns

## Summary

✅ **Structured decision creation implemented**
✅ **10 category types with specific parameters**
✅ **Database schema updated (migration 014)**
✅ **Backend handles category/parameters extraction**
✅ **Frontend uses dropdown-based form**
✅ **Backward compatible with existing decisions**
✅ **Foundation ready for Phase 3 (Contradiction Engine)**

This change enables reliable, objective conflict detection between decisions and provides the structured metadata needed for all 5 advanced features in your roadmap.
