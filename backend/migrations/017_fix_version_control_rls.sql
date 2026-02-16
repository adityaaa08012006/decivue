-- ============================================================================
-- Migration 017: Fix Decision Version Control RLS to Prevent Stack Depth Errors
-- ============================================================================
-- Description: Add organization_id to version control tables and simplify RLS policies
--              to avoid recursive subqueries that cause "stack depth limit exceeded"
-- Created: 2026-02-16
-- ============================================================================

-- ============================================================================
-- 1. ADD ORGANIZATION_ID TO VERSION CONTROL TABLES
-- ============================================================================

-- Add organization_id to decision_versions
ALTER TABLE decision_versions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Add organization_id to decision_relation_changes
ALTER TABLE decision_relation_changes
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ============================================================================
-- 2. BACKFILL ORGANIZATION_ID FROM DECISIONS
-- ============================================================================

-- Backfill decision_versions.organization_id
UPDATE decision_versions dv
SET organization_id = d.organization_id
FROM decisions d
WHERE dv.decision_id = d.id
AND dv.organization_id IS NULL;

-- Backfill decision_relation_changes.organization_id
UPDATE decision_relation_changes drc
SET organization_id = d.organization_id
FROM decisions d
WHERE drc.decision_id = d.id
AND drc.organization_id IS NULL;

-- ============================================================================
-- 3. MAKE ORGANIZATION_ID NOT NULL AND ADD INDEXES
-- ============================================================================

ALTER TABLE decision_versions
ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE decision_relation_changes
ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_decision_versions_organization ON decision_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_relation_changes_organization ON decision_relation_changes(organization_id);

-- ============================================================================
-- 4. DROP OLD RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "decision_versions_select_policy" ON decision_versions;
DROP POLICY IF EXISTS "decision_versions_insert_policy" ON decision_versions;
DROP POLICY IF EXISTS "decision_relation_changes_select_policy" ON decision_relation_changes;
DROP POLICY IF EXISTS "decision_relation_changes_insert_policy" ON decision_relation_changes;

-- ============================================================================
-- 5. CREATE SIMPLIFIED RLS POLICIES USING DIRECT ORGANIZATION_ID
-- ============================================================================

-- Policies for decision_versions
CREATE POLICY "Org scoped decision_versions"
ON decision_versions
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Policies for decision_relation_changes
CREATE POLICY "Org scoped decision_relation_changes"
ON decision_relation_changes
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 6. UPDATE CREATE_DECISION_VERSION FUNCTION TO SET ORGANIZATION_ID
-- ============================================================================

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
  -- Get current decision state
  SELECT * INTO v_decision FROM decisions WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decision % not found', p_decision_id;
  END IF;
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 
  INTO v_version_number
  FROM decision_versions
  WHERE decision_id = p_decision_id;
  
  -- Create version snapshot with organization_id
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

-- ============================================================================
-- 7. UPDATE TRACK_RELATION_CHANGE FUNCTION TO SET ORGANIZATION_ID
-- ============================================================================

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
  -- Get organization_id from decision
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

-- ============================================================================
-- 8. SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 017 completed successfully';
  RAISE NOTICE '   - Added organization_id to decision_versions and decision_relation_changes';
  RAISE NOTICE '   - Simplified RLS policies to prevent stack depth errors';
  RAISE NOTICE '   - Updated functions to set organization_id automatically';
END $$;
