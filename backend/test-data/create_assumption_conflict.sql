-- Test Data: Create Assumption Conflict
-- This script creates two contradictory assumptions and records their conflict

-- Step 1: Create two assumptions that contradict each other
-- Assumption A: "Budget will remain at $50,000 for Q1"
INSERT INTO assumptions (
  id,
  description,
  status,
  scope,
  created_at
) VALUES (
  '11111111-1111-1111-1111-111111111111'::UUID,
  'Budget will remain at $50,000 for Q1 - The allocated budget is expected to stay at $50,000 without any cuts or additional funding.',
  'HOLDING',
  'UNIVERSAL',
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  scope = EXCLUDED.scope;

-- Assumption B: "Budget will be reduced by 30% in Q1"
INSERT INTO assumptions (
  id,
  description,
  status,
  scope,
  created_at
) VALUES (
  '22222222-2222-2222-2222-222222222222'::UUID,
  'Budget will be reduced by 30% in Q1 - Due to cost-cutting measures, the Q1 budget is expected to be reduced by approximately 30% from the original allocation.',
  'HOLDING',
  'UNIVERSAL',
  NOW()
) ON CONFLICT (id) DO UPDATE
SET 
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  scope = EXCLUDED.scope;

-- Step 2: Create the conflict record
-- Note: assumption_a_id must be < assumption_b_id (enforced by CHECK constraint)
INSERT INTO assumption_conflicts (
  id,
  assumption_a_id,
  assumption_b_id,
  conflict_type,
  confidence_score,
  detected_at,
  resolved_at,
  resolution_action,
  resolution_notes,
  metadata
) VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc'::UUID,
  '11111111-1111-1111-1111-111111111111'::UUID,  -- Budget remains at $50k
  '22222222-2222-2222-2222-222222222222'::UUID,  -- Budget reduced by 30%
  'CONTRADICTORY',
  0.95,  -- 95% confidence this is a real conflict
  NOW(),
  NULL,  -- Not resolved yet
  NULL,
  NULL,
  '{"detected_by": "manual_test", "notes": "These assumptions directly contradict each other regarding Q1 budget"}'::JSONB
) ON CONFLICT (assumption_a_id, assumption_b_id) DO UPDATE
SET 
  conflict_type = EXCLUDED.conflict_type,
  confidence_score = EXCLUDED.confidence_score,
  detected_at = EXCLUDED.detected_at,
  metadata = EXCLUDED.metadata;

-- Step 3: Verify the data
SELECT 
  'Assumptions Created:' AS info,
  COUNT(*) AS count
FROM assumptions 
WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

SELECT 
  'Conflicts Created:' AS info,
  COUNT(*) AS count
FROM assumption_conflicts 
WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

-- Step 4: Test the RPC function
SELECT * FROM get_all_assumption_conflicts(FALSE);
