-- Migration: Add expiry_date to decisions table
-- This allows decisions to have a specific expiration date
-- Health decay will be calculated relative to the expiry date

-- Add expiry_date column (nullable, can be set later)
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the field
COMMENT ON COLUMN decisions.expiry_date IS 'Optional expiration date for the decision. When set, health decay accelerates as this date approaches and passes.';
