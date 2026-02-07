# Migration Instructions for Decision Expiry Date Feature

## What Changed

You now have three major improvements:

1. **Health changes trigger notifications** - When health degrades significantly or lifecycle changes, notifications are automatically created
2. **Expiry date support** - Decisions can now have an expiry_date, and health decay accelerates as the date approaches/passes
3. **Review button works** - Marking a decision as reviewed now actually restores health by re-evaluating

## Database Migration Required

Run this migration in your Supabase SQL Editor:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Click "New Query"

### Step 2: Run the Migration

Copy and paste this SQL:

\`\`\`sql
-- Add expiry_date column to decisions table
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP WITH TIME ZONE;

-- Add comment explaining the field
COMMENT ON COLUMN decisions.expiry_date IS 'Optional expiration date for the decision. When set, health decay accelerates as this date approaches and passes.';
\`\`\`

### Step 3: Click "Run"

That's it! The migration is complete.

## New Expiry-Based Decay Logic

When a decision has an `expiry_date` set:

### Timeline Before Expiry:

- **> 90 days until expiry**: No decay (health stays at 100)
- **30-90 days until expiry**: Warning phase (1 point per 15 days)
- **0-30 days until expiry**: Critical phase (1 point per 5 days)

### After Expiry:

- **Past expiry**: Severe decay (1 point per day)

### Example:

- Decision created with expiry_date = 120 days from now
- Days 0-30: Health = 100 (no decay)
- Day 60: Health = 100 (no decay)
- Day 100: Health = 99 (20 days into warning phase)
- Day 110: Health = 98 (10 days into warning phase)
- Day 120 (expiry): Health = 90 (entered critical phase)
- Day 130 (10 days past expiry): Health = 80 (10 points decay for being overdue)

## Testing the New Features

### Test 1: Expiry Date

1. Create a decision with an expiry date in the future
2. Use Time Jump to simulate approaching the expiry
3. Watch health decay accelerate as expiry approaches
4. See notifications appear when health drops significantly

### Test 2: Review Button

1. Use Time Jump to decay a decision (e.g., +365 days)
2. Note the health score drops
3. Click "Mark as Reviewed" on the decision
4. Health should restore to 100
5. Lifecycle should return to STABLE

### Test 3: Notifications

1. Use Time Jump with a large time period (e.g., +365 days)
2. Check the Notifications page
3. You should see notifications for:
   - Health degradation (if dropped ≥10 points)
   - Lifecycle changes (if state changed)

## Notification Severity Levels

- **CRITICAL**: Decision invalidated
- **HIGH**: Decision at risk, health dropped ≥30 points
- **MEDIUM**: Decision under review, health dropped ≥20 points
- **LOW**: Health dropped ≥10 points

## Next Steps

After running the migration, restart your backend server:

- The tsx watch mode should auto-reload
- If not, manually restart: `cd backend && npm run dev`

Then test the new features in the UI!
