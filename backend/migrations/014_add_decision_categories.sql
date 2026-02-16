-- ============================================================================
-- Migration 014: Add Category and Parameters to Decisions
-- ============================================================================
-- Description: Add category and parameters columns to decisions table
--              to enable structured decision tracking and conflict detection
-- Created: 2025
-- ============================================================================

-- Add category column to decisions table
ALTER TABLE decisions 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::JSONB;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_decisions_category ON decisions(category);

-- Add comment explaining the new columns
COMMENT ON COLUMN decisions.category IS 'Decision category: Strategic Initiative, Budget & Financial, Resource Allocation, Technical Architecture, Timeline & Milestones, etc.';
COMMENT ON COLUMN decisions.parameters IS 'Structured parameters for conflict detection and decision monitoring. Format varies by category.';

-- Update RLS policies to include new columns (no changes needed, they already work with decisions table)

-- Backfill metadata into category/parameters for existing decisions (if any have metadata)
DO $$
BEGIN
  UPDATE decisions
  SET 
    category = metadata->>'category',
    parameters = COALESCE(metadata->'parameters', '{}'::JSONB)
  WHERE 
    metadata IS NOT NULL 
    AND metadata != '{}'::JSONB
    AND category IS NULL;
    
  RAISE NOTICE 'Migration 014 completed: Added category and parameters to decisions table';
END $$;
