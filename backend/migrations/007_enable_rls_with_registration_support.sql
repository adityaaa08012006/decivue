-- =====================================================
-- Migration 007: Re-enable RLS with Registration Support
-- =====================================================
-- This migration re-enables Row-Level Security that was
-- temporarily disabled during testing, and adds special
-- INSERT policies to support registration flow.
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE - WITH REGISTRATION SUPPORT
-- =====================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Only leads can update organization" ON organizations;
DROP POLICY IF EXISTS "Allow INSERT during registration" ON organizations;

-- SELECT: Users can view their own organization
CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (id = public.user_organization_id());

-- INSERT: Allow service role (for registration) - bypasses user checks
CREATE POLICY "Allow INSERT during registration"
ON organizations FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Only organization leads can update
CREATE POLICY "Only leads can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id = public.user_organization_id()
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'lead'
);

-- =====================================================
-- 2. USERS TABLE - WITH REGISTRATION SUPPORT
-- =====================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow INSERT during registration" ON users;

-- SELECT: Users can view members of their organization
CREATE POLICY "Users can view organization members"
ON users FOR SELECT
TO authenticated
USING (organization_id = public.user_organization_id());

-- INSERT: Allow service role (for registration)
CREATE POLICY "Allow INSERT during registration"
ON users FOR INSERT
TO service_role
WITH CHECK (true);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- =====================================================
-- 3. DECISIONS TABLE
-- =====================================================
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their org decisions" ON decisions;
DROP POLICY IF EXISTS "Users can insert decisions in their org" ON decisions;
DROP POLICY IF EXISTS "Decision edit permissions" ON decisions;
DROP POLICY IF EXISTS "Only leads can delete decisions" ON decisions;

CREATE POLICY "Users can view their org decisions"
ON decisions FOR SELECT
TO authenticated
USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can insert decisions in their org"
ON decisions FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "Decision edit permissions"
ON decisions FOR UPDATE
TO authenticated
USING (
  organization_id = public.user_organization_id()
  AND public.can_edit_decision(id)
);

CREATE POLICY "Only leads can delete decisions"
ON decisions FOR DELETE
TO authenticated
USING (
  organization_id = public.user_organization_id()
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'lead'
);

-- =====================================================
-- 4. ASSUMPTIONS TABLE
-- =====================================================
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped assumptions" ON assumptions;

CREATE POLICY "Org scoped assumptions"
ON assumptions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 5. CONSTRAINTS TABLE
-- =====================================================
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped constraints" ON constraints;

CREATE POLICY "Org scoped constraints"
ON constraints FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 6. DECISION TENSIONS TABLE
-- =====================================================
ALTER TABLE decision_tensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped tensions" ON decision_tensions;

CREATE POLICY "Org scoped tensions"
ON decision_tensions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 7. EVALUATION HISTORY TABLE
-- =====================================================
ALTER TABLE evaluation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped history" ON evaluation_history;

CREATE POLICY "Org scoped history"
ON evaluation_history FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 8. DECISION SIGNALS TABLE
-- =====================================================
ALTER TABLE decision_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped signals" ON decision_signals;

CREATE POLICY "Org scoped signals"
ON decision_signals FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 9. NOTIFICATIONS TABLE
-- =====================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped notifications" ON notifications;

CREATE POLICY "Org scoped notifications"
ON notifications FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 10. PARAMETER TEMPLATES TABLE
-- =====================================================
ALTER TABLE parameter_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped templates" ON parameter_templates;

CREATE POLICY "Org scoped templates"
ON parameter_templates FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 11. ORGANIZATION PROFILES TABLE
-- =====================================================
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped profiles" ON organization_profiles;
DROP POLICY IF EXISTS "Allow INSERT during registration" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles SELECT" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles UPDATE" ON organization_profiles;

-- Allow viewing own org profile
CREATE POLICY "Org scoped profiles SELECT"
ON organization_profiles FOR SELECT
TO authenticated
USING (organization_id = public.user_organization_id());

-- Allow INSERT during registration (service role only)
CREATE POLICY "Allow INSERT during registration"
ON organization_profiles FOR INSERT
TO service_role
WITH CHECK (true);

-- Allow UPDATE for own org
CREATE POLICY "Org scoped profiles UPDATE"
ON organization_profiles FOR UPDATE
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 12. JUNCTION TABLES
-- =====================================================

-- Decision Assumptions
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped decision_assumptions" ON decision_assumptions;

CREATE POLICY "Org scoped decision_assumptions"
ON decision_assumptions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = decision_assumptions.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = decision_assumptions.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
);

-- Decision Constraints
ALTER TABLE decision_constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped decision_constraints" ON decision_constraints;

CREATE POLICY "Org scoped decision_constraints"
ON decision_constraints FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = decision_constraints.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = decision_constraints.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
);

-- Dependencies
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped dependencies" ON dependencies;

CREATE POLICY "Org scoped dependencies"
ON dependencies FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = dependencies.source_decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = dependencies.source_decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
);

-- Assumption Conflicts
ALTER TABLE assumption_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped assumption_conflicts" ON assumption_conflicts;

CREATE POLICY "Org scoped assumption_conflicts"
ON assumption_conflicts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.assumptions
    WHERE assumptions.id = assumption_conflicts.assumption_a_id
    AND assumptions.organization_id = public.user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assumptions
    WHERE assumptions.id = assumption_conflicts.assumption_a_id
    AND assumptions.organization_id = public.user_organization_id()
  )
);

-- Constraint Violations
ALTER TABLE constraint_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org scoped constraint_violations" ON constraint_violations;

CREATE POLICY "Org scoped constraint_violations"
ON constraint_violations FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = constraint_violations.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.decisions
    WHERE decisions.id = constraint_violations.decision_id
    AND decisions.organization_id = public.user_organization_id()
  )
);

-- =====================================================
-- 13. GRANT EXECUTE PERMISSIONS ON HELPER FUNCTIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_decision(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_org_code() TO authenticated;

-- =====================================================
-- 14. VERIFICATION QUERIES (Optional - for testing)
-- =====================================================

-- Check that RLS is enabled on all tables
DO $$
BEGIN
  RAISE NOTICE '=== RLS STATUS CHECK ===';
  RAISE NOTICE 'Organizations RLS: %', (
    SELECT relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'organizations'
  );
  RAISE NOTICE 'Users RLS: %', (
    SELECT relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users'
  );
  RAISE NOTICE 'Decisions RLS: %', (
    SELECT relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'decisions'
  );
  RAISE NOTICE 'Assumptions RLS: %', (
    SELECT relrowsecurity FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'assumptions'
  );
  RAISE NOTICE '======================';
END $$;

-- =====================================================
-- Migration 007 Complete!
-- =====================================================
-- All tables now have proper Row-Level Security enabled
-- Organizations are completely isolated from each other
-- Registration flow is supported with special INSERT policies
-- =====================================================
