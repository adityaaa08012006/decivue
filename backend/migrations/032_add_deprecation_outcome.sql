-- Migration: Add Deprecation Outcome Tracking
-- Adds fields to capture outcome and conclusions when decisions are deprecated
-- This enables warnings about similar decisions that failed in the past

-- Add deprecation outcome fields to decisions table
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS deprecation_outcome TEXT 
    CHECK (deprecation_outcome IN ('failed', 'succeeded', 'partially_succeeded', 'superseded', 'no_longer_relevant')),
  ADD COLUMN IF NOT EXISTS deprecation_conclusions JSONB DEFAULT '{}';

-- Add index for quick lookup of failed deprecated decisions
CREATE INDEX IF NOT EXISTS idx_decisions_deprecated_failed 
  ON decisions(deprecation_outcome, lifecycle) 
  WHERE lifecycle IN ('RETIRED', 'INVALIDATED') 
    AND deprecation_outcome = 'failed';

-- Comments for documentation
COMMENT ON COLUMN decisions.deprecation_outcome IS 'Outcome of the decision when deprecated: failed (did not work out), succeeded (completed successfully), partially_succeeded, superseded (replaced by better decision), no_longer_relevant';
COMMENT ON COLUMN decisions.deprecation_conclusions IS 'Structured conclusions about the deprecation: { what_happened, why_outcome, lessons_learned, key_issues, recommendations, failure_reasons }';

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 032: Added deprecation outcome tracking';
  RAISE NOTICE '   - Added deprecation_outcome column to decisions';
  RAISE NOTICE '   - Added deprecation_conclusions JSONB column to decisions';
  RAISE NOTICE '   - Created index for failed deprecated decisions';
  RAISE NOTICE '   - This enables warning users about similar decisions that failed in the past';
END $$;
