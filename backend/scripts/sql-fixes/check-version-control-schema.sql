-- Check if version control tables have organization_id column

-- Check decision_versions.organization_id
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'decision_versions' AND column_name = 'organization_id'
) AS decision_versions_has_org_id;

-- Check decision_relation_changes.organization_id
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'decision_relation_changes' AND column_name = 'organization_id'
) AS decision_relation_changes_has_org_id;

-- Check current RLS policies on decision_versions
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'decision_versions';

-- Check current RLS policies on decision_relation_changes  
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'decision_relation_changes';

-- Count existing records
SELECT 
  (SELECT COUNT(*) FROM decision_versions) AS version_count,
  (SELECT COUNT(*) FROM decision_relation_changes) AS relation_change_count;
