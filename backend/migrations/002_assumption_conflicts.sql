-- Migration: Assumption Conflict Detection
-- Adds assumption_conflicts table and scope field to assumptions

-- Add scope field to assumptions table
ALTER TABLE assumptions
  ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('UNIVERSAL', 'DECISION_SPECIFIC')) DEFAULT 'UNIVERSAL';

-- Create assumption_conflicts table
CREATE TABLE IF NOT EXISTS assumption_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assumption_a_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  assumption_b_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('CONTRADICTORY', 'MUTUALLY_EXCLUSIVE', 'INCOMPATIBLE')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN ('VALIDATE_A', 'VALIDATE_B', 'MERGE', 'DEPRECATE_BOTH', 'KEEP_BOTH')),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(assumption_a_id, assumption_b_id),
  CHECK (assumption_a_id < assumption_b_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_assumption_a ON assumption_conflicts(assumption_a_id);
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_assumption_b ON assumption_conflicts(assumption_b_id);
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_unresolved ON assumption_conflicts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_confidence ON assumption_conflicts(confidence_score DESC);

-- Add comment for documentation
COMMENT ON TABLE assumption_conflicts IS 'Tracks detected conflicts between assumptions with confidence scoring and resolution tracking';
COMMENT ON COLUMN assumption_conflicts.conflict_type IS 'CONTRADICTORY: Direct contradiction, MUTUALLY_EXCLUSIVE: Cannot both be true, INCOMPATIBLE: Incompatible implications';
COMMENT ON COLUMN assumption_conflicts.confidence_score IS 'AI-generated confidence score 0.0-1.0 indicating likelihood of actual conflict';
COMMENT ON COLUMN assumption_conflicts.resolution_action IS 'How the conflict was resolved by the user';
