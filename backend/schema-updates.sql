-- Schema updates for Universal vs Decision-Specific Assumptions
-- Run this in Supabase SQL Editor after the main schema

-- Add scope column to assumptions table to differentiate universal vs decision-specific
ALTER TABLE assumptions ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'DECISION_SPECIFIC' 
  CHECK (scope IN ('UNIVERSAL', 'DECISION_SPECIFIC'));

COMMENT ON COLUMN assumptions.scope IS 'UNIVERSAL = organizational rules applied to all decisions; DECISION_SPECIFIC = tied to specific decisions';

-- Add index for universal assumptions
CREATE INDEX IF NOT EXISTS idx_assumptions_scope ON assumptions(scope);

-- Create assumption conflicts table to track contradictions
CREATE TABLE IF NOT EXISTS assumption_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assumption_a_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  assumption_b_id UUID NOT NULL REFERENCES assumptions(id) ON DELETE CASCADE,
  conflict_reason TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  CHECK (assumption_a_id < assumption_b_id), -- Prevent duplicate pairs
  UNIQUE(assumption_a_id, assumption_b_id)
);

COMMENT ON TABLE assumption_conflicts IS 'Tracks contradictory assumptions that invalidate each other';

-- Indexes for conflict lookups
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_unresolved ON assumption_conflicts(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_assumption_a ON assumption_conflicts(assumption_a_id);
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_assumption_b ON assumption_conflicts(assumption_b_id);

-- Function to check if assumption is involved in any conflicts
CREATE OR REPLACE FUNCTION get_assumption_conflicts(p_assumption_id UUID)
RETURNS TABLE (
  conflict_id UUID,
  conflicting_assumption_id UUID,
  conflicting_description TEXT,
  conflict_reason TEXT,
  detected_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ac.id,
    CASE 
      WHEN ac.assumption_a_id = p_assumption_id THEN ac.assumption_b_id
      ELSE ac.assumption_a_id
    END,
    CASE 
      WHEN ac.assumption_a_id = p_assumption_id THEN a2.description
      ELSE a1.description
    END,
    ac.conflict_reason,
    ac.detected_at
  FROM assumption_conflicts ac
  LEFT JOIN assumptions a1 ON a1.id = ac.assumption_a_id
  LEFT JOIN assumptions a2 ON a2.id = ac.assumption_b_id
  WHERE (ac.assumption_a_id = p_assumption_id OR ac.assumption_b_id = p_assumption_id)
    AND ac.resolved = false;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_assumption_conflicts IS 'Returns all unresolved conflicts for a given assumption';
