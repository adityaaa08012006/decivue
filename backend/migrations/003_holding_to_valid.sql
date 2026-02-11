-- Migration: Update assumption status constraint
-- Change HOLDING → VALID for clearer terminology

-- Step 1: First, temporarily fix any VALID statuses to HOLDING (to satisfy current constraint)
UPDATE assumptions
SET status = 'HOLDING'
WHERE status = 'VALID';

-- Step 2: Drop the old constraint
ALTER TABLE assumptions
DROP CONSTRAINT IF EXISTS assumptions_status_check;

-- Step 3: Add new constraint with VALID instead of HOLDING
ALTER TABLE assumptions
ADD CONSTRAINT assumptions_status_check
CHECK (status IN ('VALID', 'SHAKY', 'BROKEN'));

-- Step 4: Update all existing HOLDING statuses to VALID
UPDATE assumptions
SET status = 'VALID'
WHERE status = 'HOLDING';

-- Update comment
COMMENT ON COLUMN assumptions.status IS 'Represents drift from original state: VALID (stable) | SHAKY (deteriorating) | BROKEN (invalidated)';
