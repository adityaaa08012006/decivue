-- Migration: Add Evaluation Tracking
-- Purpose: Track when decisions were last evaluated and whether they need re-evaluation
-- This enables smart evaluation - only re-evaluate when inputs actually change

-- ============================================================================
-- ADD EVALUATION TRACKING COLUMNS TO DECISIONS
-- ============================================================================

ALTER TABLE decisions 
  ADD COLUMN IF NOT EXISTS last_evaluated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS needs_evaluation BOOLEAN DEFAULT false;

COMMENT ON COLUMN decisions.last_evaluated_at IS 'Timestamp of last evaluation run (automatic or manual)';
COMMENT ON COLUMN decisions.needs_evaluation IS 'Flag set by event handlers when evaluation inputs change (assumptions, constraints, dependencies)';

-- ============================================================================
-- CREATE INDEX FOR EFFICIENT QUERIES
-- ============================================================================

-- Index for finding decisions that need evaluation
CREATE INDEX IF NOT EXISTS idx_decisions_needs_eval 
  ON decisions(needs_evaluation, last_evaluated_at) 
  WHERE needs_evaluation = true;

-- Index for finding stale decisions (not evaluated recently)
CREATE INDEX IF NOT EXISTS idx_decisions_last_eval 
  ON decisions(last_evaluated_at DESC);

-- ============================================================================
-- UPDATE EXISTING DECISIONS
-- ============================================================================

-- Set initial values for existing decisions
UPDATE decisions 
SET 
  last_evaluated_at = COALESCE(last_reviewed_at, created_at),
  needs_evaluation = false
WHERE last_evaluated_at IS NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to mark decisions for re-evaluation
CREATE OR REPLACE FUNCTION mark_decisions_for_evaluation(decision_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE decisions
  SET needs_evaluation = true
  WHERE id = ANY(decision_ids)
    AND lifecycle NOT IN ('RETIRED'); -- Don't mark retired decisions
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION mark_decisions_for_evaluation IS 'Mark multiple decisions as needing re-evaluation (called by event handlers)';

-- Function to check if decision needs evaluation (used by smart eval logic)
CREATE OR REPLACE FUNCTION decision_needs_evaluation(
  p_decision_id UUID,
  p_stale_hours INTEGER DEFAULT 24
)
RETURNS BOOLEAN AS $$
DECLARE
  v_decision RECORD;
  v_hours_since_eval NUMERIC;
  v_days_until_expiry NUMERIC;
BEGIN
  SELECT 
    needs_evaluation,
    last_evaluated_at,
    expiry_date,
    lifecycle
  INTO v_decision
  FROM decisions
  WHERE id = p_decision_id;
  
  -- Not found
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Terminal states don't need evaluation
  IF v_decision.lifecycle IN ('RETIRED') THEN
    RETURN false;
  END IF;
  
  -- Explicit flag set
  IF v_decision.needs_evaluation THEN
    RETURN true;
  END IF;
  
  -- Never evaluated
  IF v_decision.last_evaluated_at IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if stale (more than X hours since last eval)
  v_hours_since_eval := EXTRACT(EPOCH FROM (NOW() - v_decision.last_evaluated_at)) / 3600;
  IF v_hours_since_eval > p_stale_hours THEN
    RETURN true;
  END IF;
  
  -- Check if approaching or past expiry (evaluate daily in ±30 day window)
  IF v_decision.expiry_date IS NOT NULL THEN
    v_days_until_expiry := EXTRACT(EPOCH FROM (v_decision.expiry_date - NOW())) / 86400;
    IF v_days_until_expiry BETWEEN -30 AND 30 THEN
      -- In critical expiry window - evaluate if not done in last 24 hours
      IF v_hours_since_eval > 24 THEN
        RETURN true;
      END IF;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION decision_needs_evaluation IS 'Check if decision needs re-evaluation based on staleness, expiry, and explicit flag';

-- ============================================================================
-- RPC ENDPOINT FOR BATCH EVALUATION CHECK
-- ============================================================================

-- Get all decisions that need evaluation (for batch processing)
CREATE OR REPLACE FUNCTION get_decisions_needing_evaluation(
  p_organization_id UUID,
  p_stale_hours INTEGER DEFAULT 24,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  decision_id UUID,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    CASE 
      WHEN d.needs_evaluation THEN 'explicit_flag'
      WHEN d.last_evaluated_at IS NULL THEN 'never_evaluated'
      WHEN EXTRACT(EPOCH FROM (NOW() - d.last_evaluated_at)) / 3600 > p_stale_hours THEN 'stale'
      WHEN d.expiry_date IS NOT NULL 
        AND EXTRACT(EPOCH FROM (d.expiry_date - NOW())) / 86400 BETWEEN -30 AND 30 THEN 'expiry_window'
      ELSE 'unknown'
    END
  FROM decisions d
  WHERE d.organization_id = p_organization_id
    AND d.lifecycle NOT IN ('RETIRED')
    AND decision_needs_evaluation(d.id, p_stale_hours)
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_decisions_needing_evaluation IS 'Get list of decisions that need evaluation with reason (respects organization isolation)';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
  -- Verify columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'last_evaluated_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: last_evaluated_at column not created';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decisions' AND column_name = 'needs_evaluation'
  ) THEN
    RAISE EXCEPTION 'Migration failed: needs_evaluation column not created';
  END IF;
  
  RAISE NOTICE 'Migration 018 completed successfully';
END $$;
