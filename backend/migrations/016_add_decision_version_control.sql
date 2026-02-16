-- ============================================================================
-- Migration 016: Decision Version Control & Change Tracking
-- ============================================================================
-- Description: Complete version control system for decisions including:
--              - Field change tracking (title, description, category, etc.)
--              - Relationship tracking (assumptions, constraints, dependencies)
--              - Health signal drop explanations
--              - User attribution for all changes
-- Created: 2026-02-16
-- ============================================================================

-- ============================================================================
-- 1. ADD MODIFICATION TRACKING TO DECISIONS TABLE
-- ============================================================================

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS modified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Set initial values for existing decisions
UPDATE decisions 
SET modified_at = created_at,
    modified_by = created_by
WHERE modified_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_decisions_modified_at ON decisions(modified_at DESC);

COMMENT ON COLUMN decisions.modified_at IS 'Timestamp of last modification to decision fields';
COMMENT ON COLUMN decisions.modified_by IS 'User who last modified this decision';

-- ============================================================================
-- 2. DECISION VERSIONS TABLE - Snapshot all field changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of decision fields at this version
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  parameters JSONB DEFAULT '{}'::JSONB,
  lifecycle TEXT NOT NULL,
  health_signal INTEGER NOT NULL,
  
  -- Change metadata
  change_type TEXT NOT NULL CHECK (change_type IN ('created', 'field_updated', 'lifecycle_changed', 'manual_review')),
  change_summary TEXT, -- Human-readable summary of what changed
  changed_fields JSONB, -- Array of field names that changed: ["title", "description"]
  
  -- User attribution
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional context
  metadata JSONB DEFAULT '{}'::JSONB,
  
  UNIQUE(decision_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_decision_versions_decision ON decision_versions(decision_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_decision_versions_changed_at ON decision_versions(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_versions_changed_by ON decision_versions(changed_by);

COMMENT ON TABLE decision_versions IS 'Complete version history of decision field changes';
COMMENT ON COLUMN decision_versions.version_number IS 'Sequential version number starting from 1';
COMMENT ON COLUMN decision_versions.change_type IS 'Type of change: created | field_updated | lifecycle_changed | manual_review';
COMMENT ON COLUMN decision_versions.changed_fields IS 'JSON array of field names that changed in this version';

-- ============================================================================
-- 3. DECISION RELATION CHANGES - Track assumption/constraint/dependency links
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision_relation_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  
  -- What type of relationship changed
  relation_type TEXT NOT NULL CHECK (relation_type IN ('assumption', 'constraint', 'dependency')),
  relation_id UUID NOT NULL, -- ID of the assumption/constraint/dependency
  
  -- What happened
  action TEXT NOT NULL CHECK (action IN ('linked', 'unlinked')),
  
  -- Related entity details (for display without joins)
  relation_description TEXT, -- Description of the assumption/constraint/dependency
  
  -- User attribution
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Additional context
  reason TEXT, -- Why was this relation added/removed
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_relation_changes_decision ON decision_relation_changes(decision_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_relation_changes_type ON decision_relation_changes(relation_type, action);
CREATE INDEX IF NOT EXISTS idx_relation_changes_relation ON decision_relation_changes(relation_type, relation_id);

COMMENT ON TABLE decision_relation_changes IS 'Tracks when assumptions, constraints, and dependencies are linked or unlinked from decisions';
COMMENT ON COLUMN decision_relation_changes.relation_type IS 'Type: assumption | constraint | dependency';
COMMENT ON COLUMN decision_relation_changes.action IS 'Action: linked | unlinked';

-- ============================================================================
-- 4. ENHANCE EVALUATION HISTORY WITH CHANGE EXPLANATIONS
-- ============================================================================

-- Add change explanation column to evaluation_history
ALTER TABLE evaluation_history
ADD COLUMN IF NOT EXISTS change_explanation TEXT,
ADD COLUMN IF NOT EXISTS triggered_by TEXT; -- 'automatic' | 'manual_review' | 'assumption_change' | 'constraint_change'

COMMENT ON COLUMN evaluation_history.change_explanation IS 'Human-readable explanation of why health/lifecycle changed';
COMMENT ON COLUMN evaluation_history.triggered_by IS 'What triggered this evaluation: automatic | manual_review | assumption_change | constraint_change';

-- ============================================================================
-- 5. FUNCTIONS TO CREATE VERSION SNAPSHOTS
-- ============================================================================

-- Function to create a decision version snapshot
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
  
  -- Create version snapshot
  INSERT INTO decision_versions (
    decision_id, version_number, title, description, category, parameters,
    lifecycle, health_signal, change_type, change_summary, changed_fields,
    changed_by, changed_at
  ) VALUES (
    p_decision_id, v_version_number, v_decision.title, v_decision.description,
    v_decision.category, v_decision.parameters, v_decision.lifecycle,
    v_decision.health_signal, p_change_type, p_change_summary,
    to_jsonb(p_changed_fields), p_changed_by, NOW()
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- Function to track relation changes
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
BEGIN
  INSERT INTO decision_relation_changes (
    decision_id, relation_type, relation_id, action,
    relation_description, changed_by, reason
  ) VALUES (
    p_decision_id, p_relation_type, p_relation_id, p_action,
    p_relation_description, p_changed_by, p_reason
  ) RETURNING id INTO v_change_id;
  
  RETURN v_change_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. RPC FUNCTIONS FOR FRONTEND
-- ============================================================================

-- Get complete version history for a decision
CREATE OR REPLACE FUNCTION get_decision_version_history(p_decision_id UUID)
RETURNS TABLE (
  version_id UUID,
  version_number INTEGER,
  change_type TEXT,
  change_summary TEXT,
  changed_fields JSONB,
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  category TEXT,
  lifecycle TEXT,
  health_signal INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dv.id,
    dv.version_number,
    dv.change_type,
    dv.change_summary,
    dv.changed_fields,
    u.email,
    dv.changed_at,
    dv.title,
    dv.description,
    dv.category,
    dv.lifecycle,
    dv.health_signal
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  ORDER BY dv.version_number DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get relation changes for a decision
CREATE OR REPLACE FUNCTION get_decision_relation_history(p_decision_id UUID)
RETURNS TABLE (
  change_id UUID,
  relation_type TEXT,
  relation_id UUID,
  action TEXT,
  relation_description TEXT,
  changed_by_email TEXT,
  changed_at TIMESTAMPTZ,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    drc.id,
    drc.relation_type,
    drc.relation_id,
    drc.action,
    drc.relation_description,
    u.email,
    drc.changed_at,
    drc.reason
  FROM decision_relation_changes drc
  LEFT JOIN users u ON drc.changed_by = u.id
  WHERE drc.decision_id = p_decision_id
  ORDER BY drc.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get health history with explanations (combines evaluation_history)
CREATE OR REPLACE FUNCTION get_decision_health_history(p_decision_id UUID)
RETURNS TABLE (
  evaluation_id UUID,
  old_lifecycle TEXT,
  new_lifecycle TEXT,
  old_health_signal INTEGER,
  new_health_signal INTEGER,
  health_change INTEGER,
  change_explanation TEXT,
  triggered_by TEXT,
  trace JSONB,
  evaluated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eh.id,
    eh.old_lifecycle,
    eh.new_lifecycle,
    eh.old_health_signal,
    eh.new_health_signal,
    (eh.new_health_signal - eh.old_health_signal) as health_change,
    eh.change_explanation,
    eh.triggered_by,
    eh.trace,
    eh.evaluated_at
  FROM evaluation_history eh
  WHERE eh.decision_id = p_decision_id
  ORDER BY eh.evaluated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get comprehensive change timeline (combines all history)
CREATE OR REPLACE FUNCTION get_decision_change_timeline(p_decision_id UUID)
RETURNS TABLE (
  event_type TEXT,
  event_id UUID,
  event_time TIMESTAMPTZ,
  changed_by_email TEXT,
  summary TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Field version changes
  SELECT 
    'field_change'::TEXT,
    dv.id,
    dv.changed_at,
    u.email,
    dv.change_summary,
    jsonb_build_object(
      'version_number', dv.version_number,
      'change_type', dv.change_type,
      'changed_fields', dv.changed_fields,
      'lifecycle', dv.lifecycle,
      'health_signal', dv.health_signal
    )
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  
  UNION ALL
  
  -- Relation changes
  SELECT
    'relation_change'::TEXT,
    drc.id,
    drc.changed_at,
    u.email,
    CASE 
      WHEN drc.action = 'linked' THEN 'Linked ' || drc.relation_type || ': ' || COALESCE(drc.relation_description, '')
      ELSE 'Unlinked ' || drc.relation_type || ': ' || COALESCE(drc.relation_description, '')
    END,
    jsonb_build_object(
      'relation_type', drc.relation_type,
      'action', drc.action,
      'relation_id', drc.relation_id,
      'reason', drc.reason
    )
  FROM decision_relation_changes drc
  LEFT JOIN users u ON drc.changed_by = u.id
  WHERE drc.decision_id = p_decision_id
  
  UNION ALL
  
  -- Evaluation/health changes
  SELECT
    'health_change'::TEXT,
    eh.id,
    eh.evaluated_at,
    NULL::TEXT,
    COALESCE(eh.change_explanation, 
      'Health changed: ' || eh.old_health_signal || '% → ' || eh.new_health_signal || '%'
    ),
    jsonb_build_object(
      'old_lifecycle', eh.old_lifecycle,
      'new_lifecycle', eh.new_lifecycle,
      'old_health_signal', eh.old_health_signal,
      'new_health_signal', eh.new_health_signal,
      'triggered_by', eh.triggered_by
    )
  FROM evaluation_history eh
  WHERE eh.decision_id = p_decision_id
  
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_relation_changes ENABLE ROW LEVEL SECURITY;

-- Policies for decision_versions (org-scoped through decision)
CREATE POLICY "decision_versions_select_policy" ON decision_versions
FOR SELECT USING (
  decision_id IN (
    SELECT id FROM decisions WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "decision_versions_insert_policy" ON decision_versions
FOR INSERT WITH CHECK (
  decision_id IN (
    SELECT id FROM decisions WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- Policies for decision_relation_changes (org-scoped through decision)
CREATE POLICY "decision_relation_changes_select_policy" ON decision_relation_changes
FOR SELECT USING (
  decision_id IN (
    SELECT id FROM decisions WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "decision_relation_changes_insert_policy" ON decision_relation_changes
FOR INSERT WITH CHECK (
  decision_id IN (
    SELECT id FROM decisions WHERE organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
);

-- ============================================================================
-- 8. CREATE INITIAL VERSIONS FOR EXISTING DECISIONS
-- ============================================================================

DO $$
DECLARE
  decision_record RECORD;
BEGIN
  FOR decision_record IN SELECT * FROM decisions LOOP
    PERFORM create_decision_version(
      decision_record.id,
      'created',
      'Initial version (backfilled)',
      ARRAY[]::TEXT[],
      decision_record.created_by
    );
  END LOOP;
  
  RAISE NOTICE 'Created initial versions for % decisions', (SELECT COUNT(*) FROM decisions);
  RAISE NOTICE 'Migration 016 completed: Decision version control system enabled';
END $$;
