-- Diagnostic script to check current assumptions before migration
-- Run this in Supabase SQL Editor to see what you have

-- 1. Check if scope column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'assumptions' 
  AND column_name = 'scope';
-- If this returns 0 rows, you need to run schema-updates.sql first

-- 2. View all current assumptions
SELECT 
  a.id,
  a.description,
  a.status,
  a.created_at,
  -- Count how many decisions this assumption is linked to
  (SELECT COUNT(*) 
   FROM decision_assumptions da 
   WHERE da.assumption_id = a.id) as linked_decisions_count
FROM assumptions a
ORDER BY a.created_at DESC;

-- 3. See which assumptions are linked to which decisions
SELECT 
  d.title as decision_title,
  a.description as assumption_description,
  a.status
FROM decision_assumptions da
JOIN decisions d ON d.id = da.decision_id
JOIN assumptions a ON a.id = da.assumption_id
ORDER BY d.title, a.description;

-- 4. Identify potential UNIVERSAL assumptions
-- (assumptions linked to multiple decisions might be good candidates)
SELECT 
  a.id,
  a.description,
  COUNT(da.decision_id) as decision_count
FROM assumptions a
LEFT JOIN decision_assumptions da ON da.assumption_id = a.id
GROUP BY a.id, a.description
HAVING COUNT(da.decision_id) > 1
ORDER BY decision_count DESC;

-- 5. Summary statistics
SELECT 
  'Total Assumptions' as metric,
  COUNT(*) as count
FROM assumptions
UNION ALL
SELECT 
  'Assumptions with links' as metric,
  COUNT(DISTINCT assumption_id)
FROM decision_assumptions
UNION ALL
SELECT 
  'Total Decisions' as metric,
  COUNT(*)
FROM decisions;
