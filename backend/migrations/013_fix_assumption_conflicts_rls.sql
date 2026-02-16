-- =====================================================
-- FIX ASSUMPTION CONFLICTS RLS
-- =====================================================
-- This migration fixes the RLS issue with assumption_conflicts
-- by adding organization_id and simplifying the policy
-- =====================================================

-- Step 1: Add organization_id to assumption_conflicts table
ALTER TABLE assumption_conflicts
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Step 2: Populate organization_id from assumption_a (all conflicts should be within same org)
UPDATE assumption_conflicts ac
SET organization_id = a.organization_id
FROM assumptions a
WHERE ac.assumption_a_id = a.id
AND ac.organization_id IS NULL;

-- Step 3: Make organization_id NOT NULL
ALTER TABLE assumption_conflicts
ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_org_id ON assumption_conflicts(organization_id);

-- Step 5: Drop and recreate RLS policy with simpler logic
DROP POLICY IF EXISTS "Org scoped assumption_conflicts" ON assumption_conflicts;

CREATE POLICY "Org scoped assumption_conflicts"
ON assumption_conflicts FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Step 6: Update the get_all_assumption_conflicts function to use SECURITY DEFINER
-- This allows the function to bypass RLS when joining, relying instead on the
-- organization_id filter in the WHERE clause
DROP FUNCTION IF EXISTS get_all_assumption_conflicts(BOOLEAN);

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
  WHERE ac.organization_id = public.user_organization_id()
    AND (include_resolved OR ac.resolved_at IS NULL)
  ORDER BY ac.confidence_score DESC, ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Update the get_assumption_conflicts function
DROP FUNCTION IF EXISTS get_assumption_conflicts(UUID);

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
    CASE
      WHEN ac.assumption_a_id = target_assumption_id THEN row_to_json(a2.*)::JSONB
      ELSE row_to_json(a1.*)::JSONB
    END AS related_assumption
  FROM assumption_conflicts ac
  JOIN assumptions a1 ON ac.assumption_a_id = a1.id
  JOIN assumptions a2 ON ac.assumption_b_id = a2.id
  WHERE ac.organization_id = public.user_organization_id()
    AND (ac.assumption_a_id = target_assumption_id OR ac.assumption_b_id = target_assumption_id)
  ORDER BY ac.confidence_score DESC, ac.detected_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_all_assumption_conflicts(BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_assumption_conflicts(UUID) TO authenticated;

-- Verification query
DO $$
DECLARE
  conflict_count INTEGER;
  org_count INTEGER;
BEGIN
  -- Count conflicts
  SELECT COUNT(*) INTO conflict_count FROM assumption_conflicts;
  
  -- Count orgs with conflicts
  SELECT COUNT(DISTINCT organization_id) INTO org_count FROM assumption_conflicts;
  
  RAISE NOTICE 'Migration 013 complete:';
  RAISE NOTICE '  - Total assumption conflicts: %', conflict_count;
  RAISE NOTICE '  - Organizations with conflicts: %', org_count;
  RAISE NOTICE '  - RLS policy updated to use organization_id directly';
  RAISE NOTICE '  - RPC functions updated with SECURITY DEFINER';
END $$;
