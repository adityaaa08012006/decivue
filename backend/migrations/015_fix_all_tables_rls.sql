-- =====================================================
-- Migration 015: Fix All Tables RLS Configuration
-- =====================================================
-- This migration ensures all tables have organization_id
-- and proper RLS policies for complete data isolation
-- =====================================================

-- =====================================================
-- 1. DEPENDENCIES TABLE
-- =====================================================

-- Add organization_id to dependencies
ALTER TABLE dependencies
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from source_decision
UPDATE dependencies d
SET organization_id = dec.organization_id
FROM decisions dec
WHERE d.source_decision_id = dec.id
AND d.organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE dependencies
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_dependencies_org_id ON dependencies(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped dependencies" ON dependencies;

CREATE POLICY "Org scoped dependencies"
ON dependencies FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 2. DECISION_ASSUMPTIONS TABLE
-- =====================================================

-- Add organization_id to decision_assumptions
ALTER TABLE decision_assumptions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision
UPDATE decision_assumptions da
SET organization_id = dec.organization_id
FROM decisions dec
WHERE da.decision_id = dec.id
AND da.organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE decision_assumptions
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_decision_assumptions_org_id ON decision_assumptions(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped decision_assumptions" ON decision_assumptions;

CREATE POLICY "Org scoped decision_assumptions"
ON decision_assumptions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 3. DECISION_CONSTRAINTS TABLE
-- =====================================================

-- Add organization_id to decision_constraints
ALTER TABLE decision_constraints
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision
UPDATE decision_constraints dc
SET organization_id = dec.organization_id
FROM decisions dec
WHERE dc.decision_id = dec.id
AND dc.organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE decision_constraints
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_decision_constraints_org_id ON decision_constraints(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped decision_constraints" ON decision_constraints;

CREATE POLICY "Org scoped decision_constraints"
ON decision_constraints FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 4. CONSTRAINT_VIOLATIONS TABLE
-- =====================================================

-- Add organization_id to constraint_violations
ALTER TABLE constraint_violations
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision
UPDATE constraint_violations cv
SET organization_id = dec.organization_id
FROM decisions dec
WHERE cv.decision_id = dec.id
AND cv.organization_id IS NULL;

-- Make organization_id NOT NULL
ALTER TABLE constraint_violations
ALTER COLUMN organization_id SET NOT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_constraint_violations_org_id ON constraint_violations(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped constraint_violations" ON constraint_violations;

CREATE POLICY "Org scoped constraint_violations"
ON constraint_violations FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 5. DECISION_TENSIONS TABLE (Verify it has organization_id)
-- =====================================================

-- Add organization_id to decision_tensions if it doesn't exist
ALTER TABLE decision_tensions
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision_a
UPDATE decision_tensions dt
SET organization_id = dec.organization_id
FROM decisions dec
WHERE dt.decision_a_id = dec.id
AND dt.organization_id IS NULL;

-- Make organization_id NOT NULL if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_tensions' 
    AND column_name = 'organization_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE decision_tensions ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_decision_tensions_org_id ON decision_tensions(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped tensions" ON decision_tensions;
DROP POLICY IF EXISTS "Org scoped decision_tensions" ON decision_tensions;

CREATE POLICY "Org scoped decision_tensions"
ON decision_tensions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 6. DECISION_SIGNALS TABLE (Verify it has organization_id)
-- =====================================================

-- Ensure organization_id exists on decision_signals
ALTER TABLE decision_signals
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision
UPDATE decision_signals ds
SET organization_id = dec.organization_id
FROM decisions dec
WHERE ds.decision_id = dec.id
AND ds.organization_id IS NULL;

-- Make organization_id NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'decision_signals' 
    AND column_name = 'organization_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE decision_signals ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_decision_signals_org_id ON decision_signals(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped signals" ON decision_signals;
DROP POLICY IF EXISTS "Org scoped decision_signals" ON decision_signals;
DROP POLICY IF EXISTS "decision_signals_select_policy" ON decision_signals;
DROP POLICY IF EXISTS "decision_signals_insert_policy" ON decision_signals;
DROP POLICY IF EXISTS "decision_signals_update_policy" ON decision_signals;
DROP POLICY IF EXISTS "decision_signals_delete_policy" ON decision_signals;

CREATE POLICY "Org scoped decision_signals"
ON decision_signals FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- 7. EVALUATION_HISTORY TABLE (Verify it has organization_id)
-- =====================================================

-- Ensure organization_id exists on evaluation_history
ALTER TABLE evaluation_history
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Populate organization_id from decision
UPDATE evaluation_history eh
SET organization_id = dec.organization_id
FROM decisions dec
WHERE eh.decision_id = dec.id
AND eh.organization_id IS NULL;

-- Make organization_id NOT NULL
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'evaluation_history' 
    AND column_name = 'organization_id'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE evaluation_history ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_evaluation_history_org_id ON evaluation_history(organization_id);

-- Update RLS policy to use organization_id directly
DROP POLICY IF EXISTS "Org scoped history" ON evaluation_history;
DROP POLICY IF EXISTS "Org scoped evaluation_history" ON evaluation_history;
DROP POLICY IF EXISTS "evaluation_history_select_policy" ON evaluation_history;
DROP POLICY IF EXISTS "evaluation_history_insert_policy" ON evaluation_history;

CREATE POLICY "Org scoped evaluation_history"
ON evaluation_history FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- =====================================================
-- Verification Query
-- =====================================================
DO $$
DECLARE
  dependencies_count INTEGER;
  decision_assumptions_count INTEGER;
  decision_constraints_count INTEGER;
  constraint_violations_count INTEGER;
BEGIN
  -- Count records with organization_id
  SELECT COUNT(*) INTO dependencies_count FROM dependencies WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO decision_assumptions_count FROM decision_assumptions WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO decision_constraints_count FROM decision_constraints WHERE organization_id IS NOT NULL;
  SELECT COUNT(*) INTO constraint_violations_count FROM constraint_violations WHERE organization_id IS NOT NULL;
  
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Migration 015 Complete!';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Records with organization_id:';
  RAISE NOTICE '  - dependencies: %', dependencies_count;
  RAISE NOTICE '  - decision_assumptions: %', decision_assumptions_count;
  RAISE NOTICE '  - decision_constraints: %', decision_constraints_count;
  RAISE NOTICE '  - constraint_violations: %', constraint_violations_count;
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'All tables now have:';
  RAISE NOTICE '  ✅ organization_id column';
  RAISE NOTICE '  ✅ NOT NULL constraint';
  RAISE NOTICE '  ✅ Simplified RLS policies';
  RAISE NOTICE '  ✅ Performance indexes';
  RAISE NOTICE '===========================================';
END $$;
