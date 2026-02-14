-- =====================================================
-- NUCLEAR OPTION - DELETE EVERYTHING
-- =====================================================
-- This will delete ALL organizations and ALL data
-- Use this to start completely fresh
-- WARNING: This is irreversible!
-- =====================================================

-- Step 1: Delete all data from all tables
DELETE FROM constraint_violations;
DELETE FROM assumption_conflicts;
DELETE FROM decision_signals;
DELETE FROM evaluation_history;
DELETE FROM decision_tensions;
DELETE FROM notifications;
DELETE FROM parameter_templates;
DELETE FROM dependencies;
DELETE FROM constraints;
DELETE FROM assumptions;
DELETE FROM decisions;
DELETE FROM organization_profiles;

-- Step 2: Delete all users from public.users table
DELETE FROM users;

-- Step 3: Delete all organizations
DELETE FROM organizations;

-- =====================================================
-- VERIFICATION - Should show all zeros
-- =====================================================

SELECT 'POST-CLEANUP CHECK' as status;

SELECT
  'organizations' as table_name,
  COUNT(*) as remaining_count
FROM organizations

UNION ALL

SELECT 'users', COUNT(*)
FROM users

UNION ALL

SELECT 'decisions', COUNT(*)
FROM decisions

UNION ALL

SELECT 'assumptions', COUNT(*)
FROM assumptions

UNION ALL

SELECT 'constraints', COUNT(*)
FROM constraints

UNION ALL

SELECT 'dependencies', COUNT(*)
FROM dependencies

UNION ALL

SELECT 'decision_tensions', COUNT(*)
FROM decision_tensions

UNION ALL

SELECT 'evaluation_history', COUNT(*)
FROM evaluation_history

UNION ALL

SELECT 'decision_signals', COUNT(*)
FROM decision_signals

UNION ALL

SELECT 'notifications', COUNT(*)
FROM notifications

UNION ALL

SELECT 'parameter_templates', COUNT(*)
FROM parameter_templates

UNION ALL

SELECT 'assumption_conflicts', COUNT(*)
FROM assumption_conflicts

UNION ALL

SELECT 'constraint_violations', COUNT(*)
FROM constraint_violations

UNION ALL

SELECT 'organization_profiles', COUNT(*)
FROM organization_profiles;

-- =====================================================
-- EXPECTED RESULT:
-- All counts should be 0
-- =====================================================

-- =====================================================
-- NOTE ABOUT AUTH USERS:
-- =====================================================
-- This script does NOT delete from auth.users
-- Those users can still login but will get errors
--
-- To delete auth users, go to:
-- Supabase Dashboard → Authentication → Users
-- Manually delete users from the UI
--
-- Or run this (may need special permissions):
-- DELETE FROM auth.users;
-- =====================================================
