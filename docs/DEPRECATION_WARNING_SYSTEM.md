# Deprecation Warning System

## Overview

This feature helps users learn from past failures by tracking the outcomes of deprecated decisions and warning users when they try to create similar decisions that previously failed.

## How It Works

### 1. When Retiring a Decision

When a user marks a decision as deprecated/retired, they are now prompted to:

- **Select an outcome**: failed, succeeded, partially_succeeded, superseded, or no_longer_relevant
- **Provide structured conclusions**:
  - What happened with the decision
  - Why it had this outcome
  - Lessons learned
  - Key issues encountered
  - Specific failure reasons (for failed decisions)
  - Recommendations for future decisions

This information is stored in the database for future reference.

### 2. When Creating a New Decision

When a user creates a new decision with structured parameters:

- The system automatically checks for similar deprecated decisions that failed
- **Similarity detection** uses:
  - Category matching (40% weight)
  - Parameter matching (60% weight)
  - Only shows warnings if similarity >= 60%
- **Warning display** shows:
  - Title of the similar failed decision
  - Similarity percentage
  - Matching parameters
  - Why the previous decision failed
  - Recommendations to avoid similar issues

### 3. Real-time Feedback

Warnings appear automatically as users:

- Select a category
- Fill in parameters
- No need to submit first - warnings show immediately

## Database Schema

### New Fields in `decisions` Table

```sql
-- Outcome when decision was deprecated
deprecation_outcome TEXT CHECK (
  deprecation_outcome IN (
    'failed',
    'succeeded',
    'partially_succeeded',
    'superseded',
    'no_longer_relevant'
  )
)

-- Structured conclusions about the deprecation
deprecation_conclusions JSONB DEFAULT '{}'
  -- Structure:
  -- {
  --   what_happened: string,
  --   why_outcome: string,
  --   lessons_learned: string[],
  --   key_issues: string[],
  --   recommendations: string[],
  --   failure_reasons: string[]
  -- }
```

### Index for Performance

```sql
CREATE INDEX idx_decisions_deprecated_failed
  ON decisions(deprecation_outcome, lifecycle)
  WHERE lifecycle IN ('RETIRED', 'INVALIDATED')
    AND deprecation_outcome = 'failed';
```

## API Endpoints

### 1. Retire Decision (Updated)

**Endpoint**: `PUT /api/decisions/:id/retire`

**Request Body**:

```json
{
  "reason": "manually_retired",
  "outcome": "failed",
  "conclusions": {
    "what_happened": "Project ran over budget and missed deadlines",
    "why_outcome": "Underestimated complexity and resource requirements",
    "lessons_learned": [
      "Need better upfront technical assessment",
      "Buffer estimates by 30% for new technologies"
    ],
    "key_issues": [
      "Insufficient budget",
      "Lack of technical expertise",
      "Scope creep"
    ],
    "recommendations": [
      "Conduct thorough feasibility study first",
      "Ensure sufficient budget buffer",
      "Have expert consultation before committing"
    ],
    "failure_reasons": [
      "Budget constraints",
      "Technical complexity underestimated",
      "Resource shortage"
    ]
  }
}
```

### 2. Check Similar Failures (New)

**Endpoint**: `POST /api/decisions/check-similar-failures`

**Request Body**:

```json
{
  "category": "Budget & Financial",
  "parameters": {
    "budgetType": "Capital Expenditure",
    "amount": "$500K-$1M",
    "timeframe": "6-12 months"
  }
}
```

**Response**:

```json
{
  "warnings": [
    {
      "deprecatedDecisionId": "uuid",
      "deprecatedDecisionTitle": "ERP System Upgrade",
      "similarityScore": 0.85,
      "matchingParameters": [
        "category: Budget & Financial",
        "budgetType: Capital Expenditure",
        "amount: $500K-$1M"
      ],
      "failureReasons": [
        "Budget constraints",
        "Technical complexity underestimated"
      ],
      "lessons": ["Need better upfront technical assessment"],
      "recommendations": [
        "Conduct thorough feasibility study first",
        "Ensure sufficient budget buffer"
      ],
      "warningMessage": "⚠️ Warning: This decision is 85% similar..."
    }
  ],
  "hasWarnings": true
}
```

## Frontend Components

