-- Check if assumptions are actually linked
-- Run this in Supabase SQL Editor

-- 1. Check all links in decision_assumptions table
SELECT 
  d.title as decision,
  a.description as assumption,
  a.scope
FROM decision_assumptions da
JOIN decisions d ON d.id = da.decision_id
JOIN assumptions a ON a.id = da.assumption_id
ORDER BY d.title, a.description;

-- 2. If empty, that means nothing is linked yet!
-- Count how many links exist
SELECT COUNT(*) as total_links FROM decision_assumptions;

-- 3. Show which assumptions have NO links
SELECT 
  a.id,
  a.description,
  a.scope,
  (SELECT COUNT(*) FROM decision_assumptions da WHERE da.assumption_id = a.id) as link_count
FROM assumptions a
WHERE a.scope = 'DECISION_SPECIFIC'
ORDER BY link_count, a.description;
