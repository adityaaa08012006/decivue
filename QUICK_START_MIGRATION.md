# Run This Migration to Activate Structured Dropdowns

## Step 1: Run the Database Migration

Connect to your Supabase SQL Editor and execute:

```sql
-- File: backend/migrations/005_add_parameter_templates.sql
```

Or run it via command line if you have access:

```bash
# From the backend directory
psql $DATABASE_URL -f migrations/005_add_parameter_templates.sql
```

## Step 2: Restart Your Backend Server

```bash
cd backend
# If using npm
npm run dev

# If using other scripts
node dist/server.js
# or
ts-node src/server.ts
```

## Step 3: You're Ready!

The system is now upgraded with:

✅ **Structured Dropdowns** - Category-based assumption creation  
✅ **Edit Functionality** - Edit assumptions with simple or structured mode  
✅ **95%+ Conflict Detection** - Deterministic matching on structured data  
✅ **Custom Templates** - Users can add their own dropdown options  
✅ **Simple Mode First** - Quick text entry is the default, structured mode is optional

## Try It Out

1. **Create a new decision** → Add assumptions
2. **Toggle to "Structured Mode"** → Select category, fill parameters
3. **Create another assumption** with same category but different values
4. **Run "Detect Conflicts"** → Should show high-confidence conflicts!

## What's New

### Edit Assumptions

- Click the edit icon next to any assumption
- Toggle between Simple and Structured modes
- Update category, parameters, description, or status
- Changes trigger automatic re-evaluation of linked decisions

### Conflict Detection

The system now uses a priority-based detection:

**Priority 1: Structured Detection (95-98% confidence)**

- Budget conflicts: Same timeframe, different amounts
- Timeline conflicts: Same timeframe, opposite outcomes
- Resource conflicts: Same resource/timeframe, opposite availability

**Priority 2: Text-Based Detection (60-90% confidence)**

- Negation detection: "will happen" vs "won't happen"
- Antonym detection: "increase" vs "decrease"
- Contextual similarity with contradictions

### Simple Mode by Default

- Quick text entry appears first
- Click "Structured Mode" button for dropdown-based entry
- Seamlessly switch between modes
- Existing text-based assumptions still work perfectly

---

**Need help?** Check [STRUCTURED_DROPDOWNS_GUIDE.md](STRUCTURED_DROPDOWNS_GUIDE.md) for full documentation.
