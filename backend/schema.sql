-- DECIVUE Database Schema (REFACTORED)
-- Execute this SQL in your Supabase SQL Editor to create all required tables
--
-- PHILOSOPHY:
-- - Assumptions are global and reusable (not tied to single decisions)
-- - Assumption status represents drift, not truth (HOLDING | SHAKY | BROKEN)
-- - No automatic state mutations (no triggers on last_reviewed_at)
-- - Decision conflicts are surfaced, not auto-resolved
-- - Constraints represent immutable organizational facts
-- - Engine decides lifecycle; database only stores
-- - Full explainability through evaluation traces

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- DECISIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL CHECK (lifecycle IN ('STABLE', 'UNDER_REVIEW', 'AT_RISK', 'INVALIDATED', 'RETIRED')),
  health_signal INTEGER NOT NULL CHECK (health_signal BETWEEN 0 AND 100),
  invalidated_reason TEXT, -- Why was this decision invalidated? (constraint | assumption | manual)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Updated ONLY by explicit human review, never automatically
  metadata JSONB DEFAULT '{}'::JSONB
);

COMMENT ON TABLE decisions IS 'Core decisions being monitored. Lifecycle transitions managed by engine only.';
COMMENT ON COLUMN decisions.health_signal IS 'Internal signal only (0-100). Never authoritative. Not exposed in UI. Used for lifecycle thresholds.';
COMMENT ON COLUMN decisions.lifecycle IS 'STABLE | UNDER_REVIEW | AT_RISK | INVALIDATED | RETIRED';
COMMENT ON COLUMN decisions.invalidated_reason IS 'Dominant cause of invalidation: constraint_violation | broken_assumptions | manual | null';
COMMENT ON COLUMN decisions.last_reviewed_at IS 'Updated ONLY by explicit human review action. NOT auto-updated.';

-- Index for faster lifecycle queries
CREATE INDEX IF NOT EXISTS idx_decisions_lifecycle ON decisions(lifecycle);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_decisions_invalidated ON decisions(lifecycle) WHERE lifecycle = 'INVALIDATED';

-- ============================================================================
-- ASSUMPTIONS TABLE (GLOBAL & REUSABLE)
-- ============================================================================
CREATE TABLE IF NOT EXISTS assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  description TEXT NOT NULL UNIQUE, -- Global assumptions must be unique
  status TEXT NOT NULL CHECK (status IN ('HOLDING', 'SHAKY', 'BROKEN')) DEFAULT 'HOLDING',
  validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE assumptions IS 'Global, reusable assumptions. Not tied to single decisions.';
COMMENT ON COLUMN assumptions.status IS 'Represents drift from original state: HOLDING (stable) | SHAKY (deteriorating) | BROKEN (invalidated)';
COMMENT ON COLUMN assumptions.description IS 'Must be unique. Assumptions are shared across decisions.';

-- Index for faster status lookups
CREATE INDEX IF NOT EXISTS idx_assumptions_status ON assumptions(status);

-- ============================================================================
-- DECISION_ASSUMPTIONS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_assumptions (
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  assumption_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (decision_id, assumption_id)
);

