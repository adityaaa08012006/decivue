-- Migration Fix: Ensure assumption_conflicts table has all required columns
-- Run this if you get "column does not exist" errors

-- Add conflict_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'conflict_type'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN conflict_type TEXT NOT NULL DEFAULT 'CONTRADICTORY' CHECK (conflict_type IN ('CONTRADICTORY', 'MUTUALLY_EXCLUSIVE', 'INCOMPATIBLE'));

        COMMENT ON COLUMN assumption_conflicts.conflict_type IS 'CONTRADICTORY: Direct contradiction, MUTUALLY_EXCLUSIVE: Cannot both be true, INCOMPATIBLE: Incompatible implications';
    END IF;
END $$;

-- Add detected_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'detected_at'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Add confidence_score column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'confidence_score'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1);

        COMMENT ON COLUMN assumption_conflicts.confidence_score IS 'AI-generated confidence score 0.0-1.0 indicating likelihood of actual conflict';
    END IF;
END $$;

-- Add resolution_action column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'resolution_action'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN resolution_action TEXT CHECK (resolution_action IN ('VALIDATE_A', 'VALIDATE_B', 'MERGE', 'DEPRECATE_BOTH', 'KEEP_BOTH'));

        COMMENT ON COLUMN assumption_conflicts.resolution_action IS 'How the conflict was resolved by the user';
    END IF;
END $$;

-- Add resolution_notes column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'resolution_notes'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN resolution_notes TEXT;
    END IF;
END $$;

-- Add resolved_at column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'resolved_at'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN resolved_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add metadata column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'assumption_conflicts'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE assumption_conflicts
        ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Create missing indexes
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_confidence ON assumption_conflicts(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_assumption_conflicts_unresolved ON assumption_conflicts(resolved_at) WHERE resolved_at IS NULL;
