-- =====================================================
-- CLEANUP OLD DATA WITHOUT ORGANIZATION_ID
-- =====================================================
-- This script removes or migrates existing data that was
-- created before the multi-organization feature was added.
-- =====================================================
--
-- IMPORTANT: Run this AFTER migration 007 is complete
-- and AFTER you've created at least one organization.
--
-- =====================================================

-- =====================================================
-- OPTION 1: DELETE ALL OLD DATA (Clean Start)
-- =====================================================
-- Use this if you want to completely clear old test data

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DELETING OLD DATA WITHOUT ORGANIZATION_ID ===';

  -- Delete decisions without organization_id
  DELETE FROM decisions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decisions without organization_id', deleted_count;

  -- Delete assumptions without organization_id
  DELETE FROM assumptions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % assumptions without organization_id', deleted_count;

  -- Delete constraints without organization_id
  DELETE FROM constraints WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % constraints without organization_id', deleted_count;

  -- Delete decision_tensions without organization_id
  DELETE FROM decision_tensions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decision_tensions without organization_id', deleted_count;

  -- Delete evaluation_history without organization_id
  DELETE FROM evaluation_history WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % evaluation_history records without organization_id', deleted_count;

  -- Delete decision_signals without organization_id
  DELETE FROM decision_signals WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decision_signals without organization_id', deleted_count;

  -- Delete notifications without organization_id
  DELETE FROM notifications WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % notifications without organization_id', deleted_count;

  -- Delete parameter_templates without organization_id
  DELETE FROM parameter_templates WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % parameter_templates without organization_id', deleted_count;

  RAISE NOTICE '=== CLEANUP COMPLETE ===';
END $$;

-- =====================================================
-- VERIFICATION: Check for remaining orphaned data
-- =====================================================

DO $$
DECLARE
  orphan_count INTEGER;
  table_name TEXT;
BEGIN
  RAISE NOTICE '=== VERIFYING NO ORPHANED DATA REMAINS ===';

  FOR table_name IN
    SELECT unnest(ARRAY[
      'decisions',
      'assumptions',
      'constraints',
      'decision_tensions',
      'evaluation_history',
      'decision_signals',
      'notifications',
      'parameter_templates'
    ])
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL', table_name)
    INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE NOTICE '⚠️  Table % still has % records without organization_id', table_name, orphan_count;
    ELSE
      RAISE NOTICE '✅ Table % - all records have organization_id', table_name;
    END IF;
  END LOOP;

  RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;

-- =====================================================
-- ALTERNATIVE: MIGRATE OLD DATA TO FIRST ORGANIZATION
-- =====================================================
-- Uncomment this section if you want to keep existing data
-- and assign it to the first organization created
-- (Only use this if you have valuable existing data)

/*
DO $$
DECLARE
  first_org_id UUID;
  updated_count INTEGER;
BEGIN
  -- Get the first organization ID
  SELECT id INTO first_org_id
  FROM organizations
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_org_id IS NULL THEN
    RAISE EXCEPTION 'No organizations found. Create an organization first.';
  END IF;

  RAISE NOTICE '=== MIGRATING OLD DATA TO ORGANIZATION: % ===', first_org_id;

  -- Update decisions
  UPDATE decisions SET organization_id = first_org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % decisions', updated_count;

  -- Update assumptions
  UPDATE assumptions SET organization_id = first_org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % assumptions', updated_count;

  -- Update constraints
  UPDATE constraints SET organization_id = first_org_id WHERE organization_id IS NULL;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % constraints', updated_count;

  -- Update other tables...
  UPDATE decision_tensions SET organization_id = first_org_id WHERE organization_id IS NULL;
  UPDATE evaluation_history SET organization_id = first_org_id WHERE organization_id IS NULL;
  UPDATE decision_signals SET organization_id = first_org_id WHERE organization_id IS NULL;
  UPDATE notifications SET organization_id = first_org_id WHERE organization_id IS NULL;
  UPDATE parameter_templates SET organization_id = first_org_id WHERE organization_id IS NULL;

  RAISE NOTICE '=== MIGRATION COMPLETE ===';
END $$;
*/

-- =====================================================
-- FINAL CHECK: Show data distribution by organization
-- =====================================================

SELECT
  o.name as organization_name,
  o.org_code,
  COUNT(DISTINCT d.id) as decisions_count,
  COUNT(DISTINCT a.id) as assumptions_count
FROM organizations o
LEFT JOIN decisions d ON d.organization_id = o.id
LEFT JOIN assumptions a ON a.organization_id = o.id
GROUP BY o.id, o.name, o.org_code
ORDER BY o.created_at;

-- =====================================================
-- CLEANUP SCRIPT COMPLETE!
-- =====================================================
