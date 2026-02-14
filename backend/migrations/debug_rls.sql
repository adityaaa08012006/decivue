-- =====================================================
-- DEBUG RLS - Check if RLS is properly configured
-- =====================================================

-- 1. Check if RLS is enabled on decisions table
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('decisions', 'assumptions', 'constraints', 'organizations', 'users')
  AND schemaname = 'public';

-- 2. List all RLS policies on decisions table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'decisions';

-- 3. List all RLS policies on assumptions table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'assumptions';

-- 4. Test: Show all decisions with their organization_id
SELECT
  id,
  title,
  organization_id,
  created_by,
  created_at
FROM decisions
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test: Show all organizations
SELECT
  id,
  name,
  org_code,
  created_at
FROM organizations
ORDER BY created_at;

-- =====================================================
-- WHAT TO LOOK FOR:
-- =====================================================
-- 1. rls_enabled should be TRUE for all tables
-- 2. Should see policies like "Users can view their org's decisions"
-- 3. All decisions should have organization_id (not NULL)
-- 4. Each organization should have unique id
-- =====================================================
