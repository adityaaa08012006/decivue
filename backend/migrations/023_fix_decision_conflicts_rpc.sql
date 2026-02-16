-- ============================================================================
-- Migration 023: Fix Decision Conflicts RPC Functions
-- ============================================================================
-- Description: Update RPC functions to avoid user_organization_id() calls
-- Created: 2026-02-16
-- Issue: RPC functions calling user_organization_id() cause stack depth errors
-- ============================================================================

-- Function to get all decision conflicts with decision details
CREATE OR REPLACE FUNCTION get_all_decision_conflicts(include_resolved BOOLEAN DEFAULT FALSE)
RETURNS TABLE (
  id UUID,
  decision_a_id UUID,
  decision_b_id UUID,
  conflict_type TEXT,
  confidence_score DECIMAL,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  resolution_notes TEXT,
  explanation TEXT,
  organization_id UUID,
  metadata JSONB,
  decision_a JSONB,
  decision_b JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get the user's organization_id directly
  SELECT u.organization_id INTO user_org_id
  FROM users u
  WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT 
    dc.id,
    dc.decision_a_id,
    dc.decision_b_id,
    dc.conflict_type,
    dc.confidence_score,
    dc.detected_at,
    dc.resolved_at,
    dc.resolution_action,
    dc.resolution_notes,
    dc.explanation,
    dc.organization_id,
    dc.metadata,
    jsonb_build_object(
      'id', da.id,
      'title', da.title,
      'description', da.description,
      'lifecycle', da.lifecycle,
      'created_at', da.created_at
    ) AS decision_a,
    jsonb_build_object(
      'id', db.id,
      'title', db.title,
      'description', db.description,
      'lifecycle', db.lifecycle,
      'created_at', db.created_at
    ) AS decision_b
  FROM decision_conflicts dc
  INNER JOIN decisions da ON dc.decision_a_id = da.id
  INNER JOIN decisions db ON dc.decision_b_id = db.id
  WHERE 
    dc.organization_id = user_org_id
    AND (include_resolved OR dc.resolved_at IS NULL)
  ORDER BY dc.confidence_score DESC, dc.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get conflicts for a specific decision
CREATE OR REPLACE FUNCTION get_decision_conflicts(target_decision_id UUID)
RETURNS TABLE (
  id UUID,
  decision_a_id UUID,
  decision_b_id UUID,
  conflict_type TEXT,
  confidence_score DECIMAL,
  detected_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT,
  resolution_notes TEXT,
  explanation TEXT,
  organization_id UUID,
  metadata JSONB,
  other_decision JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get the user's organization_id directly
  SELECT u.organization_id INTO user_org_id
  FROM users u
  WHERE u.id = auth.uid();

  RETURN QUERY
  SELECT 
    dc.id,
    dc.decision_a_id,
    dc.decision_b_id,
    dc.conflict_type,
    dc.confidence_score,
    dc.detected_at,
    dc.resolved_at,
    dc.resolution_action,
    dc.resolution_notes,
    dc.explanation,
    dc.organization_id,
    dc.metadata,
    CASE 
      WHEN dc.decision_a_id = target_decision_id THEN
        jsonb_build_object(
          'id', db.id,
          'title', db.title,
          'description', db.description,
          'lifecycle', db.lifecycle,
          'created_at', db.created_at
        )
      ELSE
        jsonb_build_object(
          'id', da.id,
          'title', da.title,
          'description', da.description,
          'lifecycle', da.lifecycle,
          'created_at', da.created_at
        )
    END AS other_decision
  FROM decision_conflicts dc
  INNER JOIN decisions da ON dc.decision_a_id = da.id
  INNER JOIN decisions db ON dc.decision_b_id = db.id
  WHERE 
    (dc.decision_a_id = target_decision_id OR dc.decision_b_id = target_decision_id)
    AND dc.organization_id = user_org_id
  ORDER BY dc.confidence_score DESC, dc.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a conflict exists between two decisions
CREATE OR REPLACE FUNCTION decision_conflict_exists(decision_id_1 UUID, decision_id_2 UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  min_id UUID;
  max_id UUID;
  user_org_id UUID;
BEGIN
  -- Get the user's organization_id directly
  SELECT u.organization_id INTO user_org_id
  FROM users u
  WHERE u.id = auth.uid();

  -- Ensure proper ordering
  IF decision_id_1 < decision_id_2 THEN
    min_id := decision_id_1;
    max_id := decision_id_2;
  ELSE
    min_id := decision_id_2;
    max_id := decision_id_1;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM decision_conflicts
    WHERE decision_a_id = min_id 
      AND decision_b_id = max_id
      AND resolved_at IS NULL
      AND organization_id = user_org_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FIX ASSUMPTION CONFLICTS RPC FUNCTIONS
-- ============================================================================

-- Function to get all assumption conflicts
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
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get the user's organization_id directly
  SELECT u.organization_id INTO user_org_id
  FROM users u
  WHERE u.id = auth.uid();

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
  WHERE ac.organization_id = user_org_id
    AND (include_resolved OR ac.resolved_at IS NULL)
  ORDER BY ac.confidence_score DESC, ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get assumption conflicts for a specific assumption
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
  related_assumption JSONB
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get the user's organization_id directly
  SELECT u.organization_id INTO user_org_id
  FROM users u
  WHERE u.id = auth.uid();

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
    CASE
      WHEN ac.assumption_a_id = target_assumption_id THEN row_to_json(a2.*)::JSONB
      ELSE row_to_json(a1.*)::JSONB
    END AS related_assumption
  FROM assumption_conflicts ac
  JOIN assumptions a1 ON ac.assumption_a_id = a1.id
  JOIN assumptions a2 ON ac.assumption_b_id = a2.id
  WHERE ac.organization_id = user_org_id
    AND (ac.assumption_a_id = target_assumption_id OR ac.assumption_b_id = target_assumption_id)
  ORDER BY ac.confidence_score DESC, ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 023 completed successfully';
  RAISE NOTICE '   - Fixed decision conflict RPC functions to avoid user_organization_id()';
  RAISE NOTICE '   - Fixed assumption conflict RPC functions to avoid user_organization_id()';
  RAISE NOTICE '   - Functions updated: get_all_decision_conflicts, get_decision_conflicts,';
  RAISE NOTICE '     decision_conflict_exists, get_all_assumption_conflicts, get_assumption_conflicts';
END $$;
