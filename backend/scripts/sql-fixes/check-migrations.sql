-- Run this in Supabase SQL Editor to check migration status

-- Check if organizations table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'organizations'
) AS organizations_exists;

-- Check if users table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'users'
) AS users_exists;

-- Check if decisions.organization_id exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'decisions' AND column_name = 'organization_id'
) AS decisions_org_id_exists;

-- Check if decisions.created_by exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'decisions' AND column_name = 'created_by'
) AS decisions_created_by_exists;

-- Check if decision_versions exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'decision_versions'
) AS decision_versions_exists;

-- Check if decision_relation_changes exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'decision_relation_changes'
) AS decision_relation_changes_exists;
