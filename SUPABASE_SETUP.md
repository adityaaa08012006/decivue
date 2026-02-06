# Supabase Setup Instructions

## Step 1: Run the Database Schema

1. Go to your Supabase project: https://ylqihciyoqjjstolubve.supabase.co
2. Navigate to the **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `backend/schema.sql`
5. Paste it into the SQL editor
6. Click **RUN** to execute the schema

This will create:

- `decisions` table
- `assumptions` table
- `constraints` table
- `decision_constraints` junction table
- `dependencies` table
- `evaluation_history` table (audit trail)
- Sample data for testing
- Indexes for performance
- Row Level Security policies
- Triggers for automatic updates

## Step 2: Verify Tables Were Created

After running the schema, you can verify by:

1. Go to **Table Editor** in the left sidebar
2. You should see all 6 tables listed
3. Click on `decisions` to see the sample data

## Step 3: Test the Backend

From the project root:

```bash
# Start the backend server
npm run dev:backend
```

The server will start on http://localhost:3001

## Step 4: Test the API

Open a browser or use curl to test:

```bash
# Health check
curl http://localhost:3001/health

# API info
curl http://localhost:3001/api

# Get all decisions (sample data)
curl http://localhost:3001/api/decisions
```

## Next Steps

Once the backend is running:

1. **Connect the frontend** to the backend API
2. **Implement remaining API endpoints** (assumptions, constraints)
3. **Wire up the evaluation endpoint** to use the decision engine
4. **Add more sample data** or create decisions via the API

## Troubleshooting

If you get connection errors:

- Verify the Supabase URL and API keys in `backend/.env`
- Check that the schema was applied successfully
- Make sure the backend server is running

If you need to reset the database:

- Go to SQL Editor and run: `DROP TABLE IF EXISTS decisions, assumptions, constraints, decision_constraints, dependencies, evaluation_history CASCADE;`
- Then re-run the schema.sql file
