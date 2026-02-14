-- =====================================================
-- OPTIONAL: DELETE TEST ORGANIZATIONS
-- =====================================================
-- ONLY run this if you want to delete test organizations
-- This will delete entire organizations and all their data
-- BE CAREFUL - This is irreversible!
-- =====================================================

-- STEP 1: Find test organizations
-- Review this list before deleting!
SELECT
  o.id,
  o.name as org_name,
  o.org_code,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count,
  (SELECT COUNT(*) FROM decisions WHERE organization_id = o.id) as decision_count,
  o.created_at
FROM organizations o
WHERE
  -- Organizations created by test emails
  o.created_by IN (
    SELECT id FROM auth.users
    WHERE email LIKE '%test%@%'
       OR email LIKE '%example.com%'
       OR email LIKE '%demo%@%'
  )
  -- Or organizations with test names
  OR o.name LIKE '%Test%'
  OR o.name LIKE '%test%'
  OR o.name LIKE '%Demo%'
ORDER BY o.created_at;

-- =====================================================
-- STEP 2: Delete data for specific test organization
-- =====================================================
-- Replace 'YOUR-ORG-ID-HERE' with actual organization ID from STEP 1
-- Uncomment and run each section separately

/*
-- Set the organization ID to delete
-- REPLACE THIS WITH YOUR ACTUAL ORG ID!
-- Example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM decisions
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM assumptions
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM constraints
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM dependencies
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM decision_tensions
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM evaluation_history
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM decision_signals
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM notifications
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM parameter_templates
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM assumption_conflicts
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM constraint_violations
WHERE organization_id = (SELECT org_id FROM org_to_delete);

WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM organization_profiles
WHERE organization_id = (SELECT org_id FROM org_to_delete);

-- Delete users in this organization
WITH org_to_delete AS (
  SELECT 'YOUR-ORG-ID-HERE'::uuid as org_id
)
DELETE FROM users
WHERE organization_id = (SELECT org_id FROM org_to_delete);

-- Finally, delete the organization itself
DELETE FROM organizations
WHERE id = 'YOUR-ORG-ID-HERE'::uuid;
*/

-- =====================================================
-- STEP 3: Verify organization was deleted
-- =====================================================

SELECT
  o.name as org_name,
  o.org_code,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as users,
  (SELECT COUNT(*) FROM decisions WHERE organization_id = o.id) as decisions
FROM organizations o
ORDER BY o.created_at;

-- =====================================================
-- NOTES:
-- =====================================================
-- To delete a test organization:
-- 1. Run STEP 1 to see test organizations
-- 2. Copy the UUID of the organization to delete
-- 3. Uncomment STEP 2
-- 4. Replace 'YOUR-ORG-ID-HERE' with the actual UUID (in ALL places)
-- 5. Run STEP 2 to delete all data
-- 6. Run STEP 3 to verify it's gone
--
-- Repeat for each test organization you want to delete
-- =====================================================
