-- ============================================================================
-- Quick Fix: Add organization_id to existing version control tables
-- ============================================================================
-- Run this if decision_versions and decision_relation_changes exist 
-- but don't have organization_id column
-- ============================================================================

-- Drop the problematic nested RLS policies first
DROP POLICY IF EXISTS "decision_versions_select_policy" ON decision_versions;
DROP POLICY IF EXISTS "decision_versions_insert_policy" ON decision_versions;
DROP POLICY IF EXISTS "decision_relation_changes_select_policy" ON decision_relation_changes;
DROP POLICY IF EXISTS "decision_relation_changes_insert_policy" ON decision_relation_changes;

-- Add organization_id columns if they don't exist
ALTER TABLE decision_versions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE decision_relation_changes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from decisions for existing records
UPDATE decision_versions dv
SET organization_id = d.organization_id
FROM decisions d
WHERE dv.decision_id = d.id
AND dv.organization_id IS NULL;

UPDATE decision_relation_changes drc
SET organization_id = d.organization_id
FROM decisions d
WHERE drc.decision_id = d.id
AND drc.organization_id IS NULL;

-- Make NOT NULL only if all records have been backfilled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM decision_versions WHERE organization_id IS NULL) THEN
    ALTER TABLE decision_versions ALTER COLUMN organization_id SET NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM decision_relation_changes WHERE organization_id IS NULL) THEN
    ALTER TABLE decision_relation_changes ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_decision_versions_organization ON decision_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_relation_changes_organization ON decision_relation_changes(organization_id);

-- Create SIMPLE RLS policies (no nested subqueries)
DROP POLICY IF EXISTS "Org scoped decision_versions" ON decision_versions;
CREATE POLICY "Org scoped decision_versions"
ON decision_versions
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org scoped decision_relation_changes" ON decision_relation_changes;
CREATE POLICY "Org scoped decision_relation_changes"
ON decision_relation_changes
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Update functions to include organization_id
CREATE OR REPLACE FUNCTION create_decision_version(
  p_decision_id UUID,
  p_change_type TEXT,
  p_change_summary TEXT,
  p_changed_fields TEXT[],
  p_changed_by UUID
) RETURNS UUID AS $$
DECLARE
  v_version_number INTEGER;
  v_decision RECORD;
  v_version_id UUID;
BEGIN
  SELECT * INTO v_decision FROM decisions WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decision % not found', p_decision_id;
  END IF;
  
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM decision_versions
  WHERE decision_id = p_decision_id;
  
  INSERT INTO decision_versions (
    decision_id, version_number, title, description, category, parameters,
    lifecycle, health_signal, change_type, change_summary, changed_fields,
    changed_by, changed_at, organization_id
  ) VALUES (
    p_decision_id, v_version_number, v_decision.title, v_decision.description,
    v_decision.category, v_decision.parameters, v_decision.lifecycle,
    v_decision.health_signal, p_change_type, p_change_summary,
    to_jsonb(p_changed_fields), p_changed_by, NOW(), v_decision.organization_id
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION track_relation_change(
  p_decision_id UUID,
  p_relation_type TEXT,
  p_relation_id UUID,
  p_action TEXT,
  p_relation_description TEXT,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_change_id UUID;
  v_organization_id UUID;
BEGIN
  SELECT organization_id INTO v_organization_id
  FROM decisions
  WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decision % not found', p_decision_id;
  END IF;
  
  INSERT INTO decision_relation_changes (
    decision_id, relation_type, relation_id, action,
    relation_description, changed_by, reason, organization_id
  ) VALUES (
    p_decision_id, p_relation_type, p_relation_id, p_action,
    p_relation_description, p_changed_by, p_reason, v_organization_id
  ) RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Version control tables fixed!';
  RAISE NOTICE '   - organization_id column added and backfilled';
  RAISE NOTICE '   - Simple RLS policies installed (no recursion)';
  RAISE NOTICE '   - Functions updated to set organization_id';
END $$;