COMMENT ON TABLE decision_assumptions IS 'Many-to-many: decisions can share assumptions, assumptions can apply to multiple decisions.';

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_decision_assumptions_decision ON decision_assumptions(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_assumptions_assumption ON decision_assumptions(assumption_id);

-- ============================================================================
-- CONSTRAINTS TABLE (IMMUTABLE ORGANIZATIONAL FACTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  constraint_type TEXT NOT NULL CHECK (constraint_type IN ('LEGAL', 'BUDGET', 'POLICY', 'TECHNICAL', 'COMPLIANCE', 'OTHER')),
  rule_expression TEXT, -- Optional: simplified, logic lives in engine
  is_immutable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE constraints IS 'Immutable organizational facts (legal, budget, policy). Logic enforced by engine, not SQL.';
COMMENT ON COLUMN constraints.constraint_type IS 'Category: LEGAL | BUDGET | POLICY | TECHNICAL | COMPLIANCE | OTHER';
COMMENT ON COLUMN constraints.rule_expression IS 'Optional reference. Actual constraint logic lives in rule engine.';

-- Index for constraint type queries
CREATE INDEX IF NOT EXISTS idx_constraints_type ON constraints(constraint_type);

-- ============================================================================
-- DECISION_CONSTRAINTS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_constraints (
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  constraint_id UUID NOT NULL REFERENCES constraints(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (decision_id, constraint_id)
);

-- Indexes for junction table
CREATE INDEX IF NOT EXISTS idx_decision_constraints_decision ON decision_constraints(decision_id);
CREATE INDEX IF NOT EXISTS idx_decision_constraints_constraint ON decision_constraints(constraint_id);

-- ============================================================================
-- DEPENDENCIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS dependencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  target_decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_decision_id, target_decision_id),
  -- Prevent self-references
  CHECK (source_decision_id != target_decision_id)
);

COMMENT ON TABLE dependencies IS 'Decision A depends on Decision B. Health propagates through dependencies.';

-- Indexes for dependency queries
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_decision_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_decision_id);

-- ============================================================================
-- DECISION_TENSIONS TABLE (CONFLICT MODELING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS decision_tensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_a_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  decision_b_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- Why do these decisions conflict?
  severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH')) DEFAULT 'MEDIUM',
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ, -- When was this tension resolved?
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  UNIQUE(decision_a_id, decision_b_id),
  -- Prevent self-references
  CHECK (decision_a_id != decision_b_id)
);

COMMENT ON TABLE decision_tensions IS 'Tracks conflicts between decisions. Surfaced for human resolution, not auto-resolved.';
COMMENT ON COLUMN decision_tensions.reason IS 'Human-readable explanation of why these decisions conflict.';
COMMENT ON COLUMN decision_tensions.severity IS 'Impact level: LOW | MEDIUM | HIGH';

-- Indexes for tension queries
CREATE INDEX IF NOT EXISTS idx_decision_tensions_decision_a ON decision_tensions(decision_a_id);
CREATE INDEX IF NOT EXISTS idx_decision_tensions_decision_b ON decision_tensions(decision_b_id);
CREATE INDEX IF NOT EXISTS idx_decision_tensions_unresolved ON decision_tensions(resolved_at) WHERE resolved_at IS NULL;

