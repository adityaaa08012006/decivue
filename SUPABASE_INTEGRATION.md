# Supabase Integration - Decision Monitoring

## What Was Changed

### Backend API Endpoints Created

1. **Assumptions API** (`backend/src/api/routes/assumptions.ts`)
   - `GET /api/assumptions?decisionId=xxx` - Fetch all assumptions for a decision
   - `POST /api/assumptions` - Create a new assumption
   - Returns: description, status (VALID/BROKEN/UNKNOWN), validated_at, confidence

2. **Dependencies API** (`backend/src/api/routes/dependencies.ts`)
   - `GET /api/dependencies?decisionId=xxx` - Fetch dependencies (depends on + blocks)
   - `POST /api/dependencies` - Create a new dependency relationship
   - Returns: dependsOn[], blocks[]

3. **Constraints API** (`backend/src/api/routes/constraints.ts`)
   - `GET /api/constraints?decisionId=xxx` - Fetch organizational constraints for a decision
   - `GET /api/constraints/all` - Fetch all organizational constraints
   - Returns: name, description, rule_expression, is_immutable

4. **Server Updates** (`backend/src/server.ts`)
   - Registered all new routes
   - Updated API documentation endpoint

### Frontend Updates

1. **API Service** (`frontend/src/services/api.js`)
   - Added `getAssumptions(decisionId)`
   - Added `getDependencies(decisionId)`
   - Added `getConstraints(decisionId)`
   - Added `getAllConstraints()`

2. **Decision Monitoring Component** (`frontend/src/components/DecisionMonitoring.jsx`)
   - **Removed ALL hardcoded data**
   - Added state management for decision-specific data (assumptions, dependencies, constraints)
   - Added `fetchDecisionDetails()` to load data when decision is expanded
   - Updated all sections to use real Supabase data:
     - ✅ Dependencies section - Shows real "Depends On" and "Blocks" relationships
     - ✅ Assumptions section - Displays real assumptions with status icons and confidence bars
     - ✅ Conflicts section - Shows AT_RISK status based on decision lifecycle
     - ✅ Organizational Facts - Displays real constraints from Supabase
   - Removed hardcoded "1 Conflicted" message in quick info
   - Removed hardcoded assumption examples
   - Removed hardcoded dependency IDs (DEC-002, DEC-005)
   - Removed hardcoded constraint examples

## How to Test

### 1. Add Test Data to Supabase

Run the SQL script in Supabase SQL Editor:
```bash
# File location: backend/test-data.sql
```

This will:
- Add 2 sample assumptions to "Migrate to Microservices" decision
- Add 2 organizational constraints (Budget, Team Size)
- Link constraints to the decision
- Create dependency relationships between decisions

### 2. Verify Backend APIs

Test the endpoints:
```bash
# Test assumptions
curl http://localhost:3001/api/assumptions?decisionId=YOUR_DECISION_ID

# Test dependencies  
curl http://localhost:3001/api/dependencies?decisionId=YOUR_DECISION_ID

# Test constraints
curl http://localhost:3001/api/constraints?decisionId=YOUR_DECISION_ID
```

### 3. Check Frontend

1. Open http://localhost:5173
2. Navigate to "Decision Monitoring"
3. Click on "Migrate to Microservices Architecture" to expand
4. Verify:
   - Dependencies section shows real data from Supabase
   - Assumptions section displays with confidence bars
   - Organizational Facts shows constraints
   - No hardcoded data appears
   - Conflicts section shows status based on AT_RISK lifecycle

## Database Schema Used

### Assumptions Table
- `id` - UUID
- `decision_id` - Foreign key to decisions
- `description` - Text
- `status` - VALID | BROKEN | UNKNOWN
- `validated_at` - Timestamp
- `metadata` - JSONB (stores confidence %)

### Dependencies Table
- `source_decision_id` - Decision that depends on target
- `target_decision_id` - Decision being depended on

### Constraints Table
- `id` - UUID
- `name` - Unique constraint name
- `description` - Explanation
- `rule_expression` - Rule logic
- `is_immutable` - Boolean

### Decision_Constraints Table (Junction)
- Links decisions to constraints

## Next Steps

1. ✅ Backend API routes created
2. ✅ Frontend connected to APIs
3. ✅ All hardcoded data removed
4. ⏳ Add test data via SQL script
5. ⏳ Test all features with real data
6. ⏳ Add more sample decisions with dependencies
7. ⏳ Implement conflict detection logic in backend

## Files Modified

### Created:
- `backend/src/api/routes/assumptions.ts`
- `backend/src/api/routes/dependencies.ts`
- `backend/src/api/routes/constraints.ts`
- `backend/test-data.sql`

### Modified:
- `backend/src/server.ts` - Added route registrations
- `frontend/src/services/api.js` - Added new API methods
- `frontend/src/components/DecisionMonitoring.jsx` - Removed hardcoded data, added real API calls
