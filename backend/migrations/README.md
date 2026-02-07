# Database Migrations

This directory contains SQL migration files for the Decivue backend database.

## How to Run Migrations

Since this project uses Supabase, migrations need to be run through the Supabase Dashboard:

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://app.supabase.com
   - Select your Decivue project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run migration files in this order:**

   **Step 1: Migration 002 - Assumption Conflicts Table**
   - Open `002_assumption_conflicts.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for "Success" message (or "already exists" - that's OK)

   **Step 2: Migration 002b - Fix Missing Columns (if needed)**
   - Open `002b_fix_assumption_conflicts_columns.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for completion (this is safe to run multiple times)

   **Step 3: Migration 003 - Assumption Conflict RPC Functions**
   - Open `003_assumption_conflict_rpcs.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run"
   - Wait for "Success" message

4. **Verify migrations:**
   - You should see these new items in your database:
     - Table: `assumption_conflicts` with all required columns
     - Column: `assumptions.scope`
     - Functions: `get_assumption_conflicts`, `get_all_assumption_conflicts`, `conflict_exists`

## Troubleshooting

### Error: "column confidence_score does not exist"

- Run migration `002b_fix_assumption_conflicts_columns.sql` to add the missing column

### Error: "cannot change return type of existing function"

- Migration 003 has been updated to drop old functions first
- Copy the updated `003_assumption_conflict_rpcs.sql` and run it again

### Error: "relation already exists"

- This means the migration was already run successfully. You can safely skip it.

### Error: "function already exists"

- Migration 003 drops existing functions before recreating them, so this shouldn't happen
- If it does, you can safely ignore it

## Migration Files

- `001_constraint_validation_fields.sql` - Constraint validation schema
- `002_assumption_conflicts.sql` - Assumption conflicts table and scope field
- `002b_fix_assumption_conflicts_columns.sql` - Fix for missing columns (run if needed)
- `003_assumption_conflict_rpcs.sql` - PostgreSQL RPC functions for efficient queries