-- ============================================================================
-- EVALUATION_HISTORY TABLE (AUDIT TRAIL)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  old_lifecycle TEXT NOT NULL,
  new_lifecycle TEXT NOT NULL,
  old_health_signal INTEGER NOT NULL,
  new_health_signal INTEGER NOT NULL,
  invalidated_reason TEXT, -- Captured at time of invalidation
  trace JSONB NOT NULL, -- Full evaluation trace with all 5 steps
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE evaluation_history IS 'Full audit trail of every evaluation. Preserves explainability.';
COMMENT ON COLUMN evaluation_history.old_health_signal IS 'Previous health_signal value (internal signal only)';
COMMENT ON COLUMN evaluation_history.new_health_signal IS 'New health_signal value (internal signal only)';
COMMENT ON COLUMN evaluation_history.trace IS 'Complete step-by-step evaluation trace (5 steps). No hidden logic.';

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_evaluation_history_decision ON evaluation_history(decision_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_history_evaluated_at ON evaluation_history(evaluated_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_tensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluation_history ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust as needed)
CREATE POLICY "decisions_select_policy" ON decisions FOR SELECT USING (true);
CREATE POLICY "decisions_insert_policy" ON decisions FOR INSERT WITH CHECK (true);
CREATE POLICY "decisions_update_policy" ON decisions FOR UPDATE USING (true);
CREATE POLICY "decisions_delete_policy" ON decisions FOR DELETE USING (true);

CREATE POLICY "assumptions_select_policy" ON assumptions FOR SELECT USING (true);
CREATE POLICY "assumptions_insert_policy" ON assumptions FOR INSERT WITH CHECK (true);
CREATE POLICY "assumptions_update_policy" ON assumptions FOR UPDATE USING (true);
CREATE POLICY "assumptions_delete_policy" ON assumptions FOR DELETE USING (true);

CREATE POLICY "decision_assumptions_select_policy" ON decision_assumptions FOR SELECT USING (true);
CREATE POLICY "decision_assumptions_insert_policy" ON decision_assumptions FOR INSERT WITH CHECK (true);
CREATE POLICY "decision_assumptions_delete_policy" ON decision_assumptions FOR DELETE USING (true);

CREATE POLICY "constraints_select_policy" ON constraints FOR SELECT USING (true);
CREATE POLICY "constraints_insert_policy" ON constraints FOR INSERT WITH CHECK (true);
CREATE POLICY "constraints_update_policy" ON constraints FOR UPDATE USING (true);
CREATE POLICY "constraints_delete_policy" ON constraints FOR DELETE USING (true);

CREATE POLICY "decision_constraints_select_policy" ON decision_constraints FOR SELECT USING (true);
CREATE POLICY "decision_constraints_insert_policy" ON decision_constraints FOR INSERT WITH CHECK (true);
CREATE POLICY "decision_constraints_delete_policy" ON decision_constraints FOR DELETE USING (true);

CREATE POLICY "dependencies_select_policy" ON dependencies FOR SELECT USING (true);
CREATE POLICY "dependencies_insert_policy" ON dependencies FOR INSERT WITH CHECK (true);
CREATE POLICY "dependencies_delete_policy" ON dependencies FOR DELETE USING (true);

CREATE POLICY "decision_tensions_select_policy" ON decision_tensions FOR SELECT USING (true);
CREATE POLICY "decision_tensions_insert_policy" ON decision_tensions FOR INSERT WITH CHECK (true);
CREATE POLICY "decision_tensions_update_policy" ON decision_tensions FOR UPDATE USING (true);
CREATE POLICY "decision_tensions_delete_policy" ON decision_tensions FOR DELETE USING (true);

CREATE POLICY "evaluation_history_select_policy" ON evaluation_history FOR SELECT USING (true);
CREATE POLICY "evaluation_history_insert_policy" ON evaluation_history FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Insert sample decisions (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM decisions LIMIT 1) THEN
    INSERT INTO decisions (title, description, lifecycle, health_signal)
    VALUES
      ('Use React for Frontend', 'Decision to use React framework for building the user interface', 'STABLE', 95),
      ('Use PostgreSQL Database', 'Decision to use PostgreSQL as the primary database', 'STABLE', 90),
      ('Implement Microservices', 'Decision to adopt microservices architecture', 'AT_RISK', 65);

    RAISE NOTICE 'Sample decisions inserted';
  END IF;
END $$;

-- Insert sample global assumptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM assumptions LIMIT 1) THEN
    INSERT INTO assumptions (description, status)
    VALUES
      ('React has strong community support and documentation', 'HOLDING'),
      ('Team has React expertise', 'HOLDING'),
      ('PostgreSQL can scale to our expected load', 'HOLDING'),
      ('Microservices overhead is manageable with current team size', 'SHAKY');

    RAISE NOTICE 'Sample assumptions inserted';
  END IF;
END $$;

-- Link assumptions to decisions
DO $$
DECLARE
  react_decision_id UUID;
  postgres_decision_id UUID;
  microservices_decision_id UUID;
  assumption_react_support UUID;
  assumption_team_expertise UUID;
  assumption_postgres_scale UUID;
  assumption_microservices_overhead UUID;
