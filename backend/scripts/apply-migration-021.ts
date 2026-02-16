/**
 * Apply migration 021 to fix decision conflicts insert stack depth issue
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
      "../migrations/021_fix_decision_conflicts_insert.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("🚀 Applying migration 021...");
    const { error } = await supabase.rpc("exec_sql", { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      const { error: directError } = await supabase.rpc(
        "insert_decision_conflict",
        {
          p_decision_a_id: "00000000-0000-0000-0000-000000000000",
          p_decision_b_id: "00000000-0000-0000-0000-000000000001",
          p_conflict_type: "CONTRADICTORY",
          p_confidence_score: 0.9,
          p_explanation: "Test",
          p_organization_id: "00000000-0000-0000-0000-000000000000",
        },
      );

      if (directError && directError.code === "42883") {
        // Function doesn't exist, need to apply SQL manually
        console.log("\n⚠️  Cannot apply migration automatically via RPC.");
        console.log(
          "\n📝 Please run the following SQL in Supabase SQL Editor:",
        );
        console.log("\n" + "=".repeat(80));
        console.log(migrationSQL);
        console.log("=".repeat(80) + "\n");
        return;
      }
    }

    console.log("✅ Migration 021 applied successfully!");
  } catch (err) {
    console.error("❌ Error applying migration:", err);
    console.log("\n📝 Please apply this SQL manually in Supabase SQL Editor:");
    const migrationPath = path.join(
      __dirname,
      "../migrations/021_fix_decision_conflicts_insert.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");
    console.log("\n" + "=".repeat(80));
    console.log(migrationSQL);
    console.log("=".repeat(80) + "\n");
  }
}

applyMigration();
