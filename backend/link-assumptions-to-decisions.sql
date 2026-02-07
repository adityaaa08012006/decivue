-- Link assumptions to their correct decisions
-- Run this in Supabase SQL Editor

-- First, let's see what assumptions we have
SELECT id, description, scope FROM assumptions ORDER BY description;

-- Link React-related assumptions to "Use React for Frontend"
INSERT INTO decision_assumptions (decision_id, assumption_id)
SELECT 
  '36ce016a-507f-4697-8d89-e1c502abc841', -- Use React for Frontend
  id
FROM assumptions
WHERE description IN (
  'React has strong community support and documentation',
  'Team has React expertise'
)
ON CONFLICT (decision_id, assumption_id) DO NOTHING;

-- Link PostgreSQL assumption to "Use PostgreSQL Database"
INSERT INTO decision_assumptions (decision_id, assumption_id)
SELECT 
  'bd08941e-2c31-44b1-b728-3f5748cc72fa', -- Use PostgreSQL Database
  id
FROM assumptions
WHERE description = 'PostgreSQL can scale to our expected load'
ON CONFLICT (decision_id, assumption_id) DO NOTHING;

-- Link Microservices assumption to "Implement Microservices"
INSERT INTO decision_assumptions (decision_id, assumption_id)
SELECT 
  '124ebced-c07e-48c8-b0c2-fd89db96a6f7', -- Implement Microservices
  id
FROM assumptions
WHERE description = 'Microservices overhead is manageable with current team size'
ON CONFLICT (decision_id, assumption_id) DO NOTHING;

-- Link "fgfg" test assumption to any decision (or delete it)
-- If you want to keep it:
INSERT INTO decision_assumptions (decision_id, assumption_id)
SELECT 
  '021b7d66-eefc-413e-ad01-71aa1f41a51e', -- Test New Architecture
  id
FROM assumptions
WHERE description = 'fgfg'
ON CONFLICT (decision_id, assumption_id) DO NOTHING;

-- OR delete the test assumption:
-- DELETE FROM assumptions WHERE description = 'fgfg';

-- Verify the links
SELECT 
  d.title as decision,
  a.description as assumption,
  a.scope
FROM decision_assumptions da
JOIN decisions d ON d.id = da.decision_id
JOIN assumptions a ON a.id = da.assumption_id
ORDER BY d.title, a.description;
