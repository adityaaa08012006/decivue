-- Migration 005: Add Parameter Templates for Structured Dropdowns
-- Purpose: Enable structured data entry with dropdowns to improve conflict detection

-- ============================================================================
-- PARAMETER_TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS parameter_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(100) NOT NULL,           -- e.g., 'assumption_category', 'budget_range', 'timeline_unit'
    template_name VARCHAR(200) NOT NULL,      -- e.g., 'Budget Assumption', 'Q3 2026'
    display_order INTEGER DEFAULT 0,          -- For ordering in dropdowns
    is_active BOOLEAN DEFAULT true,           -- Soft delete capability
    metadata JSONB DEFAULT '{}'::JSONB,       -- Additional context
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category, template_name)
);

COMMENT ON TABLE parameter_templates IS 'Reusable templates for dropdowns - keeps data structured for conflict detection';
COMMENT ON COLUMN parameter_templates.category IS 'Template category: assumption_category, priority_level, impact_area, etc.';
COMMENT ON COLUMN parameter_templates.template_name IS 'User-visible template option';

CREATE INDEX idx_parameter_templates_category ON parameter_templates(category, display_order);
CREATE INDEX idx_parameter_templates_active ON parameter_templates(is_active) WHERE is_active = true;

-- ============================================================================
-- UPDATE ASSUMPTIONS TABLE
-- ============================================================================
-- Add structured fields to assumptions table
ALTER TABLE assumptions 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::JSONB;

COMMENT ON COLUMN assumptions.category IS 'Category from parameter_templates (e.g., Budget, Timeline, Resource)';
COMMENT ON COLUMN assumptions.parameters IS 'Structured parameters: {amount: 500000, unit: "USD", timeframe: "Q3 2026"}';

CREATE INDEX idx_assumptions_category ON assumptions(category);

-- ============================================================================
-- SEED COMMON PARAMETER TEMPLATES
-- ============================================================================

-- Assumption Categories (most important for conflict detection)
INSERT INTO parameter_templates (category, template_name, display_order) VALUES
('assumption_category', 'Budget & Financial', 1),
('assumption_category', 'Timeline & Schedule', 2),
('assumption_category', 'Resource & Staffing', 3),
('assumption_category', 'Technical & Infrastructure', 4),
('assumption_category', 'Market & Business', 5),
('assumption_category', 'Compliance & Legal', 6),
('assumption_category', 'Other', 99)
ON CONFLICT (category, template_name) DO NOTHING;

-- Priority Levels (for conflict severity)
INSERT INTO parameter_templates (category, template_name, display_order) VALUES
('priority_level', 'Critical', 1),
('priority_level', 'High', 2),
('priority_level', 'Medium', 3),
('priority_level', 'Low', 4)
ON CONFLICT (category, template_name) DO NOTHING;

-- Impact Areas (where the assumption affects)
INSERT INTO parameter_templates (category, template_name, display_order) VALUES
('impact_area', 'Revenue', 1),
('impact_area', 'Cost', 2),
('impact_area', 'Timeline', 3),
('impact_area', 'Quality', 4),
('impact_area', 'Compliance', 5),
('impact_area', 'Customer Experience', 6),
('impact_area', 'Team Capacity', 7)
ON CONFLICT (category, template_name) DO NOTHING;

-- Common Timeframes
INSERT INTO parameter_templates (category, template_name, display_order) VALUES
('timeframe', 'Q1 2026', 1),
('timeframe', 'Q2 2026', 2),
('timeframe', 'Q3 2026', 3),
('timeframe', 'Q4 2026', 4),
('timeframe', 'H1 2026', 5),
('timeframe', 'H2 2026', 6),
('timeframe', '2026', 7),
('timeframe', '2027', 8)
ON CONFLICT (category, template_name) DO NOTHING;

-- Outcome Types (for what's expected)
INSERT INTO parameter_templates (category, template_name, display_order) VALUES
('outcome_type', 'Approval Required', 1),
('outcome_type', 'Funding Secured', 2),
('outcome_type', 'Resource Available', 3),
('outcome_type', 'Deadline Met', 4),
('outcome_type', 'Milestone Achieved', 5),
('outcome_type', 'Condition Satisfied', 6)
ON CONFLICT (category, template_name) DO NOTHING;

-- ============================================================================
-- RPC FUNCTION: Get Templates by Category
-- ============================================================================
CREATE OR REPLACE FUNCTION get_parameter_templates(p_category VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    category VARCHAR,
    template_name VARCHAR,
    display_order INTEGER,
    metadata JSONB
) AS $$
BEGIN
    IF p_category IS NULL THEN
        RETURN QUERY
        SELECT pt.id, pt.category, pt.template_name, pt.display_order, pt.metadata
        FROM parameter_templates pt
        WHERE pt.is_active = true
        ORDER BY pt.category, pt.display_order, pt.template_name;
    ELSE
        RETURN QUERY
        SELECT pt.id, pt.category, pt.template_name, pt.display_order, pt.metadata
        FROM parameter_templates pt
        WHERE pt.is_active = true AND pt.category = p_category
        ORDER BY pt.display_order, pt.template_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_parameter_templates IS 'Get active parameter templates, optionally filtered by category';

-- ============================================================================
-- RPC FUNCTION: Add Custom Template (user-contributed)
-- ============================================================================
CREATE OR REPLACE FUNCTION add_custom_template(
    p_category VARCHAR,
    p_template_name VARCHAR
)
RETURNS UUID AS $$
DECLARE
    v_template_id UUID;
BEGIN
    -- Insert or get existing template
    INSERT INTO parameter_templates (category, template_name, display_order)
    VALUES (p_category, p_template_name, 1000)
    ON CONFLICT (category, template_name) DO UPDATE SET is_active = true
    RETURNING id INTO v_template_id;
    
    RETURN v_template_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_custom_template IS 'Add user-contributed custom template option';

-- ============================================================================
-- ENABLE RLS ON NEW TABLE
-- ============================================================================
ALTER TABLE parameter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parameter_templates_select_policy" ON parameter_templates FOR SELECT USING (true);
CREATE POLICY "parameter_templates_insert_policy" ON parameter_templates FOR INSERT WITH CHECK (true);
CREATE POLICY "parameter_templates_update_policy" ON parameter_templates FOR UPDATE USING (true);
