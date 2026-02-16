-- ============================================================================
-- Migration 028: Add Governance Events to Version History
-- ============================================================================
-- Add lock/unlock events from governance_audit_log to decision version history

-- Drop and recreate the function to include governance events
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
  user_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Get decision versions
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
      ELSE gal.action
    END AS change_type,
    CASE 
      WHEN gal.action = 'decision_locked' THEN 'Decision locked by team lead'
      WHEN gal.action = 'decision_unlocked' THEN 'Decision unlocked by team lead'
      ELSE gal.justification
    END AS change_summary,
    jsonb_build_object(
      'action', gal.action,
      'justification', gal.justification
    ) AS changed_fields,
    COALESCE(gal.approved_by, gal.requested_by) AS changed_by,
    gal.created_at AS changed_at,
    u.full_name AS user_name,
    u.email AS user_email
  FROM governance_audit_log gal
  LEFT JOIN users u ON COALESCE(gal.approved_by, gal.requested_by) = u.id
  WHERE gal.decision_id = p_decision_id
    AND gal.action IN ('decision_locked', 'decision_unlocked')
  
  ORDER BY changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_decision_version_history(UUID) TO authenticated;
