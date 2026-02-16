-- ============================================================================
-- Migration 027: Adaptive Review Intelligence + Review Outcomes + Governance Mode
-- ============================================================================
-- Description: Implements R2 requirements for:
--              1. Adaptive Review Intelligence (dynamic urgency scoring)
--              2. Review Outcome Tagging (Reaffirmed/Revised/Escalated/Deferred)
--              3. Governance Mode (high-impact decision controls)
-- Created: 2026-02-16
-- Prerequisites: Requires migration 026 (review tracking)
-- ============================================================================

-- ============================================================================
-- 1. ADD REVIEW INTELLIGENCE FIELDS TO DECISIONS
-- ============================================================================

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS review_urgency_score INTEGER DEFAULT 50 CHECK (review_urgency_score >= 0 AND review_urgency_score <= 100),
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_frequency_days INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS consecutive_deferrals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_urgency_calculation TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS urgency_factors JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN decisions.review_urgency_score IS 'Dynamic urgency score (0-100) based on risk, confidence trends, conflicts, aging';
COMMENT ON COLUMN decisions.next_review_date IS 'Calculated next review date (auto-adjusted based on stability)';
COMMENT ON COLUMN decisions.review_frequency_days IS 'Current review frequency in days (adaptive)';
COMMENT ON COLUMN decisions.consecutive_deferrals IS 'Count of consecutive deferred reviews (triggers neglect detection)';
COMMENT ON COLUMN decisions.urgency_factors IS 'Breakdown of factors contributing to urgency score';

-- ============================================================================
-- 2. ADD GOVERNANCE MODE FIELDS TO DECISIONS
-- ============================================================================

ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS governance_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS requires_second_reviewer BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS edit_justification_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS governance_tier TEXT CHECK (governance_tier IN ('standard', 'high_impact', 'critical')) DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id);

COMMENT ON COLUMN decisions.governance_mode IS 'Enable governance controls for this decision';
COMMENT ON COLUMN decisions.requires_second_reviewer IS 'Requires second reviewer approval for changes';
COMMENT ON COLUMN decisions.governance_tier IS 'Governance level: standard, high_impact, critical';
COMMENT ON COLUMN decisions.locked_at IS 'Timestamp when decision was locked for editing';
COMMENT ON COLUMN decisions.locked_by IS 'User who locked the decision';

-- ============================================================================
-- 3. ADD REVIEW OUTCOME TO DECISION_REVIEWS
-- ============================================================================

ALTER TABLE decision_reviews
ADD COLUMN IF NOT EXISTS review_outcome TEXT CHECK (review_outcome IN ('reaffirmed', 'revised', 'escalated', 'deferred')) DEFAULT 'reaffirmed',
ADD COLUMN IF NOT EXISTS deferral_reason TEXT,
ADD COLUMN IF NOT EXISTS next_review_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS changes_since_last_review JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN decision_reviews.review_outcome IS 'Structured outcome: reaffirmed, revised, escalated, deferred';
COMMENT ON COLUMN decision_reviews.deferral_reason IS 'Justification if review was deferred';
COMMENT ON COLUMN decision_reviews.changes_since_last_review IS 'Summary of what changed since last review';

