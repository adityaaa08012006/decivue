-- =====================================================
-- TEST ORGANIZATION ISOLATION
-- =====================================================
-- Run this script to verify that organizations are
-- properly isolated and users can only see their own data
-- =====================================================

-- 1. Check RLS is enabled on all tables
SELECT
  schemaname,
  tablename,
  CASE
    WHEN rowsecurity = true THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'organizations',
    'users',
    'decisions',
    'assumptions',
    'constraints',
    'decision_tensions',
    'evaluation_history',
    'decision_signals',
    'notifications',
    'parameter_templates',
    'organization_profiles',
    'decision_assumptions',
    'decision_constraints',
    'dependencies',
    'assumption_conflicts',
    'constraint_violations'
  )
ORDER BY tablename;

-- 2. Count policies per table
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 3. View all policies for critical tables
SELECT
  tablename,
  policyname,
  CASE
    WHEN cmd = 'SELECT' THEN 'SELECT'
    WHEN cmd = 'INSERT' THEN 'INSERT'
    WHEN cmd = 'UPDATE' THEN 'UPDATE'
    WHEN cmd = 'DELETE' THEN 'DELETE'
    WHEN cmd = '*' THEN 'ALL'
    ELSE cmd::text
  END as operation,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'users', 'decisions', 'assumptions')
ORDER BY tablename, operation;

-- 4. Check helper functions exist
SELECT
  proname as function_name,
  CASE
    WHEN proname IN ('user_organization_id', 'can_edit_decision', 'generate_org_code')
    THEN '✅ Exists'
    ELSE 'Unknown'
  END as status
FROM pg_proc
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND proname IN ('user_organization_id', 'can_edit_decision', 'generate_org_code');

-- 5. Test generate_org_code function
SELECT
  '✅ Function works: ' || generate_org_code() as test_result;

-- 6. View organizations (shows structure)
SELECT
  id,
  name,
  org_code,
  created_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- 7. View users per organization
SELECT
  o.name as organization_name,
  o.org_code,
  COUNT(u.id) as user_count,
  STRING_AGG(u.role, ', ') as roles
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
GROUP BY o.id, o.name, o.org_code
ORDER BY o.created_at DESC;

-- 8. View decisions per organization
SELECT
  o.name as organization_name,
  COUNT(d.id) as decision_count
FROM organizations o
LEFT JOIN decisions d ON d.organization_id = o.id
GROUP BY o.id, o.name
ORDER BY decision_count DESC;

-- 9. Check for any data without organization_id (should be empty)
DO $$
DECLARE
  orphan_count INTEGER;
  table_name TEXT;
BEGIN
  RAISE NOTICE '=== CHECKING FOR ORPHANED DATA (should all be 0) ===';

  FOR table_name IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN ('decisions', 'assumptions', 'constraints', 'notifications')
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE organization_id IS NULL', table_name)
    INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE NOTICE '❌ Table % has % records without organization_id', table_name, orphan_count;
    ELSE
      RAISE NOTICE '✅ Table % - all records have organization_id', table_name;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- 1. All tables should show "✅ Enabled" for RLS
-- 2. Each table should have 1-4 policies
-- 3. Helper functions should exist
-- 4. generate_org_code should return a code like "ORG-XXXX"
-- 5. No orphaned data (all records have organization_id)
-- =====================================================
