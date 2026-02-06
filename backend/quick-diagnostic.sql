-- Quick diagnostic to check assumption setup
-- Run this in Supabase SQL Editor

-- 1. Check all assumptions and their scope
SELECT 
  id,
  description,
  scope,
  status,
  (SELECT COUNT(*) FROM decision_assumptions da WHERE da.assumption_id = a.id) as linked_decisions
FROM assumptions a
ORDER BY scope DESC, description;

-- 2. Verify the budget is UNIVERSAL
SELECT * FROM assumptions WHERE description = 'BUDGET IS 2.5cr';

-- 3. Check if scope column exists and has values
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN scope = 'UNIVERSAL' THEN 1 END) as universal_count,
  COUNT(CASE WHEN scope = 'DECISION_SPECIFIC' THEN 1 END) as decision_specific_count,
  COUNT(CASE WHEN scope IS NULL THEN 1 END) as null_scope_count
FROM assumptions;