-- ============================================================================
-- 4. CREATE GOVERNANCE AUDIT LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS governance_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  action TEXT NOT NULL CHECK (action IN ('edit_requested', 'edit_approved', 'edit_rejected', 'second_review_requested', 'second_review_approved', 'decision_locked', 'decision_unlocked')),
  requested_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  
  justification TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_governance_audit_decision ON governance_audit_log(decision_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_governance_audit_organization ON governance_audit_log(organization_id);

-- ============================================================================
-- 5. CREATE REVIEW URGENCY CALCULATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_review_urgency_score(p_decision_id UUID)
RETURNS TABLE (
  urgency_score INTEGER,
  factors JSONB,
  next_review_date TIMESTAMPTZ,
  recommended_frequency_days INTEGER
) AS $$
DECLARE
  v_decision RECORD;
  v_score INTEGER := 50; -- Base score
  v_factors JSONB := '{}'::JSONB;
  v_days_since_review INTEGER;
  v_days_until_expiry INTEGER;
  v_conflict_count INTEGER;
  v_assumption_conflict_count INTEGER;
  v_health_trend INTEGER;
  v_consecutive_deferrals INTEGER;
  v_frequency INTEGER := 90;
BEGIN
  -- Get decision details
  SELECT 
    d.lifecycle,
    d.health_signal,
    d.last_reviewed_at,
    d.expiry_date,
    d.consecutive_deferrals,
    d.created_at,
    d.needs_evaluation
  INTO v_decision
  FROM decisions d
  WHERE d.id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Factor 1: Lifecycle Risk (0-25 points)
  CASE v_decision.lifecycle
    WHEN 'INVALIDATED' THEN 
      v_score := v_score + 25;
      v_factors := jsonb_set(v_factors, '{lifecycle_risk}', '25');
    WHEN 'AT_RISK' THEN 
      v_score := v_score + 20;
      v_factors := jsonb_set(v_factors, '{lifecycle_risk}', '20');
    WHEN 'UNDER_REVIEW' THEN 
      v_score := v_score + 10;
      v_factors := jsonb_set(v_factors, '{lifecycle_risk}', '10');
    WHEN 'RETIRED' THEN 
      v_score := v_score - 50; -- Retired decisions need minimal review
      v_factors := jsonb_set(v_factors, '{lifecycle_risk}', '-50');
    ELSE 
      v_factors := jsonb_set(v_factors, '{lifecycle_risk}', '0');
  END CASE;
  
  -- Factor 2: Health Signal Trend (0-20 points)
  IF v_decision.health_signal < 30 THEN
    v_score := v_score + 20;
    v_factors := jsonb_set(v_factors, '{low_health}', '20');
  ELSIF v_decision.health_signal < 50 THEN
    v_score := v_score + 10;
    v_factors := jsonb_set(v_factors, '{low_health}', '10');
  ELSE
    v_factors := jsonb_set(v_factors, '{low_health}', '0');
  END IF;
  
  -- Factor 3: Time Since Last Review (0-15 points)
  v_days_since_review := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_decision.last_reviewed_at, v_decision.created_at))) / 86400;
  IF v_days_since_review > 180 THEN
    v_score := v_score + 15;
    v_factors := jsonb_set(v_factors, '{aging}', to_jsonb(15));
  ELSIF v_days_since_review > 90 THEN
    v_score := v_score + 8;
    v_factors := jsonb_set(v_factors, '{aging}', to_jsonb(8));
  ELSE
    v_factors := jsonb_set(v_factors, '{aging}', to_jsonb(0));
  END IF;
  
  -- Factor 4: Approaching Expiry (0-15 points)
  IF v_decision.expiry_date IS NOT NULL THEN
    v_days_until_expiry := EXTRACT(EPOCH FROM (v_decision.expiry_date - NOW())) / 86400;
    IF v_days_until_expiry < 7 THEN
      v_score := v_score + 15;
      v_factors := jsonb_set(v_factors, '{expiry_proximity}', to_jsonb(15));
    ELSIF v_days_until_expiry < 30 THEN
      v_score := v_score + 10;
      v_factors := jsonb_set(v_factors, '{expiry_proximity}', to_jsonb(10));
    ELSIF v_days_until_expiry < 60 THEN
      v_score := v_score + 5;
      v_factors := jsonb_set(v_factors, '{expiry_proximity}', to_jsonb(5));
    END IF;
  END IF;
  
  -- Factor 5: Active Conflicts (0-15 points)
  SELECT COUNT(*) INTO v_conflict_count
  FROM decision_conflicts dc
  WHERE (dc.decision_a_id = p_decision_id OR dc.decision_b_id = p_decision_id)
    AND dc.resolution_action IS NULL;
  
  IF v_conflict_count > 2 THEN
    v_score := v_score + 15;
    v_factors := jsonb_set(v_factors, '{decision_conflicts}', to_jsonb(15));
  ELSIF v_conflict_count > 0 THEN
    v_score := v_score + 8;
    v_factors := jsonb_set(v_factors, '{decision_conflicts}', to_jsonb(8));
  ELSE
    v_factors := jsonb_set(v_factors, '{decision_conflicts}', to_jsonb(0));
  END IF;
  
  -- Factor 6: Assumption Conflicts (0-10 points)
  SELECT COUNT(DISTINCT ac.id) INTO v_assumption_conflict_count
  FROM assumption_conflicts ac
  JOIN decision_assumptions da ON (da.assumption_id = ac.assumption_a_id OR da.assumption_id = ac.assumption_b_id)
  WHERE da.decision_id = p_decision_id
    AND ac.resolved = false;
  
  IF v_assumption_conflict_count > 1 THEN
    v_score := v_score + 10;
    v_factors := jsonb_set(v_factors, '{assumption_conflicts}', to_jsonb(10));
  ELSIF v_assumption_conflict_count > 0 THEN
    v_score := v_score + 5;
    v_factors := jsonb_set(v_factors, '{assumption_conflicts}', to_jsonb(5));
  ELSE
    v_factors := jsonb_set(v_factors, '{assumption_conflicts}', to_jsonb(0));
  END IF;
  
  -- Factor 7: Needs Evaluation Flag (0-10 points)
  IF v_decision.needs_evaluation THEN
    v_score := v_score + 10;
    v_factors := jsonb_set(v_factors, '{needs_evaluation}', to_jsonb(10));
  ELSE
    v_factors := jsonb_set(v_factors, '{needs_evaluation}', to_jsonb(0));
  END IF;
  
  -- Factor 8: Consecutive Deferrals - Review Neglect Detection (0-20 points)
  v_consecutive_deferrals := COALESCE(v_decision.consecutive_deferrals, 0);
  IF v_consecutive_deferrals >= 3 THEN
    v_score := v_score + 20;
    v_factors := jsonb_set(v_factors, '{review_neglect}', to_jsonb(20));
  ELSIF v_consecutive_deferrals >= 2 THEN
    v_score := v_score + 10;
    v_factors := jsonb_set(v_factors, '{review_neglect}', to_jsonb(10));
  ELSIF v_consecutive_deferrals >= 1 THEN
    v_score := v_score + 5;
    v_factors := jsonb_set(v_factors, '{review_neglect}', to_jsonb(5));
  ELSE
    v_factors := jsonb_set(v_factors, '{review_neglect}', to_jsonb(0));
  END IF;
  
  -- Cap score at 0-100
  v_score := GREATEST(0, LEAST(100, v_score));
  
  -- Calculate adaptive review frequency
  IF v_score >= 80 THEN
    v_frequency := 7; -- Weekly for critical urgency
  ELSIF v_score >= 60 THEN
    v_frequency := 30; -- Monthly for high urgency
  ELSIF v_score >= 40 THEN
    v_frequency := 60; -- Bi-monthly for medium urgency
  ELSE
    v_frequency := 90; -- Quarterly for low urgency
  END IF;
  
  -- Calculate next review date
  RETURN QUERY SELECT 
    v_score,
    v_factors,
    (NOW() + (v_frequency || ' days')::INTERVAL)::TIMESTAMPTZ,
    v_frequency;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_review_urgency_score IS 'Calculate dynamic review urgency score based on risk, conflicts, aging, and neglect';

