-- Migration 030: Fix Edit Approval to Actually Apply Changes
-- Issue: resolve_edit_request() marks request as approved but doesn't update the decision
-- Solution: When approved, extract proposed changes and apply them to the decision

-- Drop and recreate the function with fix
DROP FUNCTION IF EXISTS resolve_edit_request(UUID, UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION resolve_edit_request(
  p_audit_id UUID,
  p_reviewer_id UUID,
  p_approved BOOLEAN,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_audit RECORD;
  v_reviewer_role TEXT;
  v_decision_org_id UUID;
  v_proposed_changes JSONB;
  v_decision RECORD;
  v_changed_fields JSONB := '{}'::jsonb;
  v_change_summary TEXT;
BEGIN
  -- Get the audit log entry
  SELECT * INTO v_audit
  FROM governance_audit_log
  WHERE id = p_audit_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Audit log entry not found';
  END IF;
  
  IF v_audit.resolved_at IS NOT NULL THEN
    RAISE EXCEPTION 'Edit request already resolved';
  END IF;
  
  -- ROLE CHECK: Only team leads can approve edit requests
  SELECT role INTO v_reviewer_role FROM users WHERE id = p_reviewer_id;
  
  IF v_reviewer_role != 'lead' THEN
    RAISE EXCEPTION 'Only team leads can approve or reject edit requests';
  END IF;
  
  -- ORGANIZATION CHECK: Reviewer must be from same organization as decision
  SELECT organization_id INTO v_decision_org_id
  FROM decisions
  WHERE id = v_audit.decision_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_reviewer_id
    AND organization_id = v_decision_org_id
  ) THEN
    RAISE EXCEPTION 'Reviewer must be from the same organization as the decision';
  END IF;
  
  -- Prevent self-approval
  IF v_audit.requested_by = p_reviewer_id THEN
    RAISE EXCEPTION 'Cannot approve your own edit request';
  END IF;
  
  -- Update audit log
  UPDATE governance_audit_log
  SET 
    action = CASE WHEN p_approved THEN 'edit_approved' ELSE 'edit_rejected' END,
    approved_by = p_reviewer_id,
    resolved_at = NOW(),
    metadata = metadata || jsonb_build_object(
      'reviewer_notes', p_reviewer_notes, 
      'reviewer_role', v_reviewer_role
    )
  WHERE id = p_audit_id;
  
  -- IF APPROVED: Actually apply the changes to the decision
  IF p_approved THEN
    -- Get the current decision
    SELECT * INTO v_decision
    FROM decisions
    WHERE id = v_audit.decision_id;
    
    -- Extract proposed changes from new_state
    v_proposed_changes := v_audit.new_state;
    
    -- Build changed_fields tracking and change summary
    v_changed_fields := jsonb_build_object();
    v_change_summary := '';
    
    -- Update decision with proposed changes
    -- Check each possible field and update if present in proposed_changes
    
    IF v_proposed_changes ? 'title' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object(
        'title', jsonb_build_object(
          'old', v_decision.title,
          'new', v_proposed_changes->>'title'
        )
      );
      v_change_summary := v_change_summary || 'Title updated. ';
      
      UPDATE decisions 
      SET title = v_proposed_changes->>'title'
      WHERE id = v_audit.decision_id;
    END IF;
    
    IF v_proposed_changes ? 'description' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object(
        'description', jsonb_build_object(
          'old', v_decision.description,
          'new', v_proposed_changes->>'description'
        )
      );
      v_change_summary := v_change_summary || 'Description updated. ';
      
      UPDATE decisions 
      SET description = v_proposed_changes->>'description'
      WHERE id = v_audit.decision_id;
    END IF;
    
    IF v_proposed_changes ? 'category' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object(
        'category', jsonb_build_object(
          'old', v_decision.category,
          'new', v_proposed_changes->>'category'
        )
      );
      v_change_summary := v_change_summary || 'Category updated. ';
      
      UPDATE decisions 
      SET category = v_proposed_changes->>'category'
      WHERE id = v_audit.decision_id;
    END IF;
    
    -- Add justification to changed_fields
    v_changed_fields := v_changed_fields || jsonb_build_object(
      'justification', v_audit.justification,
      'approved_by', p_reviewer_id,
      'reviewer_notes', p_reviewer_notes
    );
    
    -- Create version history entry
    INSERT INTO decision_versions (
      decision_id,
      version_number,
      title,
      description,
      category,
      lifecycle,
      health_signal,
      change_type,
      change_summary,
      changed_by,
      changed_fields,
      review_comment,
      organization_id
    )
    SELECT 
      v_audit.decision_id,
      COALESCE(MAX(version_number), 0) + 1,
      d.title,
      d.description,
      d.category,
      d.lifecycle,
      d.health_signal,
      'field_updated',
      COALESCE(TRIM(v_change_summary), 'Edit request approved and applied'),
      p_reviewer_id,
      v_changed_fields,
      p_reviewer_notes,
      d.organization_id
    FROM decisions d
    LEFT JOIN decision_versions dv ON dv.decision_id = d.id
    WHERE d.id = v_audit.decision_id
    GROUP BY d.id, d.title, d.description, d.category, d.lifecycle, d.health_signal, d.organization_id;
    
    -- Update decision's updated_at timestamp
    UPDATE decisions
    SET updated_at = NOW()
    WHERE id = v_audit.decision_id;
  END IF;
  
  RETURN p_approved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION resolve_edit_request IS 'Approve or reject edit requests. When approved, applies proposed changes to the decision and creates version history entry.';

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 030 applied: resolve_edit_request() now applies changes when approved';
END $$;
