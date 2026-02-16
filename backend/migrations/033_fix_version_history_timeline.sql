-- ============================================================================
-- Migration 033: Fix Version History Timeline
-- ============================================================================
-- Description: Fix two issues with version history:
--              1. Add 'retirement' to allowed change types
--              2. Include governance events (lock/unlock) in timeline view
-- Created: 2026-02-17
-- ============================================================================

-- ============================================================================
-- 1. ADD 'RETIREMENT' TO ALLOWED CHANGE TYPES
-- ============================================================================

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
  'relation_removed',
  'retirement',
  'deprecation',
  'governance_lock',
  'governance_unlock',
  'edit_requested',
  'edit_approved',
  'edit_rejected'
));

COMMENT ON CONSTRAINT decision_versions_change_type_check ON decision_versions IS 
  'Valid change types: created, field_updated, lifecycle_changed, manual_review, assumption_conflict_resolved, decision_conflict_resolved, relation_added, relation_removed, retirement, deprecation, governance_lock, governance_unlock, edit_requested, edit_approved, edit_rejected';

-- ============================================================================
-- 2. UPDATE TIMELINE FUNCTION TO INCLUDE GOVERNANCE EVENTS
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
    -- Version changes (includes reviews, conflict resolutions, and retirements)
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
    
    -- Governance events (lock/unlock, edit requests) from governance_audit_log
    SELECT 
      gal.id AS event_id,
      'version' AS event_type,
      gal.created_at AS event_time,
      jsonb_build_object(
        'version_number', NULL,
        'change_type', CASE 
          WHEN gal.action = 'decision_locked' THEN 'governance_lock'
          WHEN gal.action = 'decision_unlocked' THEN 'governance_unlock'
          WHEN gal.action = 'edit_requested' THEN 'edit_requested'
          WHEN gal.action = 'edit_approved' THEN 'edit_approved'
          WHEN gal.action = 'edit_rejected' THEN 'edit_rejected'
          ELSE gal.action
        END,
        'change_summary', CASE 
          WHEN gal.action = 'decision_locked' THEN 'Decision locked by team lead'
          WHEN gal.action = 'decision_unlocked' THEN 'Decision unlocked by team lead'
          WHEN gal.action = 'edit_requested' THEN 'Edit request submitted for approval'
          WHEN gal.action = 'edit_approved' THEN 'Edit request approved by team lead'
          WHEN gal.action = 'edit_rejected' THEN 'Edit request rejected by team lead'
          ELSE gal.justification
        END,
        'changed_fields', jsonb_build_object(
          'action', gal.action,
          'justification', gal.justification,
          'proposed_changes', gal.new_state,
          'approved_by', gal.approved_by,
          'resolved_at', gal.resolved_at
        ),
        'changed_by', COALESCE(gal.approved_by, gal.requested_by),
        'user_name', COALESCE(u_approver.full_name, u_requester.full_name),
        'review_comment', gal.justification,
        'metadata', gal.metadata
      ) AS event_data
    FROM governance_audit_log gal
    LEFT JOIN users u_approver ON gal.approved_by = u_approver.id
    LEFT JOIN users u_requester ON gal.requested_by = u_requester.id
    WHERE gal.decision_id = p_decision_id
      AND gal.action IN ('decision_locked', 'decision_unlocked', 'edit_requested', 'edit_approved', 'edit_rejected')
    
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

GRANT EXECUTE ON FUNCTION get_decision_change_timeline(UUID) TO authenticated;

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 033 completed successfully:';
  RAISE NOTICE '   - Added retirement/deprecation to allowed change types';
  RAISE NOTICE '   - Updated timeline to include governance events (lock/unlock)';
  RAISE NOTICE '   - All changes now appear in "All Changes" view';
END $$;
