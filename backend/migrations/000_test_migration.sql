-- Run this script in Supabase SQL Editor to diagnose registration issues

-- 1. Check if organizations table exists
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'organizations')
    THEN '✅ organizations table exists'
    ELSE '❌ organizations table MISSING - Run migration!'
  END as organizations_check;

-- 2. Check if users table exists
SELECT
  CASE
    WHEN EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')
    THEN '✅ users table exists'
    ELSE '❌ users table MISSING - Run migration!'
  END as users_check;

-- 3. Check if generate_org_code function exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'generate_org_code'
    )
    THEN '✅ generate_org_code function exists'
    ELSE '❌ generate_org_code function MISSING - Run migration!'
  END as function_check;

-- 4. Test generate_org_code function (only if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_org_code'
  ) THEN
    RAISE NOTICE 'Testing generate_org_code: %', generate_org_code();
  ELSE
    RAISE NOTICE '❌ Cannot test - function does not exist';
  END IF;
END $$;

-- 5. Check if RLS is enabled
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS enabled' ELSE '⚠️ RLS disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('organizations', 'users', 'decisions')
ORDER BY tablename;

-- 6. Check if helper functions exist
SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'user_organization_id'
    )
    THEN '✅ user_organization_id function exists'
    ELSE '❌ user_organization_id function MISSING'
  END as user_org_function_check;

SELECT
  CASE
    WHEN EXISTS (
      SELECT FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = 'can_edit_decision'
    )
    THEN '✅ can_edit_decision function exists'
    ELSE '❌ can_edit_decision function MISSING'
  END as can_edit_function_check;
