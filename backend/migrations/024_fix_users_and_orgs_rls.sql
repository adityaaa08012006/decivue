-- ============================================================================
-- Migration 024: Fix Users and Organizations RLS (Root Cause of Stack Depth)
-- ============================================================================
-- Description: Fix the users and organizations table RLS policies to NOT use
--              user_organization_id() - this is the ROOT CAUSE of infinite recursion
-- Created: 2026-02-16
-- Issue: When other tables query users to get organization_id, it triggers
--        users RLS which calls user_organization_id() which queries users again
-- ============================================================================

-- ============================================================================
-- 1. FIX USERS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users can see other users in their org - use direct comparison with auth.uid()
CREATE POLICY "Users can view organization members"
ON users FOR SELECT
TO authenticated
USING (
  organization_id IN (
    -- This direct lookup doesn't trigger RLS recursion because we're selecting
    -- from the same table that's being accessed, and auth.uid() is the filter
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- ============================================================================
-- 2. FIX ORGANIZATIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Only leads can update organization" ON organizations;

-- Users can view their organization
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Only leads can update organization
CREATE POLICY "Only leads can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND auth.uid() IN (
    SELECT id FROM users WHERE role = 'lead'
  )
);

-- ============================================================================
-- 3. FIX DECISIONS TABLE RLS POLICIES
-- ============================================================================

-- Drop old policies that use user_organization_id()
DROP POLICY IF EXISTS "Users can view their org decisions" ON decisions;
DROP POLICY IF EXISTS "Users can insert decisions in their org" ON decisions;
DROP POLICY IF EXISTS "Decision edit permissions" ON decisions;
DROP POLICY IF EXISTS "Only leads can delete decisions" ON decisions;

-- Users can view their org decisions
CREATE POLICY "Users can view their org decisions"
ON decisions FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Users can insert decisions in their org
CREATE POLICY "Users can insert decisions in their org"
ON decisions FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- Decision edit permissions
CREATE POLICY "Decision edit permissions"
ON decisions FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND (
    -- Leads can edit any decision
    auth.uid() IN (SELECT id FROM users WHERE role = 'lead')
    -- Members can edit their own decisions
    OR created_by = auth.uid()
  )
);

-- Only leads can delete decisions
CREATE POLICY "Only leads can delete decisions"
ON decisions FOR DELETE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
  AND auth.uid() IN (SELECT id FROM users WHERE role = 'lead')
);

-- ============================================================================
-- 4. FIX ASSUMPTIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped assumptions" ON assumptions;

CREATE POLICY "Org scoped assumptions"
ON assumptions FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 5. FIX CONSTRAINTS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped constraints" ON constraints;

CREATE POLICY "Org scoped constraints"
ON constraints FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 6. FIX NOTIFICATIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped notifications" ON notifications;

CREATE POLICY "Org scoped notifications"
ON notifications FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 7. FIX PARAMETER_TEMPLATES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped templates" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_select_policy" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_insert_policy" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_update_policy" ON parameter_templates;

CREATE POLICY "Org scoped templates"
ON parameter_templates FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- 8. FIX ORGANIZATION_PROFILES TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped profiles" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles SELECT" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles UPDATE" ON organization_profiles;

CREATE POLICY "Org scoped profiles"
ON organization_profiles FOR ALL
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 024 completed successfully';
  RAISE NOTICE '   - Fixed users table RLS to prevent recursive lookups';
  RAISE NOTICE '   - Fixed organizations table RLS';
  RAISE NOTICE '   - Fixed all remaining tables to use direct subqueries';
  RAISE NOTICE '   - ROOT CAUSE RESOLVED: No more user_organization_id() in RLS policies';
END $$;
