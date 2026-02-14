-- ============================================================================
-- Migration 011: Add Decision Creator Tracking
-- ============================================================================
-- Description: Adds created_by field to track which user created each decision
-- Author: System
-- Date: 2024

-- Add created_by column to decisions table
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for faster queries by creator
CREATE INDEX IF NOT EXISTS idx_decisions_created_by ON decisions(created_by);

COMMENT ON COLUMN decisions.created_by IS 'User who created this decision. References users table.';

-- Update existing decisions to set created_by to the organization lead (if available)
-- This is a best-effort migration for existing data
DO $$
DECLARE
  org_record RECORD;
  lead_user_id UUID;
BEGIN
  -- For each organization, find the lead user and set them as creator for decisions without a creator
  FOR org_record IN SELECT DISTINCT organization_id FROM decisions WHERE created_by IS NULL LOOP
    -- Find the organization's lead user
    SELECT id INTO lead_user_id
    FROM users
    WHERE organization_id = org_record.organization_id
      AND role = 'lead'
    LIMIT 1;

    -- Update decisions in this organization to have the lead as creator
    IF lead_user_id IS NOT NULL THEN
      UPDATE decisions
      SET created_by = lead_user_id
      WHERE organization_id = org_record.organization_id
        AND created_by IS NULL;
      
      RAISE NOTICE 'Set creator for organization % decisions to lead user %', org_record.organization_id, lead_user_id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration 011: Added created_by column to decisions table';
END $$;
