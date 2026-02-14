-- =====================================================
-- COMPLETE DATA CLEANUP & RESET
-- =====================================================
-- This script:
-- 1. Deletes ALL old data without organization_id
-- 2. Optionally deletes test users/organizations
-- 3. Ensures fresh start for new organizations
-- 4. Verifies complete isolation
-- =====================================================

-- =====================================================
-- STEP 1: DELETE ALL ORPHANED DATA (NO ORGANIZATION_ID)
-- =====================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DELETING ALL ORPHANED DATA ===';

  -- Delete decisions without organization_id
  DELETE FROM decisions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decisions', deleted_count;

  -- Delete assumptions without organization_id
  DELETE FROM assumptions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % assumptions', deleted_count;

  -- Delete constraints without organization_id
  DELETE FROM constraints WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % constraints', deleted_count;

  -- Delete decision_tensions without organization_id
  DELETE FROM decision_tensions WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decision_tensions', deleted_count;

  -- Delete evaluation_history without organization_id
  DELETE FROM evaluation_history WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % evaluation_history', deleted_count;

  -- Delete decision_signals without organization_id
  DELETE FROM decision_signals WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % decision_signals', deleted_count;

  -- Delete notifications without organization_id
  DELETE FROM notifications WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % notifications', deleted_count;

  -- Delete parameter_templates without organization_id
  DELETE FROM parameter_templates WHERE organization_id IS NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % parameter_templates', deleted_count;

  RAISE NOTICE '=== ORPHANED DATA CLEANUP COMPLETE ===';
END $$;

-- =====================================================
-- STEP 2: OPTIONAL - DELETE TEST ORGANIZATIONS
-- =====================================================
-- Uncomment this section to delete specific test organizations
-- Be careful! This will delete entire organizations and all their data

/*
DO $$
DECLARE
  test_org_ids UUID[];
  org_id UUID;
  deleted_count INTEGER;
BEGIN
  RAISE NOTICE '=== DELETING TEST ORGANIZATIONS ===';

  -- Find test organizations (adjust criteria as needed)
  SELECT ARRAY_AGG(id) INTO test_org_ids
  FROM organizations
  WHERE
    -- Delete organizations with test emails
    created_by IN (
      SELECT id FROM auth.users
      WHERE email LIKE '%test%@%'
         OR email LIKE '%example.com%'
         OR email LIKE '%demo%@%'
    )
    -- Or delete organizations created before a certain date
    -- OR created_at < '2026-02-14'::timestamp
    -- Or delete organizations with specific names
    -- OR name LIKE '%Test%'
    -- Or delete ALL organizations except specific ones
    -- AND name NOT IN ('My Real Organization');

  IF test_org_ids IS NOT NULL THEN
    RAISE NOTICE 'Found % test organizations to delete', array_length(test_org_ids, 1);

    FOREACH org_id IN ARRAY test_org_ids
    LOOP
      RAISE NOTICE 'Deleting organization: %', org_id;

      -- Delete all data for this organization
      DELETE FROM decisions WHERE organization_id = org_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RAISE NOTICE '  - Deleted % decisions', deleted_count;

      DELETE FROM assumptions WHERE organization_id = org_id;
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RAISE NOTICE '  - Deleted % assumptions', deleted_count;

      DELETE FROM constraints WHERE organization_id = org_id;
      DELETE FROM decision_tensions WHERE organization_id = org_id;
      DELETE FROM evaluation_history WHERE organization_id = org_id;
      DELETE FROM decision_signals WHERE organization_id = org_id;
      DELETE FROM notifications WHERE organization_id = org_id;
      DELETE FROM parameter_templates WHERE organization_id = org_id;
      DELETE FROM organization_profiles WHERE organization_id = org_id;

      -- Delete users in this organization
      DELETE FROM users WHERE organization_id = org_id;

      -- Delete the organization itself
      DELETE FROM organizations WHERE id = org_id;
      RAISE NOTICE '  - Organization deleted';
    END LOOP;
  ELSE
    RAISE NOTICE 'No test organizations found';
  END IF;

  RAISE NOTICE '=== TEST ORGANIZATIONS CLEANUP COMPLETE ===';
END $$;
*/

