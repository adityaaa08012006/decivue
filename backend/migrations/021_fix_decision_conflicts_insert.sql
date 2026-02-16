-- Migration: Fix Decision Conflicts Insert Stack Depth Issue
-- Create RPC function to insert decision conflicts with SECURITY DEFINER to bypass recursive RLS checks

-- Function to insert a new decision conflict (bypasses RLS to avoid stack depth errors)
CREATE OR REPLACE FUNCTION insert_decision_conflict(
  p_decision_a_id UUID,
  p_decision_b_id UUID,
  p_conflict_type TEXT,
  p_confidence_score DECIMAL,
  p_explanation TEXT,
  p_organization_id UUID,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflict_id UUID;
  v_min_id UUID;
  v_max_id UUID;
BEGIN
  -- Validate user belongs to the organization
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'User does not belong to the specified organization';
  END IF;

  -- Ensure proper ordering for unique constraint
  IF p_decision_a_id < p_decision_b_id THEN
    v_min_id := p_decision_a_id;
    v_max_id := p_decision_b_id;
  ELSE
    v_min_id := p_decision_b_id;
    v_max_id := p_decision_a_id;
  END IF;

  -- Insert the conflict
  INSERT INTO decision_conflicts (
    decision_a_id,
    decision_b_id,
    conflict_type,
    confidence_score,
    explanation,
    organization_id,
    metadata
  ) VALUES (
    v_min_id,
    v_max_id,
    p_conflict_type,
    p_confidence_score,
    p_explanation,
    p_organization_id,
    p_metadata
  )
  RETURNING id INTO v_conflict_id;

  RETURN v_conflict_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_decision_conflict TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION insert_decision_conflict IS 'Inserts a decision conflict with SECURITY DEFINER to bypass RLS and avoid stack depth errors from recursive foreign key checks';
