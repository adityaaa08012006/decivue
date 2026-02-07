-- ============================================================================
-- SEED DATA: DEPENDENCY CHAIN REACTION (CORRECTED)
-- SCENARIO: "AI Feature Launch" depends on "Cloud Migration", which depends on "Hiring"
-- ============================================================================

-- 1. Create Decisions (Removed invalid 'status' column)
INSERT INTO decisions (id, title, description, lifecycle, health_signal, metadata)
VALUES 
  -- Decision A: The Foundation (Hiring)
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Execute Q3 Hiring Plan', 'Hire 2 Senior Backend Engineers and 1 DevOps Specialist.', 'STABLE', 85, '{"tags": ["hiring", "team"]}'),
  
  -- Decision B: The Core (Migration) - DEPENDS ON A
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Migrate to Cloud-Native Database', 'Move from legacy on-prem DB to managed cloud instance.', 'UNDER_REVIEW', 60, '{"tags": ["tech", "infrastructure"]}'),
  
  -- Decision C: The Goal (AI Launch) - DEPENDS ON B
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Launch Q4 AI Features', 'Release the new generative AI module for premium users.', 'STABLE', 50, '{"tags": ["product", "ai"]}');

-- 2. Create Dependencies (The Chain)
-- Hiring (A) -> BLOCKS -> Migration (B)
INSERT INTO dependencies (source_decision_id, target_decision_id)
VALUES ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22')
ON CONFLICT DO NOTHING;

-- Migration (B) -> BLOCKS -> AI Launch (C)
INSERT INTO dependencies (source_decision_id, target_decision_id)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33')
ON CONFLICT DO NOTHING;

-- 3. Add a Signal (Context)
INSERT INTO decision_signals (decision_id, type, description, impact, metadata)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'RISK', 'Migration delayed: Hiring pipeline for DevOps role is 3 weeks behind schedule.', 'HIGH', '{"related_decision": "Q3 Hiring Plan"}');

-- 4. Add Evaluation History (for Timeline)
INSERT INTO evaluation_history (decision_id, old_lifecycle, new_lifecycle, old_health_signal, new_health_signal, trace)
VALUES ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'STABLE', 'UNDER_REVIEW', 50, 60, '{"reason": "Started technical analysis phase."}'::jsonb);
