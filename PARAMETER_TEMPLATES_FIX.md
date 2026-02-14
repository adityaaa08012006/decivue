# Parameter Templates Fix - Complete Solution

## Problem

The assumption categories (Budget & Financial, Timeline & Schedule, etc.) disappeared from the structured assumption form because:

1. The `parameter_templates` table has a unique constraint that doesn't include `organization_id`
2. Templates can only exist once across ALL organizations (not per-organization)
3. Only "Test Organization One" got templates, blocking all other orgs

## Automated Solution

### Step 1: Run the SQL Schema Fix

Copy and run this SQL in your **Supabase SQL Editor**:

```sql
-- Fix the unique constraint to include organization_id
ALTER TABLE parameter_templates
DROP CONSTRAINT IF EXISTS parameter_templates_category_template_name_key;

ALTER TABLE parameter_templates
ADD CONSTRAINT parameter_templates_org_category_name_key
UNIQUE (organization_id, category, template_name);

-- Create the seed function for new organizations
CREATE OR REPLACE FUNCTION seed_default_parameter_templates(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER := 0;
BEGIN
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'assumption_category', 'Budget & Financial', 1),
    (p_organization_id, 'assumption_category', 'Timeline & Schedule', 2),
    (p_organization_id, 'assumption_category', 'Resource & Staffing', 3),
    (p_organization_id, 'assumption_category', 'Technical & Infrastructure', 4),
    (p_organization_id, 'assumption_category', 'Market & Business', 5),
    (p_organization_id, 'assumption_category', 'Compliance & Legal', 6),
    (p_organization_id, 'assumption_category', 'Other', 99),
    (p_organization_id, 'priority_level', 'Critical', 1),
    (p_organization_id, 'priority_level', 'High', 2),
    (p_organization_id, 'priority_level', 'Medium', 3),
    (p_organization_id, 'priority_level', 'Low', 4),
    (p_organization_id, 'timeframe', 'Q1 2026', 1),
    (p_organization_id, 'timeframe', 'Q2 2026', 2),
    (p_organization_id, 'timeframe', 'Q3 2026', 3),
    (p_organization_id, 'timeframe', 'Q4 2026', 4),
    (p_organization_id, 'timeframe', 'H1 2026', 5),
    (p_organization_id, 'timeframe', 'H2 2026', 6),
    (p_organization_id, 'timeframe', '2026', 7),
    (p_organization_id, 'timeframe', '2027', 8),
    (p_organization_id, 'outcome_type', 'Approval Required', 1),
    (p_organization_id, 'outcome_type', 'Funding Secured', 2),
    (p_organization_id, 'outcome_type', 'Resource Available', 3),
    (p_organization_id, 'outcome_type', 'Deadline Met', 4),
    (p_organization_id, 'outcome_type', 'Milestone Achieved', 5),
    (p_organization_id, 'outcome_type', 'Condition Satisfied', 6)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RETURN inserted_count;
END;
$$;
```

### Step 2: Seed Templates for Existing Organizations

Run this command in your terminal:

```bash
npx tsx backend/scripts/seed-all-orgs.ts
```

This will automatically seed templates for all existing organizations.

### Step 3: Verify

The structured assumption form should now show all categories when creating assumptions.

## What This Fixes

✅ **Schema**: Unique constraint now includes `organization_id`  
✅ **Existing Orgs**: All organizations get their own set of templates  
✅ **New Orgs**: The `seed_default_parameter_templates()` function is called during registration  
✅ **Frontend**: Categories appear in structured assumption form

## Scripts Created

- `backend/scripts/complete-template-fix.ts` - Shows the SQL you need to run
- `backend/scripts/seed-all-orgs.ts` - Seeds templates for all existing organizations
- `backend/migrations/011_restore_parameter_templates.sql` - Migration file for reference

## Registration Flow (Updated)

New organizations will automatically get templates because:

1. Registration creates the organization
2. Calls `seed_default_parameter_templates(org.id)`
3. Templates are created for that organization
4. User can immediately use structured assumption forms
