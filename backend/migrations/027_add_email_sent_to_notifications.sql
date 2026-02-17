-- Migration: Add email_sent flag to notifications table
-- Purpose: Track whether notification was included in immediate email or morning briefing
-- Date: 2026-02-17

-- Add email_sent column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT FALSE;

-- Create index for efficient morning briefing queries
CREATE INDEX IF NOT EXISTS idx_notifications_email_sent 
ON notifications(email_sent, created_at) 
WHERE email_sent = FALSE;

-- Add comment
COMMENT ON COLUMN notifications.email_sent IS 'True if notification was sent via immediate email or included in morning briefing';

-- Note: Existing notifications will have email_sent = FALSE
-- They will be included in the next morning briefing
