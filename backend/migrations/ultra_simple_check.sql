-- =====================================================
-- ULTRA SIMPLE STATE CHECK
-- =====================================================
-- Just shows what exists - no fancy checks
-- =====================================================

-- Show all organizations
SELECT
  'ORGANIZATIONS' as section,
  o.name as org_name,
  o.org_code,
  (SELECT email FROM auth.users WHERE id = o.created_by) as creator_email,
  o.created_at
FROM organizations o
ORDER BY o.created_at;

-- Show all users
SELECT
  'USERS' as section,
  u.email,
  u.full_name,
  u.role,
  u.created_at
FROM users u
ORDER BY u.created_at;

-- Count records in main tables
SELECT
  'RECORD COUNTS' as section,
  (SELECT COUNT(*) FROM organizations) as orgs,
  (SELECT COUNT(*) FROM users) as users,
  (SELECT COUNT(*) FROM decisions) as decisions,
  (SELECT COUNT(*) FROM assumptions) as assumptions;

-- =====================================================
-- WHAT YOU SHOULD SEE:
-- =====================================================
-- If you nuked everything:
--   - orgs: 0
--   - users: 0
--   - decisions: 0
--   - assumptions: 0
--
-- If database is empty, you're ready to start fresh!
-- =====================================================
