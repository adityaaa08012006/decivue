-- Migration: Add email notification preferences to users table
-- Description: Adds email_notifications JSONB field for granular email preferences

-- Add email_notifications column to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_notifications JSONB DEFAULT '{
    "assumption_conflict": true,
    "decision_conflict": true,
    "health_degraded": true,
    "lifecycle_changed": true,
    "needs_review": true,
    "assumption_broken": true,
    "dependency_broken": true
  }'::JSONB;

COMMENT ON COLUMN users.email_notifications IS 'User email notification preferences by type. Each key corresponds to a notification type, value indicates if user wants email notifications for that type.';

-- Update existing users to have the default preferences if the column was just added
UPDATE users
SET email_notifications = '{
  "assumption_conflict": true,
  "decision_conflict": true,
  "health_degraded": true,
  "lifecycle_changed": true,
  "needs_review": true,
  "assumption_broken": true,
  "dependency_broken": true
}'::JSONB
WHERE email_notifications IS NULL;