-- ============================================================================
-- 6. AUTO-UPDATE REVIEW URGENCY SCORES
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_update_review_urgency()
RETURNS TRIGGER AS $$
DECLARE
  v_urgency RECORD;
BEGIN
  -- Calculate urgency for the decision
  SELECT * INTO v_urgency
  FROM calculate_review_urgency_score(NEW.id)
  LIMIT 1;
  
  IF FOUND THEN
    NEW.review_urgency_score := v_urgency.urgency_score;
    NEW.next_review_date := v_urgency.next_review_date;
    NEW.review_frequency_days := v_urgency.recommended_frequency_days;
    NEW.urgency_factors := v_urgency.factors;
    NEW.last_urgency_calculation := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on decision updates
DROP TRIGGER IF EXISTS trigger_update_review_urgency ON decisions;
CREATE TRIGGER trigger_update_review_urgency
  BEFORE UPDATE OF lifecycle, health_signal, needs_evaluation, consecutive_deferrals
  ON decisions
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_review_urgency();

-- ============================================================================
-- 7. TRACK REVIEW OUTCOMES AND UPDATE DEFERRALS
-- ============================================================================

CREATE OR REPLACE FUNCTION process_review_outcome()
RETURNS TRIGGER AS $$
DECLARE
  v_decision RECORD;
