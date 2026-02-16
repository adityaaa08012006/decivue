import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAssumptionScopes() {
  console.log("\n=== Checking Assumption Scopes ===\n");

  // Get all assumptions with their scope and linked decisions
  const { data: assumptions, error } = await supabase
    .from("assumptions")
    .select(
      `
      id,
      description,
      scope,
      status,
      organization_id
    `,
    )
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching assumptions:", error);
    return;
  }

  console.log(`Found ${assumptions?.length || 0} assumptions\n`);

  for (const assumption of assumptions || []) {
    const desc = assumption.description.substring(0, 80);
    console.log(`\nID: ${assumption.id}`);
    console.log(
      `Description: ${desc}${assumption.description.length > 80 ? "..." : ""}`,
    );
    console.log(`Scope: ${assumption.scope}`);
    console.log(`Status: ${assumption.status}`);

    // Get linked decisions
    const { data: links } = await supabase
      .from("decision_assumptions")
      .select("decision_id, decisions(title)")
      .eq("assumption_id", assumption.id);

    if (links && links.length > 0) {
      console.log(`Linked to ${links.length} decision(s):`);
      links.forEach((link: any) => {
        console.log(`  - ${link.decisions.title}`);
      });
    } else {
      console.log("Not linked to any decisions");
    }
    console.log("---");
  }
}

checkAssumptionScopes()
  .then(() => {
    console.log("\n✅ Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
