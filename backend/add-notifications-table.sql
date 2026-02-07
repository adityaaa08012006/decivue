-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
-- Stores system-generated notifications for conflicts, health changes, and review needs
-- Run this migration in Supabase SQL Editor to add notifications support

BEGIN;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN (
    'ASSUMPTION_CONFLICT',
    'DECISION_CONFLICT',
    'HEALTH_DEGRADED',
    'LIFECYCLE_CHANGED',
    'NEEDS_REVIEW',
    'ASSUMPTION_BROKEN',
    'DEPENDENCY_BROKEN'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')) DEFAULT 'INFO',
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entities
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
  assumption_id UUID REFERENCES assumptions(id) ON DELETE CASCADE,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);
CREATE INDEX IF NOT EXISTS idx_notifications_decision_id ON notifications(decision_id);
CREATE INDEX IF NOT EXISTS idx_notifications_assumption_id ON notifications(assumption_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_is_dismissed ON notifications(is_dismissed);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Composite index for unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(is_read, is_dismissed, created_at DESC) WHERE is_read = false AND is_dismissed = false;

-- Comments
COMMENT ON TABLE notifications IS 'System-generated notifications for conflicts, health changes, and items needing review';
COMMENT ON COLUMN notifications.type IS 'Type of notification: ASSUMPTION_CONFLICT | DECISION_CONFLICT | HEALTH_DEGRADED | LIFECYCLE_CHANGED | NEEDS_REVIEW | ASSUMPTION_BROKEN | DEPENDENCY_BROKEN';
COMMENT ON COLUMN notifications.severity IS 'Severity level: INFO | WARNING | CRITICAL';
COMMENT ON COLUMN notifications.metadata IS 'Additional context data (JSON): previous values, related IDs, etc.';

COMMIT;