BEGIN
  -- Get current decision state
  SELECT * INTO v_decision
  FROM decisions
  WHERE id = NEW.decision_id;
  
  -- Handle review outcome
  CASE NEW.review_outcome
    WHEN 'deferred' THEN
      -- Increment deferral counter
      UPDATE decisions
      SET 
        consecutive_deferrals = consecutive_deferrals + 1,
        last_reviewed_at = NOW()
      WHERE id = NEW.decision_id;
      
    WHEN 'reaffirmed', 'revised', 'escalated' THEN
      -- Reset deferral counter
      UPDATE decisions
      SET 
        consecutive_deferrals = 0,
        last_reviewed_at = NOW()
      WHERE id = NEW.decision_id;
  END CASE;
  
  -- Set next review date if provided
  IF NEW.next_review_date IS NOT NULL THEN
    UPDATE decisions
    SET next_review_date = NEW.next_review_date
    WHERE id = NEW.decision_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_process_review_outcome ON decision_reviews;
CREATE TRIGGER trigger_process_review_outcome
  AFTER INSERT ON decision_reviews
  FOR EACH ROW
  EXECUTE FUNCTION process_review_outcome();

-- ============================================================================
-- 7B. AUTO-ESCALATE GOVERNANCE TIER BASED ON CONFLICTS
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_escalate_governance_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_decision_ids UUID[];
  v_decision_id UUID;
  v_decision RECORD;
  v_assumption_conflict_count INTEGER;
  v_decision_conflict_count INTEGER;
  v_total_conflicts INTEGER;
  v_new_tier TEXT;
  v_old_tier TEXT;
