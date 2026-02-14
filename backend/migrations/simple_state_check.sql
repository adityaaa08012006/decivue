-- =====================================================
-- SIMPLE DATABASE STATE CHECK
-- =====================================================
-- This doesn't require authentication
-- Run this to see current state of database
-- =====================================================

-- 1. Count all records across all tables
SELECT 'TOTAL RECORD COUNTS' as section;

SELECT
  'organizations' as table_name,
  COUNT(*) as total_count
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

SELECT 'notifications', COUNT(*)
FROM notifications

UNION ALL

SELECT 'parameter_templates', COUNT(*)
FROM parameter_templates;

-- 2. Check for orphaned data
SELECT 'ORPHANED DATA CHECK' as section;

SELECT
  'decisions' as table_name,
  COUNT(*) as orphaned_count
FROM decisions
WHERE organization_id IS NULL

UNION ALL

SELECT 'assumptions', COUNT(*)
FROM assumptions
WHERE organization_id IS NULL

UNION ALL

SELECT 'constraints', COUNT(*)
FROM constraints
WHERE organization_id IS NULL

UNION ALL

SELECT 'dependencies', COUNT(*)
FROM dependencies
WHERE organization_id IS NULL

UNION ALL

SELECT 'notifications', COUNT(*)
FROM notifications
WHERE organization_id IS NULL;

-- 3. List all organizations with data counts
SELECT 'ORGANIZATION DATA SUMMARY' as section;

SELECT
  o.name as org_name,
  o.org_code,
  o.created_at,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
  (SELECT COUNT(*) FROM decisions WHERE organization_id = o.id) as decision_count,
  (SELECT COUNT(*) FROM assumptions WHERE organization_id = o.id) as assumption_count,
  (SELECT COUNT(*) FROM constraints WHERE organization_id = o.id) as constraint_count
FROM organizations o
ORDER BY o.created_at;

-- 4. List all users with their organizations
SELECT 'USER LIST' as section;

SELECT
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
-- WHAT TO LOOK FOR:
-- =====================================================
-- 1. TOTAL RECORD COUNTS:
--    - If all are 0, database is empty (ready for fresh start)
--    - If some have counts, show which orgs have data
--
-- 2. ORPHANED DATA CHECK:
--    - ALL should be 0
--    - If any > 0, run cleanup script again
--
-- 3. ORGANIZATION DATA SUMMARY:
--    - Shows each organization and their data
--    - Use this to identify test vs real organizations
--
-- 4. USER LIST:
--    - Shows all users and which org they belong to
--    - Helps identify which accounts to keep/delete
-- =====================================================
