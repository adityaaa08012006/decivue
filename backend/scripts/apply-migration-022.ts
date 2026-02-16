/**
 * Apply migration 022 to fix decision conflicts RLS stack depth issue
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  try {
    console.log("📋 Reading migration file...");
    const migrationPath = path.join(
      __dirname,
      "../migrations/022_fix_decision_conflicts_rls.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("\n" + "=".repeat(80));
    console.log("Migration 022: Fix Decision Conflicts RLS");
    console.log("=".repeat(80));
    console.log("\n📝 SQL to be executed:\n");
    console.log(migrationSQL);
    console.log("\n" + "=".repeat(80) + "\n");

    console.log("🚀 Applying migration 022...");
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.match(/^\s*$/));

    for (const statement of statements) {
      if (statement.includes('RAISE NOTICE')) {
        // Skip DO blocks with RAISE NOTICE as they're just for logging
        continue;
      }
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        // Try direct query if RPC fails
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`Failed to execute statement: ${error.message}`);
        }
      }
    }

    console.log("✅ Migration 022 applied successfully!");
    console.log("\n🔍 The decision conflicts RLS policy has been updated to prevent stack depth errors.");
    console.log("   You can now resolve decision conflicts without errors.\n");
    
  } catch (err: any) {
    console.error("❌ Error applying migration:", err.message);
    console.log("\n📝 Please apply this SQL manually in Supabase SQL Editor:");
    const migrationPath = path.join(
      __dirname,
      "../migrations/022_fix_decision_conflicts_rls.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log("\n" + "=".repeat(80));
    console.log(migrationSQL);
    console.log("=".repeat(80) + "\n");
    console.log("\nSteps to apply manually:");
    console.log("1. Go to Supabase Dashboard > SQL Editor");
    console.log("2. Copy and paste the SQL above");
    console.log("3. Click 'Run'");
    console.log("4. Verify the policy was updated successfully\n");
  }
}

applyMigration();