BEGIN
  -- Determine which decisions to check based on trigger table
  IF TG_TABLE_NAME = 'assumption_conflicts' THEN
    -- Find all decisions linked to the conflicting assumptions
    SELECT ARRAY_AGG(DISTINCT decision_id) INTO v_decision_ids
    FROM decision_assumptions
    WHERE assumption_id IN (NEW.assumption_a_id, NEW.assumption_b_id);
  ELSIF TG_TABLE_NAME = 'decision_conflicts' THEN
    -- For decision conflicts, check both decisions involved
    v_decision_ids := ARRAY[NEW.decision_a_id, NEW.decision_b_id];
  END IF;
  
  -- Process each affected decision
  FOREACH v_decision_id IN ARRAY v_decision_ids
  LOOP
    -- Get decision details
    SELECT governance_tier, organization_id INTO v_decision
    FROM decisions
    WHERE id = v_decision_id;
    
    -- Skip if decision not found
    CONTINUE WHEN NOT FOUND;
    
    v_old_tier := v_decision.governance_tier;
    
    -- Count assumption conflicts for this decision
    -- (conflicts involving any assumption linked to this decision)
    SELECT COUNT(DISTINCT ac.id) INTO v_assumption_conflict_count
    FROM assumption_conflicts ac
    WHERE ac.resolved = false
    AND (
      ac.assumption_a_id IN (SELECT assumption_id FROM decision_assumptions WHERE decision_id = v_decision_id)
      OR ac.assumption_b_id IN (SELECT assumption_id FROM decision_assumptions WHERE decision_id = v_decision_id)
    );
    
    -- Count decision conflicts
    SELECT COUNT(*) INTO v_decision_conflict_count
    FROM decision_conflicts
    WHERE (decision_a_id = v_decision_id OR decision_b_id = v_decision_id)
    AND resolved_at IS NULL;
    
    v_total_conflicts := v_assumption_conflict_count + v_decision_conflict_count;
    
    -- Determine new governance tier based on conflict severity
    IF v_total_conflicts >= 5 THEN
      v_new_tier := 'critical';
    ELSIF v_total_conflicts >= 2 THEN
      v_new_tier := 'high_impact';
    ELSE
      v_new_tier := 'standard';
    END IF;
    
    -- Only update if tier changed
    IF v_new_tier != v_old_tier THEN
      UPDATE decisions
      SET governance_tier = v_new_tier
      WHERE id = v_decision_id;
      
      -- Create notification for team leads about tier escalation
      INSERT INTO notifications (
        type, severity, title, message, decision_id, organization_id, metadata
      )
      VALUES (
        'LIFECYCLE_CHANGED',
        CASE 
          WHEN v_new_tier = 'critical' THEN 'CRITICAL'
          WHEN v_new_tier = 'high_impact' THEN 'WARNING'
          ELSE 'INFO'
        END,
        'Governance Tier Escalated',
        'Decision governance tier auto-escalated to ' || v_new_tier || ' due to ' || v_total_conflicts || ' active conflicts',
        v_decision_id,
        v_decision.organization_id,
        jsonb_build_object(
          'old_tier', v_old_tier,
          'new_tier', v_new_tier,
          'conflict_count', v_total_conflicts,
          'assumption_conflicts', v_assumption_conflict_count,
          'decision_conflicts', v_decision_conflict_count
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for assumption conflicts
DROP TRIGGER IF EXISTS trigger_auto_escalate_on_assumption_conflict ON assumption_conflicts;
CREATE TRIGGER trigger_auto_escalate_on_assumption_conflict
  AFTER INSERT OR UPDATE ON assumption_conflicts
  FOR EACH ROW
  WHEN (NEW.resolved = false)
  EXECUTE FUNCTION auto_escalate_governance_tier();

-- Trigger for decision conflicts
DROP TRIGGER IF EXISTS trigger_auto_escalate_on_decision_conflict ON decision_conflicts;
CREATE TRIGGER trigger_auto_escalate_on_decision_conflict
  AFTER INSERT OR UPDATE ON decision_conflicts
  FOR EACH ROW
  WHEN (NEW.resolved_at IS NULL)
  EXECUTE FUNCTION auto_escalate_governance_tier();

-- ============================================================================
-- 7C. CREATE GOVERNANCE NOTIFICATIONS
-- ============================================================================

-- Create notification when edit approval is requested
CREATE OR REPLACE FUNCTION notify_edit_approval_requested()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify on edit_requested action
  IF NEW.action = 'edit_requested' THEN
    INSERT INTO notifications (
      type, severity, title, message, decision_id, organization_id, metadata
    )
    SELECT 
      'NEEDS_REVIEW',
      'WARNING',
      'Edit Approval Requested',
      (SELECT full_name FROM users WHERE id = NEW.requested_by) || ' requested approval to edit decision',
      NEW.decision_id,
      NEW.organization_id,
      jsonb_build_object(
        'audit_id', NEW.id,
        'requested_by', NEW.requested_by,
        'justification', NEW.justification,
        'requires_lead_action', true
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_edit_approval ON governance_audit_log;
CREATE TRIGGER trigger_notify_edit_approval
  AFTER INSERT ON governance_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_edit_approval_requested();

-- Create notification when decision is locked/unlocked
CREATE OR REPLACE FUNCTION notify_decision_lock_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.action IN ('decision_locked', 'decision_unlocked') THEN
    INSERT INTO notifications (
      type, severity, title, message, decision_id, organization_id, metadata
    )
    SELECT 
      'LIFECYCLE_CHANGED',
      'INFO',
      CASE 
        WHEN NEW.action = 'decision_locked' THEN 'Decision Locked'
        ELSE 'Decision Unlocked'
      END,
      (SELECT full_name FROM users WHERE id = NEW.requested_by) || 
      CASE 
        WHEN NEW.action = 'decision_locked' THEN ' locked this decision for governance review'
        ELSE ' unlocked this decision'
      END,
      NEW.decision_id,
      NEW.organization_id,
      jsonb_build_object(
        'locked_by', NEW.requested_by,
        'reason', NEW.justification
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_lock_change ON governance_audit_log;
CREATE TRIGGER trigger_notify_lock_change
  AFTER INSERT ON governance_audit_log
  FOR EACH ROW
  WHEN (NEW.action IN ('decision_locked', 'decision_unlocked'))
  EXECUTE FUNCTION notify_decision_lock_change();

-- ============================================================================
-- 7D. DECISION EXPIRY NOTIFICATIONS (TEAM LEADS ONLY)
-- ============================================================================

-- Function to check and notify about expiring decisions (run periodically)
CREATE OR REPLACE FUNCTION check_expiring_decisions()
RETURNS void AS $$
DECLARE
  v_decision RECORD;
  v_days_until_expiry INTEGER;
BEGIN
  FOR v_decision IN 
    SELECT id, title, expiry_date, organization_id
    FROM decisions
    WHERE expiry_date IS NOT NULL
    AND lifecycle NOT IN ('RETIRED', 'INVALIDATED')
    AND expiry_date >= NOW()
    AND expiry_date <= NOW() + INTERVAL '30 days'
  LOOP
    v_days_until_expiry := EXTRACT(DAY FROM v_decision.expiry_date - NOW())::INTEGER;
    
    -- Check if notification already exists for this decision in last 7 days
    IF NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE decision_id = v_decision.id
      AND type = 'NEEDS_REVIEW'
      AND title LIKE '%Expiring%'
      AND created_at > NOW() - INTERVAL '7 days'
    ) THEN
      INSERT INTO notifications (
        type, 
        severity, 
        title, 
        message, 
        decision_id, 
        organization_id, 
        metadata
      ) VALUES (
        'NEEDS_REVIEW',
        CASE 
          WHEN v_days_until_expiry <= 7 THEN 'CRITICAL'
          WHEN v_days_until_expiry <= 14 THEN 'WARNING'
          ELSE 'INFO'
        END,
        'Decision Expiring Soon',
        '"' || v_decision.title || '" will expire in ' || v_days_until_expiry || ' days',
        v_decision.id,
        v_decision.organization_id,
        jsonb_build_object(
          'expiry_date', v_decision.expiry_date,
          'days_until_expiry', v_days_until_expiry,
          'requires_lead_action', true
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. GOVERNANCE MODE ENFORCEMENT FUNCTIONS
-- ============================================================================

-- Check if decision can be edited (governance enforcement)
CREATE OR REPLACE FUNCTION can_edit_decision(
  p_decision_id UUID,
  p_user_id UUID,
  p_justification TEXT DEFAULT NULL
)
RETURNS TABLE (
  can_edit BOOLEAN,
  reason TEXT,
  requires_approval BOOLEAN
) AS $$
DECLARE
  v_decision RECORD;
  v_user_role TEXT;
  v_user_org_id UUID;
  v_is_same_org BOOLEAN := false;
  v_pending_approval BOOLEAN := false;
BEGIN
  SELECT * INTO v_decision
  FROM decisions
  WHERE id = p_decision_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Decision not found', false;
    RETURN;
  END IF;
  
  -- Get user role and organization
  SELECT role, organization_id INTO v_user_role, v_user_org_id
  FROM users
  WHERE id = p_user_id;
  
  -- Check if user is from same organization as decision
  v_is_same_org := (v_user_org_id = v_decision.organization_id);
  
  IF NOT v_is_same_org THEN
    RETURN QUERY SELECT false, 'Cannot edit decisions from other organizations', false;
    RETURN;
  END IF;
  
  -- Check if decision is locked
  IF v_decision.locked_at IS NOT NULL AND v_decision.locked_by != p_user_id THEN
    -- Team leads can unlock decisions if needed (they should use toggle_decision_lock)
    IF v_user_role = 'lead' THEN
      RETURN QUERY SELECT false, 'Decision is locked - use toggle_decision_lock to unlock', false;
    ELSE
      RETURN QUERY SELECT false, 'Decision is locked by a team lead', false;
    END IF;
    RETURN;
  END IF;
  
  -- Standard decisions - can edit freely
  IF NOT v_decision.governance_mode THEN
    RETURN QUERY SELECT true, 'Standard decision - edit allowed', false;
    RETURN;
  END IF;
  
  -- Governance mode enabled - check rules
  
  -- TEAM LEADS have elevated privileges for governance mode
  IF v_user_role = 'lead' THEN
    -- Leads can bypass justification requirements for critical situations
    -- But we still recommend providing justification
    IF v_decision.governance_tier = 'critical' AND (p_justification IS NULL OR LENGTH(TRIM(p_justification)) < 10) THEN
      RETURN QUERY SELECT false, 'Critical decisions require justification even for team leads (minimum 10 characters)', true;
      RETURN;
    END IF;
    
    -- Leads can edit without second reviewer in most cases
    -- Only critical tier requires second reviewer even for leads
    IF v_decision.governance_tier = 'critical' AND v_decision.requires_second_reviewer THEN
      -- Check if there's a pending approval request
      SELECT EXISTS (
        SELECT 1 FROM governance_audit_log
        WHERE decision_id = p_decision_id
          AND action = 'edit_requested'
          AND resolved_at IS NULL
      ) INTO v_pending_approval;
      
      IF v_pending_approval THEN
        RETURN QUERY SELECT false, 'Pending second reviewer approval (critical tier)', true;
        RETURN;
      END IF;
      
      RETURN QUERY SELECT false, 'Critical tier requires second team lead approval', true;
      RETURN;
    END IF;
    
    -- Team lead can proceed with edit
    RETURN QUERY SELECT true, 'Team lead - governance check passed', false;
    RETURN;
  END IF;
  
  -- MEMBERS (non-leads) face stricter governance rules
  
  -- Rule 1: Justification required?
  IF v_decision.edit_justification_required AND (p_justification IS NULL OR LENGTH(TRIM(p_justification)) < 10) THEN
    RETURN QUERY SELECT false, 'Edit justification required (minimum 10 characters)', true;
    RETURN;
  END IF;
  
  -- Rule 2: Second reviewer required?
  IF v_decision.requires_second_reviewer THEN
    -- Check if there's a pending approval request
    SELECT EXISTS (
      SELECT 1 FROM governance_audit_log
      WHERE decision_id = p_decision_id
        AND action = 'edit_requested'
        AND resolved_at IS NULL
    ) INTO v_pending_approval;
    
    IF v_pending_approval THEN
      RETURN QUERY SELECT false, 'Pending second reviewer approval', true;
      RETURN;
    END IF;
    
    -- User can request edit, but needs approval
    RETURN QUERY SELECT false, 'Requires second reviewer approval', true;
    RETURN;
  END IF;
  
  -- Governance checks passed
  RETURN QUERY SELECT true, 'Governance checks passed', false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Request edit approval for governed decision
CREATE OR REPLACE FUNCTION request_edit_approval(
  p_decision_id UUID,
  p_user_id UUID,
  p_justification TEXT,
  p_proposed_changes JSONB
)
RETURNS UUID AS $$
DECLARE
  v_audit_id UUID;
  v_organization_id UUID;
BEGIN
  -- Get organization_id
  SELECT organization_id INTO v_organization_id
  FROM decisions
  WHERE id = p_decision_id;
  
  -- Create audit log entry
  INSERT INTO governance_audit_log (
    decision_id,
    organization_id,
    action,
    requested_by,
    justification,
    new_state,
    metadata
  ) VALUES (
    p_decision_id,
    v_organization_id,
    'edit_requested',
    p_user_id,
    p_justification,
    p_proposed_changes,
    jsonb_build_object('requested_at', NOW())
  )
  RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve/reject edit request (TEAM LEADERS ONLY)
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
BEGIN
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
    metadata = metadata || jsonb_build_object('reviewer_notes', p_reviewer_notes, 'reviewer_role', v_reviewer_role)
  WHERE id = p_audit_id;
  
  RETURN p_approved;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lock/Unlock decision (TEAM LEADERS ONLY)
CREATE OR REPLACE FUNCTION toggle_decision_lock(
  p_decision_id UUID,
  p_user_id UUID,
  p_lock BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_decision_org_id UUID;
  v_current_lock_by UUID;
BEGIN
  -- ROLE CHECK: Only team leads can lock/unlock decisions
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  IF v_user_role != 'lead' THEN
    RAISE EXCEPTION 'Only team leads can lock or unlock decisions';
  END IF;
  
  -- ORGANIZATION CHECK: Must be from same organization
  SELECT organization_id, locked_by INTO v_decision_org_id, v_current_lock_by
  FROM decisions
  WHERE id = p_decision_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND organization_id = v_decision_org_id
  ) THEN
    RAISE EXCEPTION 'Can only lock/unlock decisions in your organization';
  END IF;
  
  IF p_lock THEN
    -- Lock the decision
    IF v_current_lock_by IS NOT NULL AND v_current_lock_by != p_user_id THEN
      RAISE EXCEPTION 'Decision is already locked by another user';
    END IF;
    
    UPDATE decisions
    SET locked_at = NOW(), locked_by = p_user_id
    WHERE id = p_decision_id;
    
    -- Log the lock
    INSERT INTO governance_audit_log (
      decision_id, organization_id, action, requested_by, justification
    ) VALUES (
      p_decision_id, v_decision_org_id, 'decision_locked', p_user_id, COALESCE(p_reason, 'Decision locked for governance review')
    );
  ELSE
    -- Unlock the decision (only the locker or another lead can unlock)
    UPDATE decisions
    SET locked_at = NULL, locked_by = NULL
    WHERE id = p_decision_id;
    
    -- Log the unlock
    INSERT INTO governance_audit_log (
      decision_id, organization_id, action, requested_by, justification
    ) VALUES (
      p_decision_id, v_decision_org_id, 'decision_unlocked', p_user_id, COALESCE(p_reason, 'Decision unlocked')
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update governance settings (TEAM LEADERS ONLY)
CREATE OR REPLACE FUNCTION update_governance_settings(
  p_decision_id UUID,
  p_user_id UUID,
  p_governance_mode BOOLEAN DEFAULT NULL,
  p_governance_tier TEXT DEFAULT NULL,
  p_requires_second_reviewer BOOLEAN DEFAULT NULL,
  p_edit_justification_required BOOLEAN DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role TEXT;
  v_decision_org_id UUID;
  v_previous_state JSONB;
  v_new_state JSONB;
BEGIN
  -- ROLE CHECK: Only team leads can modify governance settings
  SELECT role INTO v_user_role FROM users WHERE id = p_user_id;
  
  IF v_user_role != 'lead' THEN
    RAISE EXCEPTION 'Only team leads can modify governance settings';
  END IF;
  
  -- ORGANIZATION CHECK: Must be from same organization
  SELECT organization_id INTO v_decision_org_id
  FROM decisions
  WHERE id = p_decision_id;
  
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
    AND organization_id = v_decision_org_id
  ) THEN
    RAISE EXCEPTION 'Can only modify governance settings for decisions in your organization';
  END IF;
  
  -- Capture previous state
  SELECT jsonb_build_object(
    'governance_mode', governance_mode,
    'governance_tier', governance_tier,
    'requires_second_reviewer', requires_second_reviewer,
    'edit_justification_required', edit_justification_required
  ) INTO v_previous_state
  FROM decisions
  WHERE id = p_decision_id;
  
  -- Update governance settings (only update non-null parameters)
  UPDATE decisions
  SET 
    governance_mode = COALESCE(p_governance_mode, governance_mode),
    governance_tier = COALESCE(p_governance_tier, governance_tier),
    requires_second_reviewer = COALESCE(p_requires_second_reviewer, requires_second_reviewer),
    edit_justification_required = COALESCE(p_edit_justification_required, edit_justification_required)
  WHERE id = p_decision_id;
  
  -- Capture new state
  SELECT jsonb_build_object(
    'governance_mode', governance_mode,
    'governance_tier', governance_tier,
    'requires_second_reviewer', requires_second_reviewer,
    'edit_justification_required', edit_justification_required
  ) INTO v_new_state
  FROM decisions
  WHERE id = p_decision_id;
  
  -- Log the governance change
  INSERT INTO governance_audit_log (
    decision_id, organization_id, action, requested_by, approved_by,
    justification, previous_state, new_state, resolved_at
  ) VALUES (
    p_decision_id, v_decision_org_id, 'edit_approved', p_user_id, p_user_id,
    COALESCE(p_reason, 'Governance settings updated by team lead'),
    v_previous_state, v_new_state, NOW()
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. ENABLE RLS ON GOVERNANCE_AUDIT_LOG
-- ============================================================================

ALTER TABLE governance_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped governance_audit_log" ON governance_audit_log;

CREATE POLICY "Org scoped governance_audit_log"
ON governance_audit_log FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- ============================================================================
-- 10. CALCULATE INITIAL URGENCY SCORES FOR EXISTING DECISIONS
-- ============================================================================

-- Update all existing decisions with urgency scores
DO $$
DECLARE
  v_decision RECORD;
  v_urgency RECORD;
BEGIN
  FOR v_decision IN 
    SELECT id FROM decisions WHERE review_urgency_score IS NULL OR last_urgency_calculation IS NULL
  LOOP
    SELECT * INTO v_urgency
    FROM calculate_review_urgency_score(v_decision.id)
    LIMIT 1;
    
    IF FOUND THEN
      UPDATE decisions
      SET 
        review_urgency_score = v_urgency.urgency_score,
        next_review_date = v_urgency.next_review_date,
        review_frequency_days = v_urgency.recommended_frequency_days,
        urgency_factors = v_urgency.factors,
        last_urgency_calculation = NOW()
      WHERE id = v_decision.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Updated review urgency scores for all decisions';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 027 completed successfully';
  RAISE NOTICE 'Features added:';
  RAISE NOTICE '  - Adaptive Review Intelligence (urgency scoring + dynamic scheduling)';
  RAISE NOTICE '  - Review Outcome Tagging (reaffirmed/revised/escalated/deferred)';
  RAISE NOTICE '  - Governance Mode (high-impact decision controls)';
  RAISE NOTICE '  - Review Neglect Detection (consecutive deferrals tracking)';
  RAISE NOTICE '  - Governance Audit Log (edit approval workflow)';
END $$;