-- =====================================================
-- STEP 3: DELETE TEST AUTH USERS
-- =====================================================
-- This deletes users from Supabase Auth
-- Uncomment to delete test users from auth.users

/*
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  RAISE NOTICE '=== DELETING TEST AUTH USERS ===';

  FOR test_user_id IN
    SELECT id FROM auth.users
    WHERE email LIKE '%test%@%'
       OR email LIKE '%example.com%'
       OR email LIKE '%demo%@%'
  LOOP
    RAISE NOTICE 'Deleting auth user: %', test_user_id;
    -- Note: This requires admin privileges
    -- Delete from auth schema
    DELETE FROM auth.users WHERE id = test_user_id;
  END LOOP;

  RAISE NOTICE '=== TEST AUTH USERS CLEANUP COMPLETE ===';
END $$;
*/

-- =====================================================
-- STEP 4: VERIFICATION - CHECK DATA ISOLATION
-- =====================================================

-- Show remaining organizations and their data
SELECT
  'ORGANIZATIONS' as table_name,
  o.name as organization_name,
  o.org_code,
  o.created_at,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email
FROM organizations o
ORDER BY o.created_at;

-- Show data distribution per organization
SELECT
  'DATA DISTRIBUTION' as report,
  o.name as organization_name,
  o.org_code,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT d.id) as decisions,
  COUNT(DISTINCT a.id) as assumptions,
  COUNT(DISTINCT c.id) as constraints
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN decisions d ON d.organization_id = o.id
LEFT JOIN assumptions a ON a.organization_id = o.id
LEFT JOIN constraints c ON c.organization_id = o.id
GROUP BY o.id, o.name, o.org_code
ORDER BY o.created_at;

-- Check for any remaining orphaned data
DO $$
DECLARE
  orphan_count INTEGER;
  table_name TEXT;
  total_orphans INTEGER := 0;
BEGIN
  RAISE NOTICE '=== CHECKING FOR REMAINING ORPHANED DATA ===';

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
      RAISE NOTICE '⚠️  Table % has % orphaned records', table_name, orphan_count;
      total_orphans := total_orphans + orphan_count;
    ELSE
      RAISE NOTICE '✅ Table % - clean', table_name;
    END IF;
  END LOOP;

  IF total_orphans > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  TOTAL ORPHANED RECORDS: %', total_orphans;
    RAISE NOTICE '⚠️  Run this script again to clean them';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '✅ NO ORPHANED DATA - CLEANUP SUCCESSFUL!';
  END IF;
END $$;

-- =====================================================
-- STEP 5: VERIFY USER ISOLATION
-- =====================================================

-- Show all users and their organizations
SELECT
  'USER LIST' as report,
  u.email,
  u.full_name,
  u.role,
  o.name as organization_name,
  o.org_code,
  u.created_at
FROM users u
JOIN organizations o ON o.id = u.organization_id
ORDER BY o.name, u.created_at;

-- =====================================================
-- CLEANUP COMPLETE!
-- =====================================================
-- Expected Results:
-- 1. All orphaned data deleted
-- 2. Only valid organizations with organization_id remain
-- 3. Each user belongs to exactly one organization
-- 4. No data is shared between organizations
-- =====================================================

-- =====================================================
-- IMPORTANT NOTES:
-- =====================================================
-- After running this script:
--
-- 1. NEW SIGNUPS:
--    - Will create a fresh organization
--    - Will start with zero decisions/assumptions
--    - Will have unique organization code
--    - Will be completely isolated
--
-- 2. EXISTING LOGINS:
--    - Will only see their organization's data
--    - Will retrieve all their previous decisions/assumptions
--    - Will NOT see data from other organizations
--
-- 3. DATA ISOLATION:
--    - RLS policies enforce organization boundaries
--    - Each user identified by email
--    - Each organization has unique data
--    - No cross-contamination possible
-- =====================================================
