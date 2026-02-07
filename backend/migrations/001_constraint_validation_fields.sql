-- Migration: Add Constraint Validation Fields
-- Phase 1: Constraint Validation Engine
--
-- This migration adds:
-- 1. Validation configuration fields to constraints table
-- 2. New constraint_violations table for tracking violations

BEGIN;

-- Add validation fields to constraints table
ALTER TABLE constraints
  ADD COLUMN IF NOT EXISTS validation_config JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS validation_failures INTEGER DEFAULT 0;

COMMENT ON COLUMN constraints.validation_config IS 'JSON configuration for validation rules. Example: {"type": "budget_threshold", "operator": "<=", "value": 100000, "field": "metadata.cost"}';
COMMENT ON COLUMN constraints.last_validated_at IS 'Timestamp of last validation attempt';
COMMENT ON COLUMN constraints.validation_failures IS 'Count of times this constraint has been violated';

-- Create constraint_violations table
CREATE TABLE IF NOT EXISTS constraint_violations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  constraint_id UUID NOT NULL REFERENCES constraints(id) ON DELETE CASCADE,
  violation_reason TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  CONSTRAINT fk_constraint_violation_decision FOREIGN KEY (decision_id) REFERENCES decisions(id) ON DELETE CASCADE,
  CONSTRAINT fk_constraint_violation_constraint FOREIGN KEY (constraint_id) REFERENCES constraints(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_constraint_violations_decision ON constraint_violations(decision_id);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_constraint ON constraint_violations(constraint_id);
CREATE INDEX IF NOT EXISTS idx_constraint_violations_unresolved ON constraint_violations(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_constraint_violations_detected_at ON constraint_violations(detected_at DESC);

-- Add comments for documentation
COMMENT ON TABLE constraint_violations IS 'Tracks violations of organizational constraints by decisions';
COMMENT ON COLUMN constraint_violations.violation_reason IS 'Human-readable explanation of why the constraint was violated';
COMMENT ON COLUMN constraint_violations.detected_at IS 'When the violation was first detected';
COMMENT ON COLUMN constraint_violations.resolved_at IS 'When the violation was resolved (null = unresolved)';
COMMENT ON COLUMN constraint_violations.metadata IS 'Additional context about the violation (e.g., expected vs actual values)';

COMMIT;

-- Verification queries (run manually after migration)
-- SELECT COUNT(*) FROM constraint_violations;
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'constraints' AND column_name IN ('validation_config', 'last_validated_at', 'validation_failures');
