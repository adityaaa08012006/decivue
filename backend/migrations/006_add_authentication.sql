-- =====================================================
-- DECIVUE Authentication & Multi-Organization Migration
-- Version: 006
-- Description: Adds user authentication, organizations, and role-based access control
-- =====================================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code TEXT UNIQUE NOT NULL,
  created_by UUID, -- Will reference auth.users after it's populated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_org_code ON organizations(org_code);

-- 2. Create org code generation function
CREATE OR REPLACE FUNCTION generate_org_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate format: ORG-XXXX (4 alphanumeric chars)
    code := 'ORG-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM organizations WHERE org_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 4. Add organization_id to existing tables
-- Check if column exists before adding (for idempotency)
DO $$
BEGIN
  -- decisions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decisions' AND column_name='organization_id') THEN
    ALTER TABLE decisions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- assumptions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='assumptions' AND column_name='organization_id') THEN
    ALTER TABLE assumptions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- constraints
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='constraints' AND column_name='organization_id') THEN
    ALTER TABLE constraints ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- decision_tensions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_tensions' AND column_name='organization_id') THEN
    ALTER TABLE decision_tensions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- evaluation_history
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evaluation_history' AND column_name='organization_id') THEN
    ALTER TABLE evaluation_history ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- decision_signals
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decision_signals' AND column_name='organization_id') THEN
    ALTER TABLE decision_signals ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='organization_id') THEN
    ALTER TABLE notifications ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;

  -- parameter_templates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parameter_templates' AND column_name='organization_id') THEN
    ALTER TABLE parameter_templates ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Rename organization_profile to organization_profiles and add organization_id
DO $$
BEGIN
  -- Check if old table exists and new one doesn't
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_profile')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_profiles') THEN
    ALTER TABLE organization_profile RENAME TO organization_profiles;
  END IF;

  -- Add organization_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organization_profiles' AND column_name='organization_id') THEN
    ALTER TABLE organization_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. Create default organization for existing data (DEVELOPMENT ONLY)
INSERT INTO organizations (id, name, org_code, created_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'Default Organization',
  'ORG-DEMO',
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 7. Backfill organization_id for existing data
UPDATE decisions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE assumptions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE constraints SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE decision_tensions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE evaluation_history SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE decision_signals SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE notifications SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE parameter_templates SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

UPDATE organization_profiles SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid
WHERE organization_id IS NULL;

-- 8. Make organization_id NOT NULL
DO $$
BEGIN
  BEGIN
    ALTER TABLE decisions ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE assumptions ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE constraints ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE decision_tensions ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE evaluation_history ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE decision_signals ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE parameter_templates ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;

  BEGIN
    ALTER TABLE organization_profiles ALTER COLUMN organization_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- 9. Create indexes
CREATE INDEX IF NOT EXISTS idx_decisions_organization ON decisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_assumptions_organization ON assumptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_constraints_organization ON constraints(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_tensions_organization ON decision_tensions(organization_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_history_organization ON evaluation_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_decision_signals_organization ON decision_signals(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_parameter_templates_organization ON parameter_templates(organization_id);

-- 10. Make organization_profiles.organization_id the primary key
DO $$
BEGIN
  -- Drop existing primary key if exists
  BEGIN
    ALTER TABLE organization_profiles DROP CONSTRAINT IF EXISTS organization_profile_pkey;
    ALTER TABLE organization_profiles DROP CONSTRAINT IF EXISTS organization_profiles_pkey;
  EXCEPTION WHEN others THEN NULL;
  END;

  -- Add new primary key
  BEGIN
    ALTER TABLE organization_profiles ADD PRIMARY KEY (organization_id);
  EXCEPTION WHEN duplicate_table THEN NULL;
  END;
END $$;

-- 11. Add created_by field to decisions (for tracking creator)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='decisions' AND column_name='created_by') THEN
    ALTER TABLE decisions ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 12. Helper function: get current user's organization
CREATE OR REPLACE FUNCTION public.user_organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 13. Helper function: check if user can edit decision
CREATE OR REPLACE FUNCTION public.can_edit_decision(decision_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  decision_creator UUID;
BEGIN
  SELECT role INTO user_role FROM public.users WHERE id = auth.uid();

  -- Leads can edit any decision in their org
  IF user_role = 'lead' THEN
    RETURN TRUE;
  END IF;

  -- Members can only edit their own decisions
  SELECT created_by INTO decision_creator FROM public.decisions WHERE id = decision_id;
  RETURN decision_creator = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- 14. ROW-LEVEL SECURITY POLICIES
-- =====================================================

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Only leads can update organization" ON organizations;

CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (id = public.user_organization_id());

CREATE POLICY "Only leads can update organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  id = public.user_organization_id()
  AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'lead'
);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view organization members" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can view organization members"
ON users FOR SELECT
TO authenticated
USING (organization_id = public.user_organization_id());

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Decisions
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decisions;
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

-- Assumptions
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON assumptions;
DROP POLICY IF EXISTS "Org scoped assumptions" ON assumptions;

CREATE POLICY "Org scoped assumptions"
ON assumptions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Constraints
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON constraints;
DROP POLICY IF EXISTS "Org scoped constraints" ON constraints;

CREATE POLICY "Org scoped constraints"
ON constraints FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Decision tensions
ALTER TABLE decision_tensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decision_tensions;
DROP POLICY IF EXISTS "Org scoped tensions" ON decision_tensions;

CREATE POLICY "Org scoped tensions"
ON decision_tensions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Evaluation history
ALTER TABLE evaluation_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON evaluation_history;
DROP POLICY IF EXISTS "Org scoped history" ON evaluation_history;

CREATE POLICY "Org scoped history"
ON evaluation_history FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Decision signals
ALTER TABLE decision_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decision_signals;
DROP POLICY IF EXISTS "Org scoped signals" ON decision_signals;

CREATE POLICY "Org scoped signals"
ON decision_signals FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON notifications;
DROP POLICY IF EXISTS "Org scoped notifications" ON notifications;

CREATE POLICY "Org scoped notifications"
ON notifications FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Parameter templates
ALTER TABLE parameter_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON parameter_templates;
DROP POLICY IF EXISTS "Org scoped templates" ON parameter_templates;

CREATE POLICY "Org scoped templates"
ON parameter_templates FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Organization profiles
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON organization_profiles;
DROP POLICY IF EXISTS "Org scoped profiles" ON organization_profiles;

CREATE POLICY "Org scoped profiles"
ON organization_profiles FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Decision assumptions (junction table)
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decision_assumptions;
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

-- Decision constraints (junction table)
ALTER TABLE decision_constraints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decision_constraints;
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

DROP POLICY IF EXISTS "Allow all operations" ON dependencies;
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

-- Assumption conflicts
ALTER TABLE assumption_conflicts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON assumption_conflicts;
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

-- Constraint violations
ALTER TABLE constraint_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON constraint_violations;
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
-- Migration Complete
-- =====================================================

-- Grant necessary permissions on helper functions
GRANT EXECUTE ON FUNCTION public.user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_decision(uuid) TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Authentication migration completed successfully!';
  RAISE NOTICE 'Created tables: organizations, users';
  RAISE NOTICE 'Added organization_id to all decision-related tables';
  RAISE NOTICE 'Applied Row-Level Security policies';
  RAISE NOTICE 'Default organization created with code: ORG-DEMO';
END $$;
