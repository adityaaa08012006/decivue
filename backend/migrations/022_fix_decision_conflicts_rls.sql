-- ============================================================================
-- Migration 022: Fix ALL RLS Policies to Prevent Stack Depth Errors
-- ============================================================================
-- Description: Update ALL table RLS policies to use direct subquery
--              instead of user_organization_id() function to avoid recursion
-- Created: 2026-02-16
-- Issue: Stack depth limit exceeded error - circular dependency in RLS
-- ============================================================================

-- The user_organization_id() function queries the users table, which also
-- has RLS enabled. This creates infinite recursion. Solution: use direct
-- subquery in all RLS policies instead of the function.

-- ============================================================================
-- 1. FIX DECISION_CONFLICTS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped decision_conflicts" ON decision_conflicts;

CREATE POLICY "Org scoped decision_conflicts"
ON decision_conflicts FOR ALL
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
-- 2. FIX ASSUMPTION_CONFLICTS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped assumption_conflicts" ON assumption_conflicts;

CREATE POLICY "Org scoped assumption_conflicts"
ON assumption_conflicts FOR ALL
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
-- 3. FIX DEPENDENCIES
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped dependencies" ON dependencies;

CREATE POLICY "Org scoped dependencies"
ON dependencies FOR ALL
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
-- 4. FIX DECISION_ASSUMPTIONS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped decision_assumptions" ON decision_assumptions;

CREATE POLICY "Org scoped decision_assumptions"
ON decision_assumptions FOR ALL
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
-- 5. FIX DECISION_CONSTRAINTS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped decision_constraints" ON decision_constraints;

CREATE POLICY "Org scoped decision_constraints"
ON decision_constraints FOR ALL
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
-- 6. FIX CONSTRAINT_VIOLATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped constraint_violations" ON constraint_violations;

CREATE POLICY "Org scoped constraint_violations"
ON constraint_violations FOR ALL
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
-- 7. FIX DECISION_TENSIONS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped decision_tensions" ON decision_tensions;

CREATE POLICY "Org scoped decision_tensions"
ON decision_tensions FOR ALL
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
-- 8. FIX DECISION_SIGNALS
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped decision_signals" ON decision_signals;

CREATE POLICY "Org scoped decision_signals"
ON decision_signals FOR ALL
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
-- 9. FIX EVALUATION_HISTORY
-- ============================================================================

DROP POLICY IF EXISTS "Org scoped evaluation_history" ON evaluation_history;

CREATE POLICY "Org scoped evaluation_history"
ON evaluation_history FOR ALL
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
  RAISE NOTICE '✅ Migration 022 completed successfully';
  RAISE NOTICE '   - Fixed ALL table RLS policies to prevent stack depth errors';
  RAISE NOTICE '   - Changed from user_organization_id() function to direct subquery';
  RAISE NOTICE '   - Tables updated: decision_conflicts, assumption_conflicts, dependencies,';
  RAISE NOTICE '     decision_assumptions, decision_constraints, constraint_violations,';
  RAISE NOTICE '     decision_tensions, decision_signals, evaluation_history';
END $$;
