-- Migration: Decision Conflict Detection
-- Adds decision_conflicts table and related RPC functions for detecting contradictions between decisions

-- Create decision_conflicts table
CREATE TABLE IF NOT EXISTS decision_conflicts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_a_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  decision_b_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('CONTRADICTORY', 'RESOURCE_COMPETITION', 'OBJECTIVE_UNDERMINING', 'PREMISE_INVALIDATION', 'MUTUALLY_EXCLUSIVE')),
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_action TEXT CHECK (resolution_action IN ('PRIORITIZE_A', 'PRIORITIZE_B', 'MODIFY_BOTH', 'DEPRECATE_BOTH', 'KEEP_BOTH')),
  resolution_notes TEXT,
  explanation TEXT NOT NULL, -- Natural language explanation of the conflict
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  UNIQUE(decision_a_id, decision_b_id),
  CHECK (decision_a_id < decision_b_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_decision_conflicts_decision_a ON decision_conflicts(decision_a_id);
CREATE INDEX IF NOT EXISTS idx_decision_conflicts_decision_b ON decision_conflicts(decision_b_id);
CREATE INDEX IF NOT EXISTS idx_decision_conflicts_org_id ON decision_conflicts(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_conflicts_unresolved ON decision_conflicts(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_decision_conflicts_confidence ON decision_conflicts(confidence_score DESC);

-- Add comment for documentation
COMMENT ON TABLE decision_conflicts IS 'Tracks detected conflicts between decisions with semantic analysis and resolution tracking';
COMMENT ON COLUMN decision_conflicts.conflict_type IS 'CONTRADICTORY: Direct contradiction, RESOURCE_COMPETITION: Competing for resources, OBJECTIVE_UNDERMINING: One undermines the other, PREMISE_INVALIDATION: Newer invalidates older premise, MUTUALLY_EXCLUSIVE: Cannot both exist';
COMMENT ON COLUMN decision_conflicts.confidence_score IS 'AI-generated confidence score 0.0-1.0 indicating likelihood of actual conflict';
COMMENT ON COLUMN decision_conflicts.explanation IS 'Natural language explanation of why these decisions conflict';
COMMENT ON COLUMN decision_conflicts.resolution_action IS 'How the conflict was resolved by the user';

-- Enable RLS
ALTER TABLE decision_conflicts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for organization scoping
DROP POLICY IF EXISTS "Org scoped decision_conflicts" ON decision_conflicts;
CREATE POLICY "Org scoped decision_conflicts"
ON decision_conflicts FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

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
BEGIN
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
    dc.organization_id = public.user_organization_id()
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
BEGIN
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
    AND dc.organization_id = public.user_organization_id()
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
BEGIN
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
      AND organization_id = public.user_organization_id()
  );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON decision_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_decision_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION get_decision_conflicts TO authenticated;
GRANT EXECUTE ON FUNCTION decision_conflict_exists TO authenticated;
