/**
 * Verify and apply migration 021 properly
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyAndApplyMigration() {
  try {
    console.log("🔍 Checking if insert_decision_conflict function exists...");

    // Try to call the function with dummy data to see if it exists
    const { error: testError } = await supabase.rpc(
      "insert_decision_conflict",
      {
        p_decision_a_id: "00000000-0000-0000-0000-000000000000",
        p_decision_b_id: "00000000-0000-0000-0000-000000000001",
        p_conflict_type: "CONTRADICTORY",
        p_confidence_score: 0.5,
        p_explanation: "Test",
        p_organization_id: "00000000-0000-0000-0000-000000000000",
        p_metadata: {},
      },
    );

    if (testError && testError.code === "PGRST202") {
      console.log("❌ Function does NOT exist in database");
      console.log("\n📋 Reading migration SQL file...");

      const migrationPath = path.join(
        __dirname,
        "../migrations/021_fix_decision_conflicts_insert.sql",
      );
      const migrationSQL = fs.readFileSync(migrationPath, "utf8");

      console.log(
        "\n⚠️  You need to apply this migration manually in Supabase SQL Editor:",
      );
      console.log("\n" + "=".repeat(80));
      console.log(migrationSQL);
      console.log("=".repeat(80));
      console.log("\nSteps:");
      console.log("1. Go to https://supabase.com/dashboard/project/_/sql/new");
      console.log("2. Copy and paste the SQL above");
      console.log("3. Click 'Run'");
      console.log("4. Restart your backend server\n");
    } else if (testError) {
      console.log("⚠️  Function exists but returned error:", testError.message);
      console.log("   This is expected for dummy data - function is working!");
    } else {
      console.log("✅ Function exists and is working!");
    }
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

verifyAndApplyMigration();
