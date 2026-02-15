-- ============================================================================
-- DEVICUE DATABASE WIPE SCRIPT
-- ============================================================================
-- This script clears ALL data from all tables in the correct order
-- to respect foreign key constraints.
--
-- WARNING: This will DELETE ALL DATA - including organizations, users,
-- decisions, assumptions, constraints, and all related data.
--
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql
-- ============================================================================

BEGIN;

-- Step 1: Delete junction/relationship tables first (have foreign keys to other tables)
DELETE FROM constraint_violations;
DELETE FROM assumption_conflicts;
DELETE FROM decision_tensions;
DELETE FROM dependencies;
DELETE FROM decision_assumptions;
DELETE FROM decision_constraints;
DELETE FROM decision_signals;
DELETE FROM notifications;
DELETE FROM evaluation_history;

-- Step 2: Delete main entity tables
DELETE FROM decisions;
DELETE FROM assumptions;
DELETE FROM constraints;
DELETE FROM parameter_templates;

-- Step 3: Delete organization-related tables
DELETE FROM organization_profiles;

-- Step 4: Delete users (references organizations)
DELETE FROM users;

-- Step 5: Delete organizations (last, as many tables reference it)
DELETE FROM organizations;

COMMIT;

-- ============================================================================
-- Verification: Check all tables are empty
-- ============================================================================
SELECT
  'constraint_violations' as table_name, COUNT(*) as row_count FROM constraint_violations
UNION ALL SELECT 'assumption_conflicts', COUNT(*) FROM assumption_conflicts
UNION ALL SELECT 'decision_tensions', COUNT(*) FROM decision_tensions
UNION ALL SELECT 'dependencies', COUNT(*) FROM dependencies
UNION ALL SELECT 'decision_assumptions', COUNT(*) FROM decision_assumptions
UNION ALL SELECT 'decision_constraints', COUNT(*) FROM decision_constraints
UNION ALL SELECT 'decision_signals', COUNT(*) FROM decision_signals
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
UNION ALL SELECT 'evaluation_history', COUNT(*) FROM evaluation_history
UNION ALL SELECT 'decisions', COUNT(*) FROM decisions
UNION ALL SELECT 'assumptions', COUNT(*) FROM assumptions
UNION ALL SELECT 'constraints', COUNT(*) FROM constraints
UNION ALL SELECT 'parameter_templates', COUNT(*) FROM parameter_templates
UNION ALL SELECT 'organization_profiles', COUNT(*) FROM organization_profiles
UNION ALL SELECT 'users', COUNT(*) FROM users
UNION ALL SELECT 'organizations', COUNT(*) FROM organizations
ORDER BY row_count DESC, table_name;

-- ============================================================================
-- If you also want to delete Supabase Auth users (not just database records)
-- run this separately with service_role key privileges:
-- ============================================================================
-- This cannot be run in the SQL editor - you would need to use the Supabase
-- management API or do it through the Supabase dashboard manually.
--
-- To delete auth users via dashboard:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Select all users and delete them
-- ============================================================================
