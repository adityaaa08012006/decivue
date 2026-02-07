# Test Data: Assumption Conflicts

This directory contains SQL scripts to create test data for assumption conflict detection.

## Files

### `create_assumption_conflict.sql`
Creates a test conflict between two contradictory budget assumptions.

**What it creates:**
1. **Assumption A**: "Budget will remain at $50,000 for Q1" (UNIVERSAL scope)
2. **Assumption B**: "Budget will be reduced by 30% in Q1" (UNIVERSAL scope)
3. **Conflict Record**: CONTRADICTORY conflict with 95% confidence

## How to Execute

### Option 1: Using Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New query**
4. Copy and paste the contents of `create_assumption_conflict.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Check the query results to verify data was created

### Option 2: Using psql (Command Line)
```bash
# From the backend directory
psql -h <your-supabase-host> -U postgres -d postgres -f test-data/create_assumption_conflict.sql
```

### Option 3: Using Node.js Script
```bash
# From the backend directory
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const sql = fs.readFileSync('./test-data/create_assumption_conflict.sql', 'utf8');
supabase.rpc('exec_sql', { sql }).then(console.log);
"
```

## Verification

After running the script, you should be able to:

1. **View in Assumptions Page**:
   - Go to the Assumptions Section in the frontend
   - You should see a "Detected Conflicts" section appear
   - The conflict card should show both assumptions with 95% confidence

2. **Check in Database**:
   ```sql
   -- View the assumptions
   SELECT id, text, description, scope, status 
   FROM assumptions 
   WHERE id IN (
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222'
   );

   -- View the conflict
   SELECT * FROM get_all_assumption_conflicts(FALSE);
   ```

3. **Test Conflict Resolution**:
   - Click on the conflict card in the frontend
   - Try resolving it using different actions:
     - **VALIDATE_A**: Mark first assumption as correct
     - **VALIDATE_B**: Mark second assumption as correct
     - **MERGE**: Combine both into a new assumption
     - **DEPRECATE_BOTH**: Mark both as invalid
     - **KEEP_BOTH**: Accept both as valid (not truly contradictory)

## Cleanup

To remove the test data:

```sql
-- Remove the conflict
DELETE FROM assumption_conflicts 
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Remove the assumptions
DELETE FROM assumptions 
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
```

## Creating Additional Test Conflicts

You can modify the script to create different types of conflicts:

### MUTUALLY_EXCLUSIVE Example
```sql
-- Assumption A: "Project will use React framework"
-- Assumption B: "Project will use Angular framework"
-- conflict_type: 'MUTUALLY_EXCLUSIVE'
```

### INCOMPATIBLE Example
```sql
-- Assumption A: "Development timeline is 3 months"
-- Assumption B: "All features from 6-month roadmap must be delivered"
-- conflict_type: 'INCOMPATIBLE'
```

## Notes

- The script uses `ON CONFLICT ... DO UPDATE` to be idempotent (safe to run multiple times)
- UUIDs are hardcoded for easier testing and cleanup
- Confidence score is set to 0.95 (95%) to indicate high confidence
- Both assumptions are set to UNIVERSAL scope to affect all decisions
- The conflict is unresolved (resolved_at is NULL) so it appears in the frontend
