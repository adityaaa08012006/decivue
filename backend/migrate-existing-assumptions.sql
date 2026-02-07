-- Migration script to set scope for existing assumptions
-- Run this AFTER schema-updates.sql

-- IMPORTANT: First, check what assumptions you have by running:
-- backend/check-current-assumptions.sql

-- Step 1: Set all existing assumptions to DECISION_SPECIFIC by default
UPDATE assumptions 
SET scope = 'DECISION_SPECIFIC' 
WHERE scope IS NULL;

-- Step 2: Identify assumptions that should be UNIVERSAL
-- Look at your assumptions and decide which are organizational rules
-- Here are common patterns for universal assumptions:

-- Example 1: Budget/cost constraints
-- UPDATE assumptions 
-- SET scope = 'UNIVERSAL' 
-- WHERE description ILIKE '%budget%'
--    OR description ILIKE '%cost%'
--    OR description ILIKE '%\$%';

-- Example 2: Team/resource constraints  
-- UPDATE assumptions 
-- SET scope = 'UNIVERSAL'
-- WHERE description ILIKE '%team size%'
--    OR description ILIKE '%developer%'
--    OR description ILIKE '%resource%';

-- Example 3: Compliance/security requirements
-- UPDATE assumptions 
-- SET scope = 'UNIVERSAL'
-- WHERE description ILIKE '%compliance%'
--    OR description ILIKE '%security%'
--    OR description ILIKE '%GDPR%'
--    OR description ILIKE '%approval%';

-- Example 4: Update specific assumptions by description
-- UPDATE assumptions 
-- SET scope = 'UNIVERSAL' 
-- WHERE description IN (
--   'All infrastructure changes require security approval',
--   'Budget must not exceed $500K',
--   'Team size limited to 8 developers'
-- );

-- Step 3: Verify the update
SELECT 
  scope, 
  COUNT(*) as count 
FROM assumptions 
GROUP BY scope;

-- Step 4: View all assumptions with their scope
SELECT 
  id,
  description,
  scope,
  status,
  created_at
FROM assumptions
ORDER BY scope DESC, created_at DESC;
