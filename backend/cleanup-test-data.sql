-- Cleanup Test Data from Decivue Database
-- Execute this script in Supabase SQL Editor to remove all test/demo data
--
-- IMPORTANT: Review the UUIDs below before executing to ensure they match your test data
-- This script is designed to be safe and only remove known test entries

BEGIN;

-- 1. Delete test decisions by known hardcoded UUIDs
-- These UUIDs were used in seed/test data files
DELETE FROM decisions WHERE id IN (
  '36ce016a-507f-4697-8d89-e1c502abc841', -- "Use React for Frontend"
  'bd08941e-2c31-44b1-b728-3f5748cc72fa', -- "Use PostgreSQL Database"
  '124ebced-c07e-48c8-b0c2-fd89db96a6f7', -- "Implement Microservices"
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', -- "Execute Q3 Hiring Plan"
  'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', -- "Migrate to Cloud-Native Database"
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', -- "Launch Q4 AI Features"
  '021b7d66-eefc-413e-ad01-71aa1f41a51e'  -- "Test New Architecture"
);

-- 2. Delete test assumptions
-- Remove the obvious test/placeholder assumption
DELETE FROM assumptions WHERE description = 'fgfg';

-- Optionally delete assumptions with test/sample keywords (uncomment if needed)
-- BE CAREFUL: Review these before uncommenting to avoid deleting legitimate data
-- DELETE FROM assumptions WHERE description ILIKE '%test%';
-- DELETE FROM assumptions WHERE description ILIKE '%sample%';
-- DELETE FROM assumptions WHERE description ILIKE '%demo%';

-- 3. Delete test constraints
-- Remove the sample constraints inserted during schema setup
DELETE FROM constraints WHERE name IN (
  'GDPR Compliance',
  'Budget Limit',
  'Open Source Policy'
);

-- 4. Orphaned records cleanup
-- Note: Due to CASCADE foreign keys, the following should already be cleaned up:
--   - decision_assumptions (links to deleted decisions)
--   - decision_constraints (links to deleted decisions)
--   - dependencies (links to deleted decisions)
--   - decision_tensions (links to deleted decisions)
--
-- If you don't have CASCADE constraints, uncomment the following:
-- DELETE FROM decision_assumptions WHERE decision_id NOT IN (SELECT id FROM decisions);
-- DELETE FROM decision_assumptions WHERE assumption_id NOT IN (SELECT id FROM assumptions);
-- DELETE FROM decision_constraints WHERE decision_id NOT IN (SELECT id FROM decisions);
-- DELETE FROM decision_constraints WHERE constraint_id NOT IN (SELECT id FROM constraints);
-- DELETE FROM dependencies WHERE source_decision_id NOT IN (SELECT id FROM decisions);
-- DELETE FROM dependencies WHERE target_decision_id NOT IN (SELECT id FROM decisions);

-- 4. Verify cleanup - count remaining records
SELECT
  (SELECT COUNT(*) FROM decisions) as remaining_decisions,
  (SELECT COUNT(*) FROM assumptions) as remaining_assumptions,
  (SELECT COUNT(*) FROM constraints) as remaining_constraints,
  (SELECT COUNT(*) FROM dependencies) as remaining_dependencies,
  (SELECT COUNT(*) FROM decision_assumptions) as remaining_decision_assumptions,
  (SELECT COUNT(*) FROM decision_constraints) as remaining_decision_constraints;

-- 5. List remaining data for verification (uncomment to see what's left)
-- SELECT id, title, lifecycle FROM decisions ORDER BY created_at DESC;
-- SELECT id, description, status, scope FROM assumptions ORDER BY created_at DESC;
-- SELECT id, name, description FROM constraints ORDER BY created_at DESC;

COMMIT;

-- If you see any issues, you can ROLLBACK instead of COMMIT
-- Just comment out the COMMIT above and uncomment the line below:
-- ROLLBACK;
