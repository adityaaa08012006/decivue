import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAssumptionScopes() {
  console.log("\n=== Fixing Assumption Scopes ===\n");

  // Assumptions that should be UNIVERSAL (organizational)
  const assumptionsToFix = [
    "Product development budget will remain stable for the next 3 months",
    "No unplanned reduction in team capacity is expected this quarter",
  ];

  for (const description of assumptionsToFix) {
    // Find the assumption
    const { data: assumptions, error: findError } = await supabase
      .from("assumptions")
      .select("id, description, scope")
      .ilike("description", `%${description}%`)
      .limit(1);

    if (findError) {
      console.error(`❌ Error finding assumption: ${description}`, findError);
      continue;
    }

    if (!assumptions || assumptions.length === 0) {
      console.log(
        `⚠️  Assumption not found: ${description.substring(0, 50)}...`,
      );
      continue;
    }

    const assumption = assumptions[0];
    console.log(`\nFound: ${assumption.description.substring(0, 60)}...`);
    console.log(`Current scope: ${assumption.scope}`);

    if (assumption.scope === "UNIVERSAL") {
      console.log("✓ Already UNIVERSAL, no change needed");
      continue;
    }

    // Update to UNIVERSAL
    const { error: updateError } = await supabase
      .from("assumptions")
      .update({ scope: "UNIVERSAL" })
      .eq("id", assumption.id);

    if (updateError) {
      console.error("❌ Error updating:", updateError);
    } else {
      console.log("✅ Updated to UNIVERSAL");
    }
  }

  console.log("\n=== Done ===\n");
}

fixAssumptionScopes()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
