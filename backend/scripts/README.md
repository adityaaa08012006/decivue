# Backend Scripts

This directory contains utility scripts for managing test data and database fixes.

## Main Scripts

### `populate-test-data.ts`

Populates comprehensive test data for an organization including:

- Decisions with version history
- Assumptions (including conflicting ones)
- Constraints
- Dependencies
- Version snapshots
- Evaluation history
- Relation change tracking

**Usage:**

```bash
npx tsx scripts/populate-test-data.ts
```

The script will automatically use the first available organization and user.

### `clear-all-data.ts`

Clears ALL data from the database including:

- All decisions, assumptions, constraints
- Version history
- Notifications
- Organizations and users (including Supabase Auth)

**Usage:**

```bash
npx tsx scripts/clear-all-data.ts
```

⚠️ **Warning:** This is destructive and cannot be undone!

## Subdirectories

### `sql-fixes/`

Contains SQL scripts for database fixes and migrations:

- `fix-version-history-display.sql` - Fixes version history timeline display
- `fix-version-control-rls.sql` - Fixes Row Level Security for version control
- `check-version-control-schema.sql` - Validates version control schema
- `check-migrations.sql` - Checks migration status

Run these in Supabase SQL Editor when needed.

### `archived/`

Contains old debugging and test scripts that are kept for reference but not actively used:

- Various test scripts
- Migration runners
- Debugging utilities
- Deprecated test data generators

## Workflow

1. **Clear database (optional):**

   ```bash
   npx tsx scripts/clear-all-data.ts
   ```

2. **Populate test data:**

   ```bash
   npx tsx scripts/populate-test-data.ts
   ```

3. **Apply SQL fixes (if needed):**
   - Open Supabase SQL Editor
   - Run `sql-fixes/fix-version-history-display.sql`

## Important Notes

- Scripts use `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `.env`
- Test data includes intentional conflicts to demonstrate conflict detection
- Decisions are created in `STABLE` state (not `INVALIDATED`) to avoid auto-deprecation
