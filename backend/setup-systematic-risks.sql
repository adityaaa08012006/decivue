-- Set up systematic risks (UNIVERSAL assumptions)
-- These will appear on EVERY decision automatically

-- Step 1: Update budget and fgfg to UNIVERSAL (systematic risks)
UPDATE assumptions 
SET scope = 'UNIVERSAL' 
WHERE description IN ('BUDGET IS 2.5cr', 'fgfg');

-- Step 2: Create more systematic risks (organizational constraints)
-- These are examples - add your own systematic risks here
INSERT INTO assumptions (description, status, scope) VALUES
  ('All infrastructure changes require security approval', 'HOLDING', 'UNIVERSAL'),
  ('Team size limited to 8 developers', 'HOLDING', 'UNIVERSAL'),
  ('Must comply with data privacy regulations', 'HOLDING', 'UNIVERSAL')
ON CONFLICT (description) DO NOTHING;

-- Step 3: Verify UNIVERSAL assumptions
SELECT 
  description,
  scope,
  status,
  '🌐 Appears on ALL decisions' as impact
FROM assumptions
WHERE scope = 'UNIVERSAL'
ORDER BY description;

-- Step 4: Verify DECISION_SPECIFIC assumptions
SELECT 
  a.description,
  a.scope,
  d.title as linked_to_decision,
  '📌 Only on this decision' as impact
FROM assumptions a
LEFT JOIN decision_assumptions da ON da.assumption_id = a.id
LEFT JOIN decisions d ON d.id = da.decision_id
WHERE a.scope = 'DECISION_SPECIFIC'
ORDER BY d.title, a.description;
