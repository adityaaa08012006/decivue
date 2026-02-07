# 🚨 ISSUE IDENTIFIED: Why All Assumptions Show Up

## The Problem

Your screenshot shows that ALL assumptions from the database are appearing in the "Localized Risks (Decision-Specific)" section, instead of just:
- Universal assumptions (that apply to ALL decisions)
- PLUS decision-specific assumptions linked to THIS particular decision

## Root Cause

**The `scope` column doesn't exist yet in your database!**

Since `schema-updates.sql` hasn't been executed, all assumptions have `scope = NULL`. 

The frontend code has this filter:
```javascript
.filter(a => a.scope === 'DECISION_SPECIFIC' || !a.scope)
```

The `|| !a.scope` is a fallback for backward compatibility, which means:
- ✅ Shows assumptions where scope = 'DECISION_SPECIFIC'  
- ✅ ALSO shows assumptions where scope = NULL (all existing data!)

So right now, EVERY assumption in your database is being treated as "decision-specific" and showing up.

## Solution

You need to run 2 SQL files in Supabase:

### File 1: `backend/schema-updates.sql`
```sql
-- Adds the scope column to assumptions table
ALTER TABLE assumptions 
ADD COLUMN scope TEXT CHECK (scope IN ('UNIVERSAL', 'DECISION_SPECIFIC')) 
DEFAULT 'DECISION_SPECIFIC';

-- Adds the conflicts table
CREATE TABLE assumption_conflicts (...);

-- Adds the helper function
CREATE FUNCTION get_assumption_conflicts(...);
```

### File 2: `backend/migrate-existing-assumptions.sql` (NEW)
```sql
-- Sets scope for all existing assumptions
UPDATE assumptions 
SET scope = 'DECISION_SPECIFIC' 
WHERE scope IS NULL;

-- You can then manually update specific ones to UNIVERSAL:
-- UPDATE assumptions 
-- SET scope = 'UNIVERSAL' 
-- WHERE description ILIKE '%budget%' 
--    OR description ILIKE '%team size%';
```

## After Running Migrations

Once you execute both SQL files, each assumption will have a proper `scope` value:
- `UNIVERSAL` - Shows up on EVERY decision (organizational rules)
- `DECISION_SPECIFIC` - Only shows up on the decision it's linked to

The UI will then correctly show:
```
🌐 Universal Rules (Apply to all decisions)
├── Budget constraint: $500K
├── Team size: 8 developers  
└── GDPR compliance required

📌 Decision-Specific (This decision only)
├── Team has React expertise
└── PostgreSQL can scale to expected load
```

## Quick Fix Steps

1. Open Supabase SQL Editor
2. Copy and paste `backend/schema-updates.sql` → Execute
3. Copy and paste `backend/migrate-existing-assumptions.sql` → Execute  
4. Verify with: `SELECT scope, COUNT(*) FROM assumptions GROUP BY scope;`
5. Refresh your app - assumptions will now be properly filtered!

## Expected Behavior After Fix

Looking at your screenshot, you have these assumptions:
- "fgfg"
- "React has strong community support"
- "Team has React expertise"  
- "PostgreSQL can scale to our expected load"
- "Microservices overhead is manageable"

**Before migration:** All 5 show up on every decision (wrong!)

**After migration:**  
If they're all linked to "Use React for Frontend" decision:
- Universal section: Empty (or shows org-wide rules if any exist)
- Decision-Specific: Only shows the 5 assumptions linked to THIS decision

If they're linked to DIFFERENT decisions:
- Each decision will only show its own linked assumptions
- PLUS any universal assumptions you create

## How to Create Universal Assumptions

After migration, you can create organizational rules:

```sql
-- Create universal assumptions
INSERT INTO assumptions (description, status, scope) VALUES
  ('Budget must not exceed $500K', 'HOLDING', 'UNIVERSAL'),
  ('Team size limited to 8 developers', 'HOLDING', 'UNIVERSAL'),
  ('All changes must pass security review', 'HOLDING', 'UNIVERSAL');

-- These will automatically show up on EVERY decision
-- No need to link them via decision_assumptions table
```

## Summary

✅ **Root cause:** Missing `scope` column (schema not migrated)  
✅ **Symptom:** All assumptions show as "decision-specific" on all decisions  
✅ **Fix:** Run both SQL files in Supabase  
✅ **Result:** Proper filtering - universal + linked assumptions only  

🚀 **Next step:** Execute the SQL migrations!
