-- =====================================================
-- USER ISOLATION VERIFICATION
-- =====================================================
-- Run this as different users to verify complete isolation
-- =====================================================

-- 1. Show current logged-in user info
SELECT
  'CURRENT USER' as info,
  auth.uid() as user_id,
  auth.email() as email,
  public.user_organization_id() as organization_id;

-- 2. Show what THIS user can see
SELECT
  'MY ORGANIZATION' as info,
  o.*
FROM organizations o
WHERE id = public.user_organization_id();

-- 3. Show users in MY organization
SELECT
  'MY TEAM MEMBERS' as info,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM users u
WHERE organization_id = public.user_organization_id()
ORDER BY u.created_at;

-- 4. Show MY decisions
SELECT
  'MY DECISIONS' as info,
  d.title,
  d.status,
  d.created_at,
  (SELECT email FROM users WHERE id = d.created_by) as creator
FROM decisions d
WHERE organization_id = public.user_organization_id()
ORDER BY d.created_at DESC
LIMIT 10;

-- 5. Show MY assumptions
SELECT
  'MY ASSUMPTIONS' as info,
  a.description,
  a.status,
  a.created_at
FROM assumptions a
WHERE organization_id = public.user_organization_id()
ORDER BY a.created_at DESC
LIMIT 10;

-- 6. Verify I CANNOT see other organizations' data
SELECT
  'OTHER ORGANIZATIONS (Should be empty)' as info,
  o.name,
  o.org_code
FROM organizations o
WHERE id != public.user_organization_id()
  AND id IN (
    -- This should return no results due to RLS
    SELECT DISTINCT organization_id
    FROM decisions
    WHERE organization_id != public.user_organization_id()
  );

-- 7. Test isolation: Count visible data
SELECT
  'DATA VISIBILITY TEST' as test,
  (SELECT COUNT(*) FROM organizations) as visible_orgs,
  (SELECT COUNT(*) FROM users) as visible_users,
  (SELECT COUNT(*) FROM decisions) as visible_decisions,
  (SELECT COUNT(*) FROM assumptions) as visible_assumptions;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- 1. Should show YOUR user ID and email
-- 2. Should show ONLY your organization
-- 3. Should show ONLY team members in your organization
-- 4. Should show ONLY decisions from your organization
-- 5. Should show ONLY assumptions from your organization
-- 6. Should show ZERO other organizations
-- 7. Counts should match your organization's data only
--
-- If you see data from other organizations, RLS is broken!
-- =====================================================
