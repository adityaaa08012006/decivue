-- Migration 011: Restore Parameter Templates for Organizations
-- Purpose: Fix missing categories by creating a function to seed default templates per organization

-- ============================================================================
-- FUNCTION: Seed Default Parameter Templates for an Organization
-- ============================================================================
CREATE OR REPLACE FUNCTION seed_default_parameter_templates(p_organization_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    inserted_count INTEGER := 0;
BEGIN
    -- Assumption Categories (most important for conflict detection)
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'assumption_category', 'Budget & Financial', 1),
    (p_organization_id, 'assumption_category', 'Timeline & Schedule', 2),
    (p_organization_id, 'assumption_category', 'Resource & Staffing', 3),
    (p_organization_id, 'assumption_category', 'Technical & Infrastructure', 4),
    (p_organization_id, 'assumption_category', 'Market & Business', 5),
    (p_organization_id, 'assumption_category', 'Compliance & Legal', 6),
    (p_organization_id, 'assumption_category', 'Other', 99)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    GET DIAGNOSTICS inserted_count = ROW_COUNT;

    -- Priority Levels (for conflict severity)
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'priority_level', 'Critical', 1),
    (p_organization_id, 'priority_level', 'High', 2),
    (p_organization_id, 'priority_level', 'Medium', 3),
    (p_organization_id, 'priority_level', 'Low', 4)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    -- Impact Areas (where the assumption affects)
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'impact_area', 'Revenue', 1),
    (p_organization_id, 'impact_area', 'Cost', 2),
    (p_organization_id, 'impact_area', 'Timeline', 3),
    (p_organization_id, 'impact_area', 'Quality', 4),
    (p_organization_id, 'impact_area', 'Compliance', 5),
    (p_organization_id, 'impact_area', 'Customer Experience', 6),
    (p_organization_id, 'impact_area', 'Team Capacity', 7)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    -- Common Timeframes
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'timeframe', 'Q1 2026', 1),
    (p_organization_id, 'timeframe', 'Q2 2026', 2),
    (p_organization_id, 'timeframe', 'Q3 2026', 3),
    (p_organization_id, 'timeframe', 'Q4 2026', 4),
    (p_organization_id, 'timeframe', 'H1 2026', 5),
    (p_organization_id, 'timeframe', 'H2 2026', 6),
    (p_organization_id, 'timeframe', '2026', 7),
    (p_organization_id, 'timeframe', '2027', 8)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    -- Outcome Types (for what's expected)
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order) VALUES
    (p_organization_id, 'outcome_type', 'Approval Required', 1),
    (p_organization_id, 'outcome_type', 'Funding Secured', 2),
    (p_organization_id, 'outcome_type', 'Resource Available', 3),
    (p_organization_id, 'outcome_type', 'Deadline Met', 4),
    (p_organization_id, 'outcome_type', 'Milestone Achieved', 5),
    (p_organization_id, 'outcome_type', 'Condition Satisfied', 6)
    ON CONFLICT (organization_id, category, template_name) DO NOTHING;

    RETURN inserted_count;
END;
$$;

COMMENT ON FUNCTION seed_default_parameter_templates IS 'Seeds default parameter templates for a new organization';

-- ============================================================================
-- Fix unique constraint to include organization_id
-- ============================================================================
-- Drop old constraint if it exists
ALTER TABLE parameter_templates DROP CONSTRAINT IF EXISTS parameter_templates_category_template_name_key;

-- Add new constraint that includes organization_id
ALTER TABLE parameter_templates 
ADD CONSTRAINT parameter_templates_org_category_name_key 
UNIQUE (organization_id, category, template_name);

-- ============================================================================
-- Seed templates for all existing organizations
-- ============================================================================
DO $$
DECLARE
    org RECORD;
    templates_count INTEGER;
BEGIN
    FOR org IN SELECT id, name FROM organizations
    LOOP
        SELECT seed_default_parameter_templates(org.id) INTO templates_count;
        RAISE NOTICE 'Seeded % templates for organization: %', templates_count, org.name;
    END LOOP;
END;
$$;

-- ============================================================================
-- Update RLS policy to work with organization_id
-- ============================================================================
DROP POLICY IF EXISTS parameter_templates_org_isolation ON parameter_templates;

CREATE POLICY parameter_templates_org_isolation ON parameter_templates
    FOR ALL
    USING (organization_id = current_setting('app.current_organization_id', TRUE)::UUID)
    WITH CHECK (organization_id = current_setting('app.current_organization_id', TRUE)::UUID);

-- ============================================================================
-- Update get_parameter_templates function to respect organization
-- ============================================================================
CREATE OR REPLACE FUNCTION get_parameter_templates(p_category VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    category VARCHAR,
    template_name VARCHAR,
    display_order INTEGER,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Get organization context
    org_id := current_setting('app.current_organization_id', TRUE)::UUID;
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'No organization context set';
    END IF;

    -- Return filtered templates for this organization
    IF p_category IS NOT NULL THEN
        RETURN QUERY
        SELECT pt.id, pt.category, pt.template_name, pt.display_order, pt.metadata
        FROM parameter_templates pt
        WHERE pt.organization_id = org_id
          AND pt.category = p_category
          AND pt.is_active = true
        ORDER BY pt.display_order ASC, pt.template_name ASC;
    ELSE
        RETURN QUERY
        SELECT pt.id, pt.category, pt.template_name, pt.display_order, pt.metadata
        FROM parameter_templates pt
        WHERE pt.organization_id = org_id
          AND pt.is_active = true
        ORDER BY pt.category ASC, pt.display_order ASC, pt.template_name ASC;
    END IF;
END;
$$;

-- ============================================================================
-- Update add_custom_template function to include organization_id
-- ============================================================================
CREATE OR REPLACE FUNCTION add_custom_template(
    p_category VARCHAR,
    p_template_name VARCHAR
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_template_id UUID;
    org_id UUID;
BEGIN
    -- Get organization context
    org_id := current_setting('app.current_organization_id', TRUE)::UUID;
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'No organization context set';
    END IF;

    -- Insert or get existing template for this organization
    INSERT INTO parameter_templates (organization_id, category, template_name, display_order)
    VALUES (org_id, p_category, p_template_name, 1000)
    ON CONFLICT (organization_id, category, template_name) DO UPDATE 
        SET is_active = true
    RETURNING id INTO v_template_id;
    
    RETURN v_template_id;
END;
$$;

COMMENT ON FUNCTION add_custom_template IS 'Add user-contributed custom template option for the current organization';

-- ============================================================================
-- Add function to delete custom templates
-- ============================================================================
CREATE OR REPLACE FUNCTION delete_parameter_template(
    p_template_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
    template_org_id UUID;
BEGIN
    -- Get organization context
    org_id := current_setting('app.current_organization_id', TRUE)::UUID;
    
    IF org_id IS NULL THEN
        RAISE EXCEPTION 'No organization context set';
    END IF;

    -- Verify template belongs to this organization
    SELECT organization_id INTO template_org_id
    FROM parameter_templates
    WHERE id = p_template_id;

    IF template_org_id IS NULL THEN
        RAISE EXCEPTION 'Template not found';
    END IF;

    IF template_org_id != org_id THEN
        RAISE EXCEPTION 'Cannot delete template from another organization';
    END IF;

    -- Soft delete (set is_active to false)
    UPDATE parameter_templates
    SET is_active = false
    WHERE id = p_template_id AND organization_id = org_id;

    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION delete_parameter_template IS 'Soft delete a parameter template (sets is_active = false)';