BEGIN
  -- Get decision IDs
  SELECT id INTO react_decision_id FROM decisions WHERE title = 'Use React for Frontend' LIMIT 1;
  SELECT id INTO postgres_decision_id FROM decisions WHERE title = 'Use PostgreSQL Database' LIMIT 1;
  SELECT id INTO microservices_decision_id FROM decisions WHERE title = 'Implement Microservices' LIMIT 1;

  -- Get assumption IDs
  SELECT id INTO assumption_react_support FROM assumptions WHERE description = 'React has strong community support and documentation' LIMIT 1;
  SELECT id INTO assumption_team_expertise FROM assumptions WHERE description = 'Team has React expertise' LIMIT 1;
  SELECT id INTO assumption_postgres_scale FROM assumptions WHERE description = 'PostgreSQL can scale to our expected load' LIMIT 1;
  SELECT id INTO assumption_microservices_overhead FROM assumptions WHERE description = 'Microservices overhead is manageable with current team size' LIMIT 1;

  -- Link assumptions to decisions
  IF react_decision_id IS NOT NULL AND assumption_react_support IS NOT NULL THEN
    INSERT INTO decision_assumptions (decision_id, assumption_id)
    VALUES
      (react_decision_id, assumption_react_support),
      (react_decision_id, assumption_team_expertise)
    ON CONFLICT DO NOTHING;
  END IF;

  IF postgres_decision_id IS NOT NULL AND assumption_postgres_scale IS NOT NULL THEN
    INSERT INTO decision_assumptions (decision_id, assumption_id)
    VALUES (postgres_decision_id, assumption_postgres_scale)
    ON CONFLICT DO NOTHING;
  END IF;

  IF microservices_decision_id IS NOT NULL AND assumption_microservices_overhead IS NOT NULL THEN
    INSERT INTO decision_assumptions (decision_id, assumption_id)
    VALUES (microservices_decision_id, assumption_microservices_overhead)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample decision-assumption links created';
  END IF;
END $$;

-- Insert sample constraints
INSERT INTO constraints (name, description, constraint_type, rule_expression, is_immutable)
VALUES
  ('GDPR Compliance', 'All systems must comply with GDPR regulations', 'LEGAL', NULL, true),
  ('Budget Limit', 'Total infrastructure cost must not exceed $10,000/month', 'BUDGET', NULL, true),
  ('Open Source Policy', 'All core technologies must be open source', 'POLICY', NULL, true)
ON CONFLICT (name) DO NOTHING;

-- Insert sample decision tension
DO $$
DECLARE
  react_decision_id UUID;
  postgres_decision_id UUID;
BEGIN
  SELECT id INTO react_decision_id FROM decisions WHERE title = 'Use React for Frontend' LIMIT 1;
  SELECT id INTO postgres_decision_id FROM decisions WHERE title = 'Use PostgreSQL Database' LIMIT 1;

  IF react_decision_id IS NOT NULL AND postgres_decision_id IS NOT NULL THEN
    INSERT INTO decision_tensions (decision_a_id, decision_b_id, reason, severity)
    VALUES (
      react_decision_id,
      postgres_decision_id,
      'React frontend may require NoSQL for optimal real-time features, conflicts with PostgreSQL choice',
      'LOW'
    )
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Sample decision tension inserted';
  END IF;
END $$;

-- ============================================================================
-- NO AUTOMATIC TRIGGERS
-- ============================================================================
-- CRITICAL: We explicitly DO NOT create triggers for automatic state updates.
-- All state transitions must come from the deterministic rule engine.
-- last_reviewed_at is updated ONLY by explicit human review actions.

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ DECIVUE database schema created successfully!';
  RAISE NOTICE 'Tables created: decisions, assumptions, decision_assumptions, constraints, decision_constraints, dependencies, decision_tensions, evaluation_history';
  RAISE NOTICE 'Philosophy: Assumptions are global. Status = drift (HOLDING/SHAKY/BROKEN). No auto-triggers. Conflicts surfaced.';
  RAISE NOTICE 'Sample data inserted for testing';
END $$;
