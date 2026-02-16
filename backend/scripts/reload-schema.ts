/**
 * Reload PostgREST schema cache after migration
 */

import { createClient } from "@supabase/supabase-js";
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

async function reloadSchema() {
  try {
    console.log("🔄 Sending schema reload notification to PostgREST...");

    // Execute NOTIFY to reload PostgREST schema cache
    const { error } = await supabase.rpc("exec", {
      sql: "NOTIFY pgrst, 'reload schema';",
    });

    if (error) {
      console.log("⚠️  Direct NOTIFY failed, trying alternative method...");

      // Alternative: just query the function to force cache refresh
      const { error: testError } = await supabase.rpc(
        "insert_decision_conflict",
        {
          p_decision_a_id: "00000000-0000-0000-0000-000000000000",
          p_decision_b_id: "00000000-0000-0000-0000-000000000001",
          p_conflict_type: "CONTRADICTORY",
          p_confidence_score: 0.5,
          p_explanation: "Test function existence",
          p_organization_id: "00000000-0000-0000-0000-000000000000",
          p_metadata: {},
        },
      );

      if (testError) {
        console.log("\n⚠️  Function still not available.");
        console.log("\n📋 Please reload the PostgREST schema manually:");
        console.log("   1. Go to Supabase Dashboard > SQL Editor");
        console.log("   2. Run: NOTIFY pgrst, 'reload schema';");
        console.log("   3. Or restart your backend server\n");
        return;
      }
    }

    console.log("✅ Schema cache reload signal sent!");
    console.log("   The backend should pick up the new function now.");
  } catch (err) {
    console.error("❌ Error:", err);
    console.log("\n📋 Manual steps:");
    console.log("   1. Restart your backend server (Ctrl+C and restart)");
    console.log(
      "   2. Or run in Supabase SQL Editor: NOTIFY pgrst, 'reload schema';\n",
    );
  }
}

reloadSchema();
