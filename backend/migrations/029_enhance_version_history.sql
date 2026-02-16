-- ============================================================================
-- Migration 029: Enhanced Decision Version History
-- ============================================================================
-- Description: Enhance version history to properly show:
--              1. Edit requests and approvals (from governance_audit_log)
--              2. Assumption conflict resolutions (from decision_versions)
--              3. Decision conflict resolutions (from decision_versions)
--              Uses existing governance system from migration 027 and conflict tracking from 026.
-- Created: 2026-02-17
-- Prerequisites: Requires migration 026 (reviews), 027 (governance), 028 (version history)
-- ============================================================================

-- ============================================================================
-- 1. UPDATE VERSION HISTORY TO INCLUDE EDIT REQUESTS FROM GOVERNANCE LOG
-- ============================================================================

-- Drop and recreate the version history function to show ALL events
DROP FUNCTION IF EXISTS get_decision_version_history(UUID);

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
  user_email TEXT,
  review_comment TEXT,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Get decision versions (includes edits, reviews, and conflict resolutions from migration 026)
  SELECT 
    dv.id,
    dv.version_number,
    dv.title,
    dv.description,
    dv.category,
    dv.parameters,
    dv.lifecycle,
    dv.health_signal,
    dv.change_type, -- Includes: assumption_conflict_resolved, decision_conflict_resolved
    dv.change_summary,
    dv.changed_fields,
    dv.changed_by,
    dv.changed_at,
    u.full_name AS user_name,
    u.email AS user_email,
    dv.review_comment,
    dv.metadata
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  
  UNION ALL
  
  -- Get governance events (lock/unlock)
  SELECT 
    gal.id,
    NULL::INTEGER AS version_number,
    NULL::TEXT AS title,
    NULL::TEXT AS description,
    NULL::TEXT AS category,
    NULL::JSONB AS parameters,
    NULL::TEXT AS lifecycle,
    NULL::INTEGER AS health_signal,
    CASE 
      WHEN gal.action = 'decision_locked' THEN 'governance_lock'
      WHEN gal.action = 'decision_unlocked' THEN 'governance_unlock'
      WHEN gal.action = 'edit_requested' THEN 'edit_requested'
      WHEN gal.action = 'edit_approved' THEN 'edit_approved'
      WHEN gal.action = 'edit_rejected' THEN 'edit_rejected'
      ELSE gal.action
    END AS change_type,
    CASE 
      WHEN gal.action = 'decision_locked' THEN 'Decision locked by team lead'
      WHEN gal.action = 'decision_unlocked' THEN 'Decision unlocked by team lead'
      WHEN gal.action = 'edit_requested' THEN 'Edit request submitted for approval'
      WHEN gal.action = 'edit_approved' THEN 'Edit request approved by team lead'
      WHEN gal.action = 'edit_rejected' THEN 'Edit request rejected by team lead'
      ELSE gal.justification
    END AS change_summary,
    jsonb_build_object(
      'action', gal.action,
      'justification', gal.justification,
      'proposed_changes', gal.new_state,
      'approved_by', gal.approved_by,
      'resolved_at', gal.resolved_at
    ) AS changed_fields,
    COALESCE(gal.approved_by, gal.requested_by) AS changed_by,
    gal.created_at AS changed_at,
    COALESCE(u_approver.full_name, u_requester.full_name) AS user_name,
    COALESCE(u_approver.email, u_requester.email) AS user_email,
    gal.justification AS review_comment,
    gal.metadata
  FROM governance_audit_log gal
  LEFT JOIN users u_approver ON gal.approved_by = u_approver.id
  LEFT JOIN users u_requester ON gal.requested_by = u_requester.id
  WHERE gal.decision_id = p_decision_id
    AND gal.action IN ('decision_locked', 'decision_unlocked', 'edit_requested', 'edit_approved', 'edit_rejected')
  
  ORDER BY changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_decision_version_history(UUID) TO authenticated;

-- ============================================================================
-- 2. CREATE HELPER VIEW FOR PENDING EDIT REQUESTS
-- ============================================================================

CREATE OR REPLACE VIEW pending_edit_requests AS
SELECT 
  gal.id AS audit_id,
  gal.decision_id,
  gal.organization_id,
  gal.requested_by,
  gal.created_at AS requested_at,
  gal.new_state AS proposed_changes,
  gal.justification AS edit_reason,
  d.title AS decision_title,
  d.lifecycle AS decision_lifecycle,
  d.health_signal AS decision_health,
  d.governance_tier,
  u.full_name AS requester_name,
  u.email AS requester_email
FROM governance_audit_log gal
JOIN decisions d ON gal.decision_id = d.id
JOIN users u ON gal.requested_by = u.id
WHERE gal.action = 'edit_requested'
  AND gal.resolved_at IS NULL
ORDER BY gal.created_at ASC;

-- RLS for view
ALTER VIEW pending_edit_requests SET (security_invoker = true);

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 029 completed successfully';
  RAISE NOTICE '   - Updated version history to show edit requests and approvals';
  RAISE NOTICE '   - Version history now includes:';
  RAISE NOTICE '     * Edit requests (pending, approved, rejected)';
  RAISE NOTICE '     * Lock/unlock events';
  RAISE NOTICE '     * Assumption conflict resolutions (from migration 026)';
  RAISE NOTICE '     * Decision conflict resolutions (from migration 026)';
  RAISE NOTICE '   - Created pending_edit_requests view for easy querying';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Using existing governance APIs from migration 027:';
  RAISE NOTICE '   - can_edit_decision() - Check edit permissions';
  RAISE NOTICE '   - request_edit_approval() - Submit edit for approval';
  RAISE NOTICE '   - resolve_edit_request() - Approve/reject edits';
END $$;
