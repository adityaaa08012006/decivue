-- ============================================================================
-- Migration 025: Fix Users RLS - Eliminate ALL Recursion
-- ============================================================================
-- Description: The users table RLS policy cannot query users table itself.
--              We need to use a lookup table or function that bypasses RLS.
-- Created: 2026-02-16
-- Issue: "infinite recursion detected in policy for relation users"
-- ============================================================================

-- ============================================================================
-- 1. CREATE A HELPER FUNCTION THAT BYPASSES RLS
-- ============================================================================

-- This function gets the user's org_id without triggering RLS
-- SECURITY DEFINER allows it to bypass RLS when querying users table
CREATE OR REPLACE FUNCTION public.get_user_org_id() RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;

-- ============================================================================
-- 2. UPDATE USERS TABLE RLS TO USE THE HELPER FUNCTION
-- ============================================================================

DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users can see other users in their org
-- Uses SECURITY DEFINER function which bypasses RLS
CREATE POLICY "Users can view organization members"
ON users FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- ============================================================================
-- 3. UPDATE ORGANIZATIONS TABLE RLS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Only leads can update organization" ON organizations;

CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (id = public.get_user_org_id());

CREATE POLICY "Only leads can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id = public.get_user_org_id()
  AND auth.uid() IN (SELECT id FROM users WHERE role = 'lead')
);

-- ============================================================================
-- 4. UPDATE ALL OTHER TABLE RLS POLICIES
-- ============================================================================

-- DECISIONS
DROP POLICY IF EXISTS "Users can view their org decisions" ON decisions;
DROP POLICY IF EXISTS "Users can insert decisions in their org" ON decisions;
DROP POLICY IF EXISTS "Decision edit permissions" ON decisions;
DROP POLICY IF EXISTS "Only leads can delete decisions" ON decisions;

CREATE POLICY "Users can view their org decisions"
ON decisions FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org_id());

CREATE POLICY "Users can insert decisions in their org"
ON decisions FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_org_id());

CREATE POLICY "Decision edit permissions"
ON decisions FOR UPDATE
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND (
    auth.uid() IN (SELECT id FROM users WHERE role = 'lead')
    OR created_by = auth.uid()
  )
);

CREATE POLICY "Only leads can delete decisions"
ON decisions FOR DELETE
TO authenticated
USING (
  organization_id = public.get_user_org_id()
  AND auth.uid() IN (SELECT id FROM users WHERE role = 'lead')
);

-- ASSUMPTIONS
DROP POLICY IF EXISTS "Org scoped assumptions" ON assumptions;

CREATE POLICY "Org scoped assumptions"
ON assumptions FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- CONSTRAINTS
DROP POLICY IF EXISTS "Org scoped constraints" ON constraints;

CREATE POLICY "Org scoped constraints"
ON constraints FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Org scoped notifications" ON notifications;

CREATE POLICY "Org scoped notifications"
ON notifications FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- PARAMETER_TEMPLATES
DROP POLICY IF EXISTS "Org scoped templates" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_select_policy" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_insert_policy" ON parameter_templates;
DROP POLICY IF EXISTS "parameter_templates_update_policy" ON parameter_templates;

CREATE POLICY "Org scoped templates"
ON parameter_templates FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- ORGANIZATION_PROFILES
DROP POLICY IF EXISTS "Org scoped profiles" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles SELECT" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles UPDATE" ON organization_profiles;

CREATE POLICY "Org scoped profiles"
ON organization_profiles FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DEPENDENCIES
DROP POLICY IF EXISTS "Org scoped dependencies" ON dependencies;

CREATE POLICY "Org scoped dependencies"
ON dependencies FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_ASSUMPTIONS
DROP POLICY IF EXISTS "Org scoped decision_assumptions" ON decision_assumptions;

CREATE POLICY "Org scoped decision_assumptions"
ON decision_assumptions FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_CONSTRAINTS
DROP POLICY IF EXISTS "Org scoped decision_constraints" ON decision_constraints;

CREATE POLICY "Org scoped decision_constraints"
ON decision_constraints FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- CONSTRAINT_VIOLATIONS
DROP POLICY IF EXISTS "Org scoped constraint_violations" ON constraint_violations;

CREATE POLICY "Org scoped constraint_violations"
ON constraint_violations FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_TENSIONS
DROP POLICY IF EXISTS "Org scoped decision_tensions" ON decision_tensions;

CREATE POLICY "Org scoped decision_tensions"
ON decision_tensions FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_SIGNALS
DROP POLICY IF EXISTS "Org scoped decision_signals" ON decision_signals;

CREATE POLICY "Org scoped decision_signals"
ON decision_signals FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- EVALUATION_HISTORY
DROP POLICY IF EXISTS "Org scoped evaluation_history" ON evaluation_history;

CREATE POLICY "Org scoped evaluation_history"
ON evaluation_history FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- ASSUMPTION_CONFLICTS
DROP POLICY IF EXISTS "Org scoped assumption_conflicts" ON assumption_conflicts;

CREATE POLICY "Org scoped assumption_conflicts"
ON assumption_conflicts FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_CONFLICTS
DROP POLICY IF EXISTS "Org scoped decision_conflicts" ON decision_conflicts;

CREATE POLICY "Org scoped decision_conflicts"
ON decision_conflicts FOR ALL
TO authenticated
USING (organization_id = public.get_user_org_id())
WITH CHECK (organization_id = public.get_user_org_id());

-- DECISION_VERSIONS
DROP POLICY IF EXISTS "Org scoped decision_versions" ON decision_versions;

CREATE POLICY "Org scoped decision_versions"
ON decision_versions
USING (organization_id = public.get_user_org_id());

-- DECISION_RELATION_CHANGES
DROP POLICY IF EXISTS "Org scoped decision_relation_changes" ON decision_relation_changes;

CREATE POLICY "Org scoped decision_relation_changes"
ON decision_relation_changes
USING (organization_id = public.get_user_org_id());

-- ============================================================================
-- SUCCESS NOTIFICATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 025 completed successfully';
  RAISE NOTICE '   - Created public.get_user_org_id() SECURITY DEFINER function';
  RAISE NOTICE '   - Updated ALL table RLS policies to use the new function';
  RAISE NOTICE '   - RECURSION ELIMINATED: Function bypasses RLS for users lookup';
END $$;

