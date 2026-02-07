-- Test data for Decision Monitoring features
-- Run this in Supabase SQL Editor to populate test data

-- Get the ID of the "Migrate to Microservices" decision
-- Replace this with the actual ID from your decisions table
-- You can find it by running: SELECT id, title FROM decisions;

-- For this example, let's assume the decision ID is stored in a variable
-- Replace 'YOUR_DECISION_ID_HERE' with actual ID

-- Insert sample assumptions
INSERT INTO assumptions (decision_id, description, status, validated_at, metadata) VALUES
  (
    (SELECT id FROM decisions WHERE title LIKE '%Microservices%' LIMIT 1),
    'Team has microservices expertise',
    'VALID',
    NOW(),
    '{"confidence": 80}'::jsonb
  ),
  (
    (SELECT id FROM decisions WHERE title LIKE '%Microservices%' LIMIT 1),
    'Infrastructure budget approved',
    'UNKNOWN',
    NOW() - INTERVAL '10 days',
    '{"confidence": 60}'::jsonb
  ),
  (
    (SELECT id FROM decisions WHERE title LIKE '%Microservices%' LIMIT 1),
    'Current monolithic architecture must be maintained',
    'VALID',
    NOW(),
    '{"confidence": 75, "conflictsWith": []}'::jsonb
  );

-- Update first assumption to mark conflict with third assumption
UPDATE assumptions 
SET metadata = jsonb_set(
  metadata, 
  '{conflictsWith}', 
  jsonb_build_array((SELECT id FROM assumptions WHERE description LIKE '%monolithic%' LIMIT 1))
)
WHERE description LIKE '%microservices expertise%';

-- Insert sample constraints (organizational facts)
INSERT INTO constraints (name, description, rule_expression, is_immutable) VALUES
  ('Budget Constraint', 'Budget constraint: $500K for infrastructure', 'budget <= 500000', true),
  ('Team Size', 'Team size: 8 developers', 'team_size <= 8', true)
ON CONFLICT (name) DO NOTHING;

-- Link constraints to decisions
INSERT INTO decision_constraints (decision_id, constraint_id)
SELECT 
  d.id,
  c.id
FROM decisions d
CROSS JOIN constraints c
WHERE d.title LIKE '%Microservices%'
  AND c.name IN ('Budget Constraint', 'Team Size')
ON CONFLICT (decision_id, constraint_id) DO NOTHING;

-- Insert sample dependencies
-- This will create dependencies between decisions
-- Get the IDs first
DO $$
DECLARE
  microservices_id UUID;
  react_id UUID;
  postgres_id UUID;
BEGIN
  -- Get decision IDs
  SELECT id INTO microservices_id FROM decisions WHERE title LIKE '%Microservices%' LIMIT 1;
  SELECT id INTO react_id FROM decisions WHERE title LIKE '%React%' LIMIT 1;
  SELECT id INTO postgres_id FROM decisions WHERE title LIKE '%PostgreSQL%' LIMIT 1;

  -- Only insert if IDs exist
  IF microservices_id IS NOT NULL AND react_id IS NOT NULL THEN
    INSERT INTO dependencies (source_decision_id, target_decision_id)
    VALUES (react_id, microservices_id)
    ON CONFLICT (source_decision_id, target_decision_id) DO NOTHING;
  END IF;

  IF microservices_id IS NOT NULL AND postgres_id IS NOT NULL THEN
    INSERT INTO dependencies (source_decision_id, target_decision_id)
    VALUES (postgres_id, microservices_id)
    ON CONFLICT (source_decision_id, target_decision_id) DO NOTHING;
  END IF;
END $$;

-- Verify the data
SELECT 'Decisions' as table_name, COUNT(*) as count FROM decisions
UNION ALL
SELECT 'Assumptions', COUNT(*) FROM assumptions
UNION ALL
SELECT 'Constraints', COUNT(*) FROM constraints
UNION ALL
SELECT 'Dependencies', COUNT(*) FROM dependencies
UNION ALL
SELECT 'Decision Constraints', COUNT(*) FROM decision_constraints;
