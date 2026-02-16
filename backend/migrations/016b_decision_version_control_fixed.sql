-- ============================================================================
-- Migration 016b: Decision Version Control (Fixed RLS)
-- ============================================================================
-- Description: Complete version control system with proper RLS from the start
--              This replaces 016 and 017 with a single working migration
-- Created: 2026-02-16
-- Prerequisites: Requires migration 006 (organizations and users tables)
-- ============================================================================

-- ============================================================================
-- 0. VERIFY PREREQUISITES
-- ============================================================================

DO $$
BEGIN
  -- Check if organizations table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE EXCEPTION 'organizations table does not exist. Please run migration 006 first.';
  END IF;
  
  -- Check if users table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'users table does not exist. Please run migration 006 first.';
  END IF;
  
  -- Check if decisions.organization_id exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'organization_id'
  ) THEN
    RAISE EXCEPTION 'decisions.organization_id does not exist. Please run migration 006 first.';
  END IF;
  
  RAISE NOTICE 'Prerequisites verified. Proceeding with migration 016b...';
END $$;

-- ============================================================================
-- 1. ADD MODIFICATION TRACKING TO DECISIONS TABLE
-- ============================================================================

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE decisions 
SET modified_at = created_at,
    modified_by = created_by
WHERE modified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_modified_at ON decisions(modified_at DESC);

-- ============================================================================
-- 2. DECISION VERSIONS TABLE - WITH ORGANIZATION_ID
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Snapshot of decision fields
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  parameters JSONB DEFAULT '{}'::JSONB,
  lifecycle TEXT NOT NULL,
  health_signal INTEGER NOT NULL,
  
  -- Change metadata
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'field_updated', 'lifecycle_changed', 'manual_review')),
  change_summary TEXT,
  changed_fields JSONB DEFAULT '[]'::JSONB,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(decision_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_decision_versions_decision ON decision_versions(decision_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_decision_versions_organization ON decision_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_versions_changed_at ON decision_versions(changed_at DESC);

-- ============================================================================
-- 3. DECISION RELATION CHANGES TABLE - WITH ORGANIZATION_ID
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision_relation_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  relation_type TEXT NOT NULL CHECK (relation_type IN ('assumption', 'constraint', 'dependency')),
  relation_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('linked', 'unlinked')),
  relation_description TEXT,
  
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_decision_relation_changes_decision ON decision_relation_changes(decision_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_relation_changes_organization ON decision_relation_changes(organization_id);

-- ============================================================================
-- 4. ADD TRACKING COLUMNS TO EVALUATION_HISTORY
-- ============================================================================

ALTER TABLE evaluation_history
ADD COLUMN IF NOT EXISTS previous_health_signal INTEGER,
ADD COLUMN IF NOT EXISTS change_explanation TEXT,
ADD COLUMN IF NOT EXISTS triggered_by TEXT;

-- ============================================================================
-- 5. CREATE VERSION SNAPSHOT FUNCTION
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

-- ============================================================================
-- 6. CREATE RELATION CHANGE TRACKING FUNCTION
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
-- 7. CREATE HISTORY QUERY FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_decision_version_history(p_decision_id UUID)
RETURNS TABLE (
  id UUID,
  version_number INTEGER,
  title TEXT,
  description TEXT,
  category TEXT,
  parameters JSONB,
  lifecycle TEXT,
  health_signal INTEGER,
  change_type TEXT,
  change_summary TEXT,
  changed_fields JSONB,
  changed_by UUID,
  changed_at TIMESTAMPTZ,
  user_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dv.id,
    dv.version_number,
    dv.title,
    dv.description,
    dv.category,
    dv.parameters,
    dv.lifecycle,
    dv.health_signal,
    dv.change_type,
    dv.change_summary,
    dv.changed_fields,
    dv.changed_by,
    dv.changed_at,
    u.full_name AS user_name,
    u.email AS user_email
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  ORDER BY dv.version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_decision_relation_history(p_decision_id UUID)
RETURNS TABLE (
  id UUID,
  relation_type TEXT,
  relation_id UUID,
  action TEXT,
  relation_description TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ,
  reason TEXT,
  user_name TEXT,
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    drc.id,
    drc.relation_type,
    drc.relation_id,
    drc.action,
    drc.relation_description,
    drc.changed_by,
    drc.changed_at,
    drc.reason,
    u.full_name AS user_name,
    u.email AS user_email
  FROM decision_relation_changes drc
  LEFT JOIN users u ON drc.changed_by = u.id
  WHERE drc.decision_id = p_decision_id
  ORDER BY drc.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_decision_health_history(p_decision_id UUID)
RETURNS TABLE (
  id UUID,
  evaluated_at TIMESTAMPTZ,
  health_signal INTEGER,
  previous_health_signal INTEGER,
  lifecycle TEXT,
  invalidated_reason TEXT,
  change_explanation TEXT,
  triggered_by TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eh.id,
    eh.evaluated_at,
    eh.health_signal,
    eh.previous_health_signal,
    eh.lifecycle,
    eh.invalidated_reason,
    eh.change_explanation,
    eh.triggered_by
  FROM evaluation_history eh
  WHERE eh.decision_id = p_decision_id
  ORDER BY eh.evaluated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_decision_change_timeline(p_decision_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_time TIMESTAMPTZ,
  event_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT 
      dv.id AS event_id,
      'version' AS event_type,
      dv.changed_at AS event_time,
      jsonb_build_object(
        'version_number', dv.version_number,
        'change_type', dv.change_type,
        'change_summary', dv.change_summary,
        'changed_fields', dv.changed_fields,
        'changed_by', dv.changed_by,
        'user_name', u.full_name
      ) AS event_data
    FROM decision_versions dv
    LEFT JOIN users u ON dv.changed_by = u.id
    WHERE dv.decision_id = p_decision_id
    
    UNION ALL
    
    SELECT 
      drc.id AS event_id,
      'relation' AS event_type,
      drc.changed_at AS event_time,
      jsonb_build_object(
        'relation_type', drc.relation_type,
        'action', drc.action,
        'relation_description', drc.relation_description,
        'reason', drc.reason,
        'changed_by', drc.changed_by,
        'user_name', u.full_name
      ) AS event_data
    FROM decision_relation_changes drc
    LEFT JOIN users u ON drc.changed_by = u.id
    WHERE drc.decision_id = p_decision_id
    
    UNION ALL
    
    SELECT 
      eh.id AS event_id,
      'evaluation' AS event_type,
      eh.evaluated_at AS event_time,
      jsonb_build_object(
        'health_signal', eh.health_signal,
        'previous_health_signal', eh.previous_health_signal,
        'lifecycle', eh.lifecycle,
        'change_explanation', eh.change_explanation,
        'triggered_by', eh.triggered_by
      ) AS event_data
    FROM evaluation_history eh
    WHERE eh.decision_id = p_decision_id
  ) combined_events
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. ENABLE RLS WITH SIMPLE POLICIES
-- ============================================================================

ALTER TABLE decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_relation_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org scoped decision_versions"
ON decision_versions
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

CREATE POLICY "Org scoped decision_relation_changes"
ON decision_relation_changes
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 9. SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 016b completed successfully';
  RAISE NOTICE '   - Decision version control system enabled';
  RAISE NOTICE '   - RLS configured with direct organization_id (no recursion)';
  RAISE NOTICE '   - All tracking functions created';
END $$;
