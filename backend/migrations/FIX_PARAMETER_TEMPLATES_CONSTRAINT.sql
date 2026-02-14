-- =====================================================
-- FIX: Parameter Templates for Multi-Organization Support
-- ISSUE: Categories can't be added/deleted per organization
-- SOLUTION: Update constraint to include organization_id
-- =====================================================

-- Run this SQL in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop ALL existing unique constraints on parameter_templates
-- ============================================================================

DO $$
BEGIN
    -- Drop any existing unique constraints
    -- We'll recreate the correct one below
    
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'parameter_templates_category_template_name_key'
    ) THEN
        ALTER TABLE parameter_templates 
        DROP CONSTRAINT parameter_templates_category_template_name_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'parameter_templates_org_category_template_key'
    ) THEN
        ALTER TABLE parameter_templates 
        DROP CONSTRAINT parameter_templates_org_category_template_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'parameter_templates_org_category_name_key'
    ) THEN
        ALTER TABLE parameter_templates 
        DROP CONSTRAINT parameter_templates_org_category_name_key;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'parameter_templates_org_category_template_unique'
    ) THEN
        ALTER TABLE parameter_templates 
        DROP CONSTRAINT parameter_templates_org_category_template_unique;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create the correct constraint with organization_id
-- ============================================================================

ALTER TABLE parameter_templates
ADD CONSTRAINT parameter_templates_org_category_template_unique
UNIQUE (organization_id, category, template_name);

-- ============================================================================
-- STEP 3: Verify the constraint was created correctly
-- ============================================================================

SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'parameter_templates'::regclass
  AND contype = 'u';

-- Expected result:
-- parameter_templates_org_category_template_unique | UNIQUE (organization_id, category, template_name)

-- ============================================================================
-- SUCCESS: If you see the constraint above, categories will now work!
-- ============================================================================

-- After running this SQL:
-- ✅ You can add custom categories 
-- ✅ You can delete categories (frontend has a "Manage Categories" button)
-- ✅ Each organization has independent categories
-- ✅ No more "template already exists" errors with other organizations


