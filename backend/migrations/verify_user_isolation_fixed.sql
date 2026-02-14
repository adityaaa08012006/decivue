-- =====================================================
-- USER ISOLATION VERIFICATION (FIXED)
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

-- 4. Show MY decisions (count only)
SELECT
  'MY DECISIONS' as info,
  COUNT(*) as decision_count
FROM decisions d
WHERE organization_id = public.user_organization_id();

-- 5. Show MY decisions (details)
SELECT
  'DECISION DETAILS' as info,
  d.id,
  d.title,
  d.created_at,
  (SELECT email FROM users WHERE id = d.created_by) as creator
FROM decisions d
WHERE organization_id = public.user_organization_id()
ORDER BY d.created_at DESC
LIMIT 10;

-- 6. Show MY assumptions (count only)
SELECT
  'MY ASSUMPTIONS' as info,
  COUNT(*) as assumption_count
FROM assumptions a
WHERE organization_id = public.user_organization_id();

-- 7. Verify I CANNOT see other organizations' data
SELECT
  'OTHER ORGANIZATIONS (Should be empty)' as info,
  COUNT(*) as visible_other_orgs
FROM organizations o
WHERE id != public.user_organization_id();

-- 8. Test isolation: Count visible data
SELECT
  'DATA VISIBILITY TEST' as test,
  (SELECT COUNT(*) FROM organizations) as visible_orgs,
  (SELECT COUNT(*) FROM users) as visible_users,
  (SELECT COUNT(*) FROM decisions) as visible_decisions,
  (SELECT COUNT(*) FROM assumptions) as visible_assumptions;

-- 9. Check for orphaned data (should be 0)
SELECT
  'ORPHANED DATA CHECK' as test,
  (SELECT COUNT(*) FROM decisions WHERE organization_id IS NULL) as orphaned_decisions,
  (SELECT COUNT(*) FROM assumptions WHERE organization_id IS NULL) as orphaned_assumptions,
  (SELECT COUNT(*) FROM constraints WHERE organization_id IS NULL) as orphaned_constraints;

-- =====================================================
-- EXPECTED RESULTS:
-- =====================================================
-- 1. Should show YOUR user ID and email
-- 2. Should show ONLY your organization
-- 3. Should show ONLY team members in your organization
-- 4. Should show count of YOUR decisions
-- 5. Should show details of up to 10 recent decisions
-- 6. Should show count of YOUR assumptions
-- 7. Should show ZERO other organizations (0)
-- 8. Counts should match your organization's data only
-- 9. All orphaned counts should be ZERO (0)
--
-- If you see data from other organizations, RLS is broken!
-- If orphaned counts > 0, run cleanup script again!
-- =====================================================
