-- Direct fix for budget - Run this in Supabase SQL Editor
-- This will update the budget to UNIVERSAL scope

-- First, let's see the exact budget description (with any hidden characters)
SELECT 
  id,
  description,
  scope,
  LENGTH(description) as desc_length,
  description = 'BUDGET IS 2.5cr' as exact_match
FROM assumptions 
WHERE description LIKE '%BUDGET%' OR description LIKE '%2.5cr%';

-- Update by pattern matching (handles any spacing issues)
UPDATE assumptions 
SET scope = 'UNIVERSAL' 
WHERE description ILIKE '%budget%' AND description ILIKE '%2.5cr%';

-- Also update fgfg (if you want it to affect all decisions)
UPDATE assumptions 
SET scope = 'UNIVERSAL' 
WHERE description = 'fgfg';

-- Verify the changes
SELECT 
  description,
  scope,
  CASE 
    WHEN scope = 'UNIVERSAL' THEN '✅ Will appear on ALL decisions'
    ELSE '📌 Decision-specific only'
  END as status
FROM assumptions
ORDER BY scope DESC, description;
