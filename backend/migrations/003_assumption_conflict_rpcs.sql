-- Migration: PostgreSQL RPC Functions for Assumption Conflicts
-- Provides efficient queries for conflict detection and resolution

-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS get_assumption_conflicts(UUID);
DROP FUNCTION IF EXISTS get_all_assumption_conflicts(BOOLEAN);
DROP FUNCTION IF EXISTS conflict_exists(UUID, UUID);

-- Function: Get all conflicts for a specific assumption
CREATE OR REPLACE FUNCTION get_assumption_conflicts(target_assumption_id UUID)
RETURNS TABLE (
  id UUID,
  assumption_a_id UUID,
  assumption_b_id UUID,
  conflict_type TEXT,
  confidence_score DECIMAL,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  resolution_notes TEXT,
  metadata JSONB,
  assumption_a JSONB,
  assumption_b JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.assumption_a_id,
    ac.assumption_b_id,
    ac.conflict_type,
    ac.confidence_score,
    ac.detected_at,
    ac.resolved_at,
    ac.resolution_action,
    ac.resolution_notes,
    ac.metadata,
    row_to_json(a1.*)::JSONB AS assumption_a,
    row_to_json(a2.*)::JSONB AS assumption_b
  FROM assumption_conflicts ac
  JOIN assumptions a1 ON ac.assumption_a_id = a1.id
  JOIN assumptions a2 ON ac.assumption_b_id = a2.id
  WHERE ac.assumption_a_id = target_assumption_id
     OR ac.assumption_b_id = target_assumption_id
  ORDER BY ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Get all unresolved conflicts across all assumptions
CREATE OR REPLACE FUNCTION get_all_assumption_conflicts(include_resolved BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  id UUID,
  assumption_a_id UUID,
  assumption_b_id UUID,
  conflict_type TEXT,
  confidence_score DECIMAL,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  resolution_notes TEXT,
  metadata JSONB,
  assumption_a JSONB,
  assumption_b JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ac.id,
    ac.assumption_a_id,
    ac.assumption_b_id,
    ac.conflict_type,
    ac.confidence_score,
    ac.detected_at,
    ac.resolved_at,
    ac.resolution_action,
    ac.resolution_notes,
    ac.metadata,
    row_to_json(a1.*)::JSONB AS assumption_a,
    row_to_json(a2.*)::JSONB AS assumption_b
  FROM assumption_conflicts ac
  JOIN assumptions a1 ON ac.assumption_a_id = a1.id
  JOIN assumptions a2 ON ac.assumption_b_id = a2.id
  WHERE include_resolved OR ac.resolved_at IS NULL
  ORDER BY ac.confidence_score DESC, ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Check if a specific conflict already exists
CREATE OR REPLACE FUNCTION conflict_exists(assumption_id_1 UUID, assumption_id_2 UUID)
RETURNS BOOLEAN AS $$
DECLARE
  min_id UUID;
  max_id UUID;
BEGIN
  -- Ensure ordering for unique constraint
  IF assumption_id_1 < assumption_id_2 THEN
    min_id := assumption_id_1;
    max_id := assumption_id_2;
  ELSE
    min_id := assumption_id_2;
    max_id := assumption_id_1;
  END IF;

  RETURN EXISTS(
    SELECT 1
    FROM assumption_conflicts
    WHERE assumption_a_id = min_id
      AND assumption_b_id = max_id
  );
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION get_assumption_conflicts IS 'Get all conflicts (resolved and unresolved) for a specific assumption';
COMMENT ON FUNCTION get_all_assumption_conflicts IS 'Get all conflicts across all assumptions, optionally filtering unresolved';
COMMENT ON FUNCTION conflict_exists IS 'Check if a conflict record already exists between two assumptions';
