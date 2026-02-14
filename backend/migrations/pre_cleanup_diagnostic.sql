-- =====================================================
-- PRE-CLEANUP DIAGNOSTIC
-- =====================================================
-- Run this BEFORE cleanup to see what will be deleted
-- =====================================================

-- 1. Check for orphaned data (will be deleted)
SELECT
  'ORPHANED DATA (will be deleted)' as status,
  'decisions' as table_name,
  COUNT(*) as count
FROM decisions
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'assumptions', COUNT(*)
FROM assumptions
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'constraints', COUNT(*)
FROM constraints
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'decision_tensions', COUNT(*)
FROM decision_tensions
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'evaluation_history', COUNT(*)
FROM evaluation_history
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'decision_signals', COUNT(*)
FROM decision_signals
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'notifications', COUNT(*)
FROM notifications
WHERE organization_id IS NULL

UNION ALL

SELECT 'ORPHANED DATA (will be deleted)', 'parameter_templates', COUNT(*)
FROM parameter_templates
WHERE organization_id IS NULL;

-- 2. Show all organizations
SELECT
  '=== ALL ORGANIZATIONS ===' as section,
  o.name as organization_name,
  o.org_code,
  o.created_at,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
  (SELECT COUNT(*) FROM decisions WHERE organization_id = o.id) as decision_count,
  (SELECT COUNT(*) FROM assumptions WHERE organization_id = o.id) as assumption_count
FROM organizations o
ORDER BY o.created_at;

-- 3. Show all users and their organizations
SELECT
  '=== ALL USERS ===' as section,
  u.email,
  u.full_name,
  u.role,
  o.name as organization_name,
  o.org_code,
  u.created_at
FROM users u
LEFT JOIN organizations o ON o.id = u.organization_id
ORDER BY u.created_at;

-- 4. Find potential test organizations
SELECT
  '=== POTENTIAL TEST ORGANIZATIONS ===' as section,
  o.name as organization_name,
  o.org_code,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  o.created_at,
  CASE
    WHEN (SELECT email FROM auth.users WHERE id = o.created_by) LIKE '%test%' THEN 'Test email'
    WHEN (SELECT email FROM auth.users WHERE id = o.created_by) LIKE '%example.com%' THEN 'Example email'
    WHEN o.name LIKE '%Test%' THEN 'Test org name'
    ELSE 'Unknown'
  END as reason
FROM organizations o
WHERE
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = o.created_by
      AND (
        email LIKE '%test%@%'
        OR email LIKE '%example.com%'
        OR email LIKE '%demo%@%'
      )
  )
  OR o.name LIKE '%Test%'
ORDER BY o.created_at;

-- 5. Summary
SELECT
  '=== SUMMARY ===' as section,
  (SELECT COUNT(*) FROM organizations) as total_organizations,
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM decisions) as total_decisions,
  (SELECT COUNT(*) FROM assumptions) as total_assumptions,
  (SELECT COUNT(*) FROM decisions WHERE organization_id IS NULL) as orphaned_decisions,
  (SELECT COUNT(*) FROM assumptions WHERE organization_id IS NULL) as orphaned_assumptions;

-- =====================================================
-- INTERPRETATION:
-- =====================================================
-- - Rows with "ORPHANED DATA" will be deleted
-- - Organizations with test emails may need manual review
-- - Users in test organizations will be deleted if you uncomment that section
-- - After cleanup, only valid organizations with proper isolation will remain
-- =====================================================