### 1. RetireDecisionModal

New comprehensive modal for retiring decisions:

- **Outcome selection** dropdown (required)
- **What happened** textarea
- **Why outcome** textarea (required for failed)
- **Failure reasons** textarea (required for failed, one per line)
- **Key issues** textarea (one per line)
- **Lessons learned** textarea (one per line)
- **Recommendations** textarea (one per line)

### 2. StructuredDecisionForm (Updated)

Enhanced with warning display:

- Automatically checks for similar failures when category/parameters change
- Shows warning banner with:
  - Number of similar failed decisions
  - Details for each similar decision
  - Matching parameters
  - Failure reasons
  - Recommendations
- Warnings don't block submission - informational only

## Similarity Algorithm

The system calculates similarity based on:

### Category Matching (40% weight)

- Exact category match = 40% similarity
- No category match = 0%

### Parameter Matching (60% weight)

- Compares all common parameter keys
- For each matching key:
  - Exact value match = full score
  - String comparison (case-insensitive)
  - Array comparison (70% overlap threshold)
  - Object comparison (JSON equality)
- Final parameter score = (matching params / total params) × 60%

### Threshold

- Only show warnings if **similarity >= 60%**
- Ensures only meaningful matches are surfaced
- Prevents alert fatigue

## Benefits

### For Users

1. **Learn from past mistakes**: See why similar decisions failed
2. **Make informed decisions**: Get concrete recommendations
3. **Avoid known pitfalls**: Address issues proactively
4. **Institutional memory**: Preserves organizational knowledge

### For Organization

1. **Reduce repeated failures**: Break the cycle of similar mistakes
2. **Knowledge sharing**: Lessons learned are automatically shared
3. **Better decision quality**: Users are more prepared and informed
4. **Cost savings**: Avoid expensive repeated failures

## Migration

To apply this feature:

```bash
# Backend - Apply migration
psql -h <host> -U <user> -d <database> -f backend/migrations/032_add_deprecation_outcome.sql
```

## Example Workflow

1. **User retires a failed decision**:
   - Selects "Failed" as outcome
   - Describes what happened and why
   - Lists specific failure reasons
   - Provides recommendations

2. **Another user creates similar decision**:
   - Selects same category
   - Fills in similar parameters
   - **Warning appears automatically**
   - Shows previous failure details
   - User can adjust approach accordingly

3. **Result**:
   - User makes informed decision
   - Avoids known pitfalls
   - Higher success rate

## Future Enhancements

Potential improvements:

1. **Machine learning**: Improve similarity detection with ML
2. **Success patterns**: Also highlight similar decisions that succeeded
3. **Team analytics**: Track how often warnings are heeded
4. **Success metrics**: Measure reduction in repeated failures
5. **Export lessons**: Generate lessons-learned reports
6. **Integration**: Connect to project management tools

## Files Changed

### Backend

- `backend/migrations/032_add_deprecation_outcome.sql` - New migration
- `backend/src/data/models/decision.ts` - Updated Decision interface
- `backend/src/api/controllers/decision-controller.ts` - Updated retire endpoint, added checkSimilarFailures
- `backend/src/api/routes/decisions.ts` - Added route for check-similar-failures
- `backend/src/services/deprecation-warning-service.ts` - New service for similarity detection

### Frontend

- `frontend/src/services/api.js` - Updated retireDecision, added checkSimilarFailures
- `frontend/src/components/RetireDecisionModal.jsx` - New comprehensive retirement modal
- `frontend/src/components/DecisionMonitoring.jsx` - Updated to use new modal
- `frontend/src/components/StructuredDecisionForm.jsx` - Added warning display and checking

## Testing

To test:

1. **Create and retire a decision**:
   - Add a decision with specific parameters
   - Retire it, select "Failed", provide details
2. **Create similar decision**:
   - Start new decision with same category
   - Fill in similar parameters
   - Warning should appear automatically
3. **Verify warning content**:
   - Check similarity percentage
   - Verify matching parameters shown
   - Confirm failure reasons displayed
   - Review recommendations

## Support

For questions or issues:

- Check logs: `backend/src/services/deprecation-warning-service.ts`
- API testing: Use Postman/curl to test endpoints directly
- Database: Query `decisions` table for deprecation_outcome and deprecation_conclusions
