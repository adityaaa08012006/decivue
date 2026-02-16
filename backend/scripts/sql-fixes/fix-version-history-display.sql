-- ============================================================================
-- FIX VERSION HISTORY DISPLAY ISSUES
-- ============================================================================
-- This script fixes two issues:
-- 1. Timeline not showing proper content (only icons + timestamps)
-- 2. Changed_fields stored as plain text instead of JSONB array
-- ============================================================================

-- ============================================================================
-- PART 1: Fix changed_fields format in existing data
-- ============================================================================

-- Check current state of changed_fields
DO $$
DECLARE
  bad_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bad_count
  FROM decision_versions
  WHERE changed_fields IS NOT NULL 
    AND jsonb_typeof(changed_fields) = 'string';
  
  RAISE NOTICE 'Found % records with string-format changed_fields that need fixing', bad_count;
END $$;

-- Fix records that have string format instead of array
UPDATE decision_versions
SET changed_fields = 
  CASE 
    WHEN jsonb_typeof(changed_fields) = 'string' THEN
      -- Convert "description,category" to ["description", "category"]
      -- First remove quotes, then split by comma
      to_jsonb(string_to_array(
        REPLACE(REPLACE(changed_fields::text, '"', ''), '''', ''),
        ','
      ))
    ELSE 
      changed_fields
  END
WHERE changed_fields IS NOT NULL 
  AND jsonb_typeof(changed_fields) = 'string';

-- ============================================================================
-- PART 2: Fix get_decision_change_timeline function structure
-- ============================================================================

DROP FUNCTION IF EXISTS get_decision_change_timeline(UUID);

CREATE OR REPLACE FUNCTION get_decision_change_timeline(p_decision_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_type TEXT,
  event_time TIMESTAMPTZ,
  summary TEXT,
  changed_by_email TEXT,
  details JSONB
) AS $$
BEGIN
  RETURN QUERY
  -- Field changes from decision_versions
  SELECT 
    dv.id AS event_id,
    'field_change'::TEXT AS event_type,
    dv.changed_at AS event_time,
    COALESCE(dv.change_summary, 'Decision updated') AS summary,
    u.email AS changed_by_email,
    jsonb_build_object(
      'changed_fields', dv.changed_fields,
      'lifecycle', dv.lifecycle,
      'health_signal', dv.health_signal,
      'version_number', dv.version_number,
      'change_type', dv.change_type
    ) AS details
  FROM decision_versions dv
  LEFT JOIN users u ON dv.changed_by = u.id
  WHERE dv.decision_id = p_decision_id
  
  UNION ALL
  
  -- Relation changes (assumptions/constraints linked/unlinked)
  SELECT 
    drc.id AS event_id,
    'relation_change'::TEXT AS event_type,
    drc.changed_at AS event_time,
    CASE 
      WHEN drc.action = 'linked' THEN 
        CASE drc.relation_type
          WHEN 'assumption' THEN 'Linked assumption'
          WHEN 'constraint' THEN 'Linked constraint'
          ELSE 'Linked ' || drc.relation_type
        END
      ELSE 
        CASE drc.relation_type
          WHEN 'assumption' THEN 'Unlinked assumption'
          WHEN 'constraint' THEN 'Unlinked constraint'
          ELSE 'Unlinked ' || drc.relation_type
        END
    END AS summary,
    u.email AS changed_by_email,
    jsonb_build_object(
      'relation_type', drc.relation_type,
      'action', drc.action,
      'relation_description', drc.relation_description,
      'reason', drc.reason
    ) AS details
  FROM decision_relation_changes drc
  LEFT JOIN users u ON drc.changed_by = u.id
  WHERE drc.decision_id = p_decision_id
  
  UNION ALL
  
  -- Health signal changes from evaluation_history
  SELECT 
    eh.id AS event_id,
    'health_change'::TEXT AS event_type,
    eh.evaluated_at AS event_time,
    'Health signal updated from ' || eh.old_health_signal || '% to ' || eh.new_health_signal || '%' AS summary,
    NULL::TEXT AS changed_by_email,
    jsonb_build_object(
      'old_health_signal', eh.old_health_signal,
      'new_health_signal', eh.new_health_signal,
      'old_lifecycle', eh.old_lifecycle,
      'new_lifecycle', eh.new_lifecycle,
      'change_explanation', eh.change_explanation,
      'triggered_by', eh.triggered_by
    ) AS details
  FROM evaluation_history eh
  WHERE eh.decision_id = p_decision_id
  
  ORDER BY event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_decision_change_timeline IS 'Returns unified timeline of all changes to a decision with frontend-friendly structure';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify changed_fields are now arrays
DO $$
DECLARE
  string_count INTEGER;
  array_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM decision_versions WHERE changed_fields IS NOT NULL;
  SELECT COUNT(*) INTO array_count FROM decision_versions 
    WHERE changed_fields IS NOT NULL AND jsonb_typeof(changed_fields) = 'array';
  SELECT COUNT(*) INTO string_count FROM decision_versions 
    WHERE changed_fields IS NOT NULL AND jsonb_typeof(changed_fields) = 'string';
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Verification Results:';
  RAISE NOTICE 'Total records with changed_fields: %', total_count;
  RAISE NOTICE 'Array format (correct): %', array_count;
  RAISE NOTICE 'String format (still broken): %', string_count;
  RAISE NOTICE '====================================';
  
  IF string_count > 0 THEN
    RAISE WARNING 'Still have % records in wrong format!', string_count;
  ELSE
    RAISE NOTICE 'All changed_fields are now properly formatted! ✓';
  END IF;
END $$;

-- Show sample timeline data
DO $$
DECLARE
  sample_decision_id UUID;
BEGIN
  SELECT id INTO sample_decision_id FROM decisions LIMIT 1;
  
  IF sample_decision_id IS NOT NULL THEN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Sample timeline for decision: %', sample_decision_id;
    RAISE NOTICE 'Run this query to test:';
    RAISE NOTICE 'SELECT * FROM get_decision_change_timeline(''%'');', sample_decision_id;
    RAISE NOTICE '====================================';
  END IF;
END $$;
