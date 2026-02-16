-- HOTFIX: Run this SQL directly in Supabase SQL Editor
-- Enhances resolve_edit_request to handle assumption changes

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
  v_change_summary TEXT := '';
  v_assumption_id UUID;
  v_assumption_desc TEXT;
  v_assumptions_to_unlink JSONB;
  v_assumptions_to_link JSONB;
BEGIN
  -- Get the audit log entry
  SELECT * INTO v_audit FROM governance_audit_log WHERE id = p_audit_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Audit log entry not found'; END IF;
  IF v_audit.resolved_at IS NOT NULL THEN RAISE EXCEPTION 'Edit request already resolved'; END IF;
  
  -- ROLE CHECK: Only team leads can approve
  SELECT role INTO v_reviewer_role FROM users WHERE id = p_reviewer_id;
  IF v_reviewer_role != 'lead' THEN
    RAISE EXCEPTION 'Only team leads can approve or reject edit requests';
  END IF;
  
  -- ORGANIZATION CHECK
  SELECT organization_id INTO v_decision_org_id FROM decisions WHERE id = v_audit.decision_id;
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_reviewer_id AND organization_id = v_decision_org_id) THEN
    RAISE EXCEPTION 'Reviewer must be from the same organization';
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
    metadata = metadata || jsonb_build_object('reviewer_notes', p_reviewer_notes, 'reviewer_role', v_reviewer_role)
  WHERE id = p_audit_id;
  
  -- IF APPROVED: Apply the changes
  IF p_approved THEN
    SELECT * INTO v_decision FROM decisions WHERE id = v_audit.decision_id;
    v_proposed_changes := v_audit.new_state;
    
    -- Track field changes
    IF v_proposed_changes ? 'title' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('title', jsonb_build_object('old', v_decision.title, 'new', v_proposed_changes->>'title'));
      v_change_summary := v_change_summary || 'Title updated. ';
    END IF;
    
    IF v_proposed_changes ? 'description' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('description', jsonb_build_object('old', v_decision.description, 'new', v_proposed_changes->>'description'));
      v_change_summary := v_change_summary || 'Description updated. ';
    END IF;
    
    IF v_proposed_changes ? 'category' THEN
      v_changed_fields := v_changed_fields || jsonb_build_object('category', jsonb_build_object('old', v_decision.category, 'new', v_proposed_changes->>'category'));
      v_change_summary := v_change_summary || 'Category updated. ';
    END IF;
    
    -- Apply field changes
    UPDATE decisions
    SET 
      title = COALESCE(v_proposed_changes->>'title', title),
      description = COALESCE(v_proposed_changes->>'description', description),
      category = COALESCE(v_proposed_changes->>'category', category),
      modified_at = NOW(),
      modified_by = p_reviewer_id
    WHERE id = v_audit.decision_id;
    
    -- Process assumption unlinking
    IF v_proposed_changes ? 'assumptionsToUnlink' THEN
      v_assumptions_to_unlink := v_proposed_changes->'assumptionsToUnlink';
      FOR v_assumption_id IN SELECT jsonb_array_elements_text(v_assumptions_to_unlink)::uuid
      LOOP
        SELECT description INTO v_assumption_desc FROM assumptions WHERE id = v_assumption_id;
        DELETE FROM decision_assumptions WHERE decision_id = v_audit.decision_id AND assumption_id = v_assumption_id;
        PERFORM track_relation_change(v_audit.decision_id, 'assumption', v_assumption_id, 'unlinked', v_assumption_desc, p_reviewer_id, 'Edit approval: ' || v_audit.justification);
        v_change_summary := v_change_summary || 'Assumption unlinked. ';
      END LOOP;
    END IF;
    
    -- Process assumption linking
    IF v_proposed_changes ? 'assumptionsToLink' THEN
      v_assumptions_to_link := v_proposed_changes->'assumptionsToLink';
      FOR v_assumption_id IN SELECT jsonb_array_elements_text(v_assumptions_to_link)::uuid
      LOOP
        SELECT description INTO v_assumption_desc FROM assumptions WHERE id = v_assumption_id;
        INSERT INTO decision_assumptions (decision_id, assumption_id, organization_id)
        SELECT v_audit.decision_id, v_assumption_id, v_decision_org_id
        ON CONFLICT (decision_id, assumption_id) DO NOTHING;
        PERFORM track_relation_change(v_audit.decision_id, 'assumption', v_assumption_id, 'linked', v_assumption_desc, p_reviewer_id, 'Edit approval: ' || v_audit.justification);
        v_change_summary := v_change_summary || 'Assumption linked. ';
      END LOOP;
    END IF;
    
    -- Add metadata to changed_fields
    v_changed_fields := v_changed_fields || jsonb_build_object('justification', v_audit.justification, 'approved_by', p_reviewer_id, 'reviewer_notes', p_reviewer_notes);
    
    -- Create version history entry
    INSERT INTO decision_versions (decision_id, version_number, title, description, category, lifecycle, health_signal, change_type, change_summary, changed_by, changed_fields, review_comment, organization_id)
    SELECT v_audit.decision_id, COALESCE(MAX(dv.version_number), 0) + 1, d.title, d.description, d.category, d.lifecycle, d.health_signal, 'edited', TRIM(v_change_summary), p_reviewer_id, v_changed_fields, p_reviewer_notes, d.organization_id
    FROM decisions d LEFT JOIN decision_versions dv ON dv.decision_id = d.id
    WHERE d.id = v_audit.decision_id
    GROUP BY d.id, d.title, d.description, d.category, d.lifecycle, d.health_signal, d.organization_id;
  END IF;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to resolve edit request: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION resolve_edit_request(UUID, UUID, BOOLEAN, TEXT) TO authenticated;
