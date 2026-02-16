-- ============================================================================
-- Migration 026: Enhanced Review and Conflict Resolution Tracking
-- ============================================================================
-- Description: Add comprehensive tracking for:
--              - Reviews with comments
--              - Assumption conflict resolutions
--              - Decision conflict resolutions
--              - All events that change a decision's state
-- Created: 2026-02-16
-- Prerequisites: Requires migration 016b (version control), 019 (conflicts)
-- ============================================================================

-- ============================================================================
-- 1. CREATE DECISION REVIEWS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS decision_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('routine', 'conflict_resolution', 'expiry_check', 'manual')),
  review_comment TEXT, -- User's review notes/comments
  
  -- State before review
  previous_lifecycle TEXT,
  previous_health_signal INTEGER,
  
  -- State after review (if changed)
  new_lifecycle TEXT,
  new_health_signal INTEGER,
  
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB -- Additional context (e.g., conflicts resolved, assumptions addressed)
);

CREATE INDEX IF NOT EXISTS idx_decision_reviews_decision ON decision_reviews(decision_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_decision_reviews_organization ON decision_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_reviews_reviewer ON decision_reviews(reviewer_id);

-- ============================================================================
-- 2. ADD REVIEW COMMENT TO DECISION_VERSIONS
-- ============================================================================

ALTER TABLE decision_versions
ADD COLUMN IF NOT EXISTS review_comment TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::JSONB;

-- Update change_type to include new types
ALTER TABLE decision_versions
DROP CONSTRAINT IF EXISTS decision_versions_change_type_check;

ALTER TABLE decision_versions
ADD CONSTRAINT decision_versions_change_type_check
CHECK (change_type IN (
  'created',
  'field_updated',
  'lifecycle_changed',
  'manual_review',
  'assumption_conflict_resolved',
  'decision_conflict_resolved',
  'relation_added',
  'relation_removed'
));

-- ============================================================================
-- 3. TRACK CONFLICT RESOLUTION IN VERSION HISTORY
-- ============================================================================

-- Function to create version entry when assumption conflict is resolved
CREATE OR REPLACE FUNCTION track_assumption_conflict_resolution(
  p_conflict_id UUID,
  p_resolution_action TEXT,
  p_resolution_notes TEXT,
  p_resolved_by UUID
) RETURNS VOID AS $$
DECLARE
  v_conflict RECORD;
  v_decision_ids UUID[];
  v_decision_id UUID;
BEGIN
  -- Get conflict details with decision IDs
  SELECT ac.*, a1.decision_id as decision1_id, a2.decision_id as decision2_id
  INTO v_conflict
  FROM assumption_conflicts ac
  JOIN decision_assumptions da1 ON da1.assumption_id = ac.assumption1_id
  JOIN decision_assumptions da2 ON da2.assumption_id = ac.assumption2_id
  JOIN assumptions a1 ON a1.id = ac.assumption1_id
  JOIN assumptions a2 ON a2.id = ac.assumption2_id
  WHERE ac.id = p_conflict_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create version entries for affected decisions
  v_decision_ids := ARRAY[v_conflict.decision1_id, v_conflict.decision2_id];
  
  FOREACH v_decision_id IN ARRAY v_decision_ids
  LOOP
    IF v_decision_id IS NOT NULL THEN
      PERFORM create_decision_version(
        v_decision_id,
        'assumption_conflict_resolved',
        format('Assumption conflict resolved: %s', p_resolution_action),
        ARRAY[]::TEXT[],
        p_resolved_by
      );
      
      -- Update the version with resolution notes
      UPDATE decision_versions
      SET review_comment = p_resolution_notes,
          metadata = jsonb_build_object(
            'conflict_id', p_conflict_id,
            'conflict_type', v_conflict.conflict_type,
            'resolution_action', p_resolution_action,
            'assumption1_id', v_conflict.assumption1_id,
            'assumption2_id', v_conflict.assumption2_id
          )
      WHERE decision_id = v_decision_id
      AND id = (
        SELECT id FROM decision_versions
        WHERE decision_id = v_decision_id
        ORDER BY version_number DESC
        LIMIT 1
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create version entry when decision conflict is resolved
CREATE OR REPLACE FUNCTION track_decision_conflict_resolution(
  p_conflict_id UUID,
  p_resolution_action TEXT,
  p_resolution_notes TEXT,
  p_resolved_by UUID
) RETURNS VOID AS $$
DECLARE
  v_conflict RECORD;
  v_decision_ids UUID[];
  v_decision_id UUID;
BEGIN
  -- Get conflict details
  SELECT * INTO v_conflict
  FROM decision_conflicts
  WHERE id = p_conflict_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Create version entries for both decisions
  v_decision_ids := ARRAY[v_conflict.decision_a_id, v_conflict.decision_b_id];
  
  FOREACH v_decision_id IN ARRAY v_decision_ids
  LOOP
    PERFORM create_decision_version(
      v_decision_id,
      'decision_conflict_resolved',
      format('Decision conflict resolved: %s', p_resolution_action),
      ARRAY[]::TEXT[],
      p_resolved_by
    );
    
    -- Update the version with resolution notes
    UPDATE decision_versions
    SET review_comment = p_resolution_notes,
        metadata = jsonb_build_object(
          'conflict_id', p_conflict_id,
          'conflict_type', v_conflict.conflict_type,
          'conflict_severity_score', v_conflict.conflict_severity_score,
          'resolution_action', p_resolution_action,
          'other_decision_id', CASE 
            WHEN v_decision_id = v_conflict.decision_a_id THEN v_conflict.decision_b_id
            ELSE v_conflict.decision_a_id
          END
        )
    WHERE decision_id = v_decision_id
    AND id = (
      SELECT id FROM decision_versions
      WHERE decision_id = v_decision_id
      ORDER BY version_number DESC
      LIMIT 1
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. ENHANCED VERSION CREATION WITH REVIEW SUPPORT
-- ============================================================================

-- Update create_decision_version to support review comments
DROP FUNCTION IF EXISTS create_decision_version(UUID, TEXT, TEXT, TEXT[], UUID);

CREATE OR REPLACE FUNCTION create_decision_version(
  p_decision_id UUID,
  p_change_type TEXT,
  p_change_summary TEXT,
  p_changed_fields TEXT[],
  p_changed_by UUID,
  p_review_comment TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
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
    changed_by, changed_at, organization_id, review_comment, metadata
  ) VALUES (
    p_decision_id, v_version_number, v_decision.title, v_decision.description,
    v_decision.category, v_decision.parameters, v_decision.lifecycle,
    v_decision.health_signal, p_change_type, p_change_summary,
    to_jsonb(p_changed_fields), p_changed_by, NOW(), v_decision.organization_id,
    p_review_comment, p_metadata
  ) RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. UPDATE TIMELINE TO INCLUDE REVIEWS AND CONFLICTS
-- ============================================================================

DROP FUNCTION IF EXISTS get_decision_change_timeline(UUID);

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
    -- Version changes (includes reviews and conflict resolutions)
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
        'user_name', u.full_name,
        'review_comment', dv.review_comment,
        'metadata', dv.metadata
      ) AS event_data
    FROM decision_versions dv
    LEFT JOIN users u ON dv.changed_by = u.id
    WHERE dv.decision_id = p_decision_id
    
    UNION ALL
    
    -- Dedicated review entries (from decision_reviews table)
    SELECT 
      dr.id AS event_id,
      'review' AS event_type,
      dr.reviewed_at AS event_time,
      jsonb_build_object(
        'review_type', dr.review_type,
        'review_comment', dr.review_comment,
        'reviewer_id', dr.reviewer_id,
        'reviewer_name', u.full_name,
        'previous_lifecycle', dr.previous_lifecycle,
        'previous_health_signal', dr.previous_health_signal,
        'new_lifecycle', dr.new_lifecycle,
        'new_health_signal', dr.new_health_signal,
        'metadata', dr.metadata
      ) AS event_data
    FROM decision_reviews dr
    LEFT JOIN users u ON dr.reviewer_id = u.id
    WHERE dr.decision_id = p_decision_id
    
    UNION ALL
    
    -- Relation changes
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
    
    -- Evaluation history
    SELECT 
      eh.id AS event_id,
      'evaluation' AS event_type,
      eh.evaluated_at AS event_time,
      jsonb_build_object(
        'old_lifecycle', eh.old_lifecycle,
        'new_lifecycle', eh.new_lifecycle,
        'old_health_signal', eh.old_health_signal,
        'new_health_signal', eh.new_health_signal,
        'invalidated_reason', eh.invalidated_reason,
        'change_explanation', eh.change_explanation,
        'triggered_by', eh.triggered_by,
        'trace', eh.trace
      ) AS event_data
    FROM evaluation_history eh
    WHERE eh.decision_id = p_decision_id
  ) combined_events
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. ENABLE RLS ON DECISION_REVIEWS
-- ============================================================================

ALTER TABLE decision_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped decision_reviews" ON decision_reviews;

CREATE POLICY "Org scoped decision_reviews"
ON decision_reviews FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- 7. HELPER FUNCTIONS FOR REVIEWS
-- ============================================================================

-- Create a review entry
CREATE OR REPLACE FUNCTION create_decision_review(
  p_decision_id UUID,
  p_reviewer_id UUID,
  p_review_type TEXT,
  p_review_comment TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_review_id UUID;
  v_decision RECORD;
BEGIN
  -- Get current decision state
  SELECT * INTO v_decision FROM decisions WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Decision % not found', p_decision_id;
  END IF;
  
  -- Create review record
  INSERT INTO decision_reviews (
    decision_id, organization_id, reviewer_id, review_type, review_comment,
    previous_lifecycle, previous_health_signal, metadata
  ) VALUES (
    p_decision_id, v_decision.organization_id, p_reviewer_id, p_review_type,
    p_review_comment, v_decision.lifecycle, v_decision.health_signal, p_metadata
  ) RETURNING id INTO v_review_id;
  
  -- Also create a version entry for the review
  PERFORM create_decision_version(
    p_decision_id,
    'manual_review',
    'Decision reviewed',
    ARRAY[]::TEXT[],
    p_reviewer_id,
    p_review_comment,
    p_metadata
  );
  
  RETURN v_review_id;
END;
$$ LANGUAGE plpgsql;

-- Update review with post-review state (call after decision state changes)
CREATE OR REPLACE FUNCTION update_review_outcome(
  p_review_id UUID,
  p_new_lifecycle TEXT,
  p_new_health_signal INTEGER
) RETURNS VOID AS $$
BEGIN
  UPDATE decision_reviews
  SET new_lifecycle = p_new_lifecycle,
      new_health_signal = p_new_health_signal
  WHERE id = p_review_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 026 completed successfully';
  RAISE NOTICE '   - Created decision_reviews table for tracking review comments';
  RAISE NOTICE '   - Enhanced decision_versions with review_comment and metadata fields';
  RAISE NOTICE '   - Added conflict resolution tracking functions';
  RAISE NOTICE '   - Updated timeline to include all change events';
  RAISE NOTICE '   - Review history now fully integrated into version control';
END $$;
