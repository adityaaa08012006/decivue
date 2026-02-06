-- DECIVUE Database Schema
-- Execute this SQL in your Supabase SQL Editor to create all required tables

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
  health INTEGER NOT NULL CHECK (health BETWEEN 0 AND 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

COMMENT ON COLUMN decisions.health IS 'Internal signal only (0-100). Never authoritative. Not exposed in UI.';
COMMENT ON COLUMN decisions.lifecycle IS 'STABLE | UNDER_REVIEW | AT_RISK | INVALIDATED | RETIRED';

-- Index for faster lifecycle queries
CREATE INDEX IF NOT EXISTS idx_decisions_lifecycle ON decisions(lifecycle);
CREATE INDEX IF NOT EXISTS idx_decisions_created_at ON decisions(created_at DESC);

-- ============================================================================
-- ASSUMPTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS assumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VALID', 'BROKEN', 'UNKNOWN')) DEFAULT 'UNKNOWN',
  validated_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster decision lookups
CREATE INDEX IF NOT EXISTS idx_assumptions_decision_id ON assumptions(decision_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_status ON assumptions(status);

-- ============================================================================
-- CONSTRAINTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS constraints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rule_expression TEXT NOT NULL,
  is_immutable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- Indexes for dependency queries
CREATE INDEX IF NOT EXISTS idx_dependencies_source ON dependencies(source_decision_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_target ON dependencies(target_decision_id);

-- ============================================================================
-- EVALUATION_HISTORY TABLE (Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evaluation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  old_lifecycle TEXT NOT NULL,
  new_lifecycle TEXT NOT NULL,
  old_health INTEGER NOT NULL,
  new_health INTEGER NOT NULL,
  trace JSONB NOT NULL, -- Full evaluation trace with all steps
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN evaluation_history.old_health IS 'Previous health value (internal signal only)';
COMMENT ON COLUMN evaluation_history.new_health IS 'New health value (internal signal only)';

-- Index for audit queries
CREATE INDEX IF NOT EXISTS idx_evaluation_history_decision ON evaluation_history(decision_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_history_evaluated_at ON evaluation_history(evaluated_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optional but recommended
-- ============================================================================
-- Enable RLS on all tables
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
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

CREATE POLICY "evaluation_history_select_policy" ON evaluation_history FOR SELECT USING (true);
CREATE POLICY "evaluation_history_insert_policy" ON evaluation_history FOR INSERT WITH CHECK (true);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Insert sample decisions (only if table is empty)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM decisions LIMIT 1) THEN
    INSERT INTO decisions (title, description, lifecycle, health)
    VALUES
      ('Use React for Frontend', 'Decision to use React framework for building the user interface', 'STABLE', 95),
      ('Use PostgreSQL Database', 'Decision to use PostgreSQL as the primary database', 'STABLE', 90),
      ('Implement Microservices', 'Decision to adopt microservices architecture', 'AT_RISK', 65);

    RAISE NOTICE 'Sample decisions inserted';
  END IF;
END $$;

-- Insert sample assumptions (only if decisions exist)
DO $$
DECLARE
  react_decision_id UUID;
BEGIN
  SELECT id INTO react_decision_id FROM decisions WHERE title = 'Use React for Frontend' LIMIT 1;

  IF react_decision_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assumptions WHERE decision_id = react_decision_id LIMIT 1) THEN
    INSERT INTO assumptions (decision_id, description, status)
    VALUES (react_decision_id, 'React has strong community support and documentation', 'VALID');

    RAISE NOTICE 'Sample assumption inserted';
  END IF;
END $$;

-- Insert sample constraint
INSERT INTO constraints (name, description, rule_expression, is_immutable)
VALUES
  ('GDPR Compliance', 'All systems must comply with GDPR regulations', 'data.privacy == true', true),
  ('Budget Limit', 'Total infrastructure cost must not exceed $10,000/month', 'cost.monthly <= 10000', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- FUNCTIONS (Optional - for advanced features)
-- ============================================================================

-- Function to automatically update last_reviewed_at when health or lifecycle changes
CREATE OR REPLACE FUNCTION update_last_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.health != OLD.health OR NEW.lifecycle != OLD.lifecycle THEN
    NEW.last_reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_last_reviewed_at() IS 'Automatically updates last_reviewed_at when health or lifecycle changes';

-- Trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_last_reviewed_at ON decisions;
CREATE TRIGGER trigger_update_last_reviewed_at
  BEFORE UPDATE ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_last_reviewed_at();

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE 'DECIVUE database schema created successfully!';
  RAISE NOTICE 'Tables created: decisions, assumptions, constraints, decision_constraints, dependencies, evaluation_history';
  RAISE NOTICE 'Sample data inserted for testing';
END $$;
