-- =====================================================
-- SIMPLE DATA CLEANUP - STEP 1 ONLY
-- =====================================================
-- This script ONLY deletes orphaned data (no organization_id)
-- Safe to run - won't delete valid organizations or users
-- =====================================================

-- Delete decisions without organization_id
DELETE FROM decisions WHERE organization_id IS NULL;

-- Delete assumptions without organization_id
DELETE FROM assumptions WHERE organization_id IS NULL;

-- Delete constraints without organization_id
DELETE FROM constraints WHERE organization_id IS NULL;

-- Delete decision_tensions without organization_id
DELETE FROM decision_tensions WHERE organization_id IS NULL;

-- Delete evaluation_history without organization_id
DELETE FROM evaluation_history WHERE organization_id IS NULL;

-- Delete decision_signals without organization_id
DELETE FROM decision_signals WHERE organization_id IS NULL;

-- Delete notifications without organization_id
DELETE FROM notifications WHERE organization_id IS NULL;

-- Delete parameter_templates without organization_id
DELETE FROM parameter_templates WHERE organization_id IS NULL;

-- Delete dependencies without organization_id
DELETE FROM dependencies WHERE organization_id IS NULL;

-- Delete assumption_conflicts without organization_id
DELETE FROM assumption_conflicts WHERE organization_id IS NULL;

-- Delete constraint_violations without organization_id
DELETE FROM constraint_violations WHERE organization_id IS NULL;

-- =====================================================
-- VERIFICATION: Check for remaining orphaned data
-- =====================================================

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

SELECT 'decision_tensions', COUNT(*)
FROM decision_tensions
WHERE organization_id IS NULL

UNION ALL

SELECT 'evaluation_history', COUNT(*)
FROM evaluation_history
WHERE organization_id IS NULL

UNION ALL

SELECT 'decision_signals', COUNT(*)
FROM decision_signals
WHERE organization_id IS NULL

UNION ALL

SELECT 'notifications', COUNT(*)
FROM notifications
WHERE organization_id IS NULL

UNION ALL

SELECT 'parameter_templates', COUNT(*)
FROM parameter_templates
WHERE organization_id IS NULL

UNION ALL

SELECT 'dependencies', COUNT(*)
FROM dependencies
WHERE organization_id IS NULL

UNION ALL

SELECT 'assumption_conflicts', COUNT(*)
FROM assumption_conflicts
WHERE organization_id IS NULL

UNION ALL

SELECT 'constraint_violations', COUNT(*)
FROM constraint_violations
WHERE organization_id IS NULL;

-- =====================================================
-- Show remaining organizations and their data
-- =====================================================

SELECT
  o.name as organization_name,
  o.org_code,
  o.created_at,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as users_count,
  (SELECT COUNT(*) FROM decisions WHERE organization_id = o.id) as decisions_count,
  (SELECT COUNT(*) FROM assumptions WHERE organization_id = o.id) as assumptions_count
FROM organizations o
ORDER BY o.created_at;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- 1. All orphaned_count should be 0
-- 2. Each organization should show separate data counts
-- 3. No NULL organization_id values should remain
-- =====================================================
