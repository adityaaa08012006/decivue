/**
 * Seed Script: Add Conflicting Decisions for Testing
 * Creates pairs of decisions that should trigger conflict detection
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables",
  );
  process.exit(1);
}

const db = createClient(supabaseUrl, supabaseServiceKey);

interface TestDecision {
  title: string;
  description: string;
  category?: string;
  parameters?: Record<string, any>;
}

const conflictingDecisionPairs: TestDecision[][] = [
  // Pair 1: Budget Contradiction
  [
    {
      title: "Reduce Marketing Spend by 30%",
      description:
        "Cut marketing budget from $100k to $70k to reduce overall spending",
      category: "Budget & Financial",
      parameters: {
        direction: "Decrease",
        resource_type: "Marketing Budget",
        amount: 30000,
      },
    },
    {
      title: "Launch Aggressive Marketing Campaign",
      description:
        "Hire 5 new marketing contractors and increase ad spend by $50k",
      category: "Budget & Financial",
      parameters: {
        direction: "Increase",
        resource_type: "Marketing Budget",
        amount: 50000,
      },
    },
  ],

  // Pair 2: Resource Competition
  [
    {
      title: "Expand Engineering Team by 10 People",
      description:
        "Hire 10 senior engineers to accelerate product development timeline",
      category: "Resource Allocation",
      parameters: {
        resource_type: "Engineering Team",
        action: "Hire",
        count: 10,
      },
    },
    {
      title: "Freeze All Hiring for Q1",
      description:
        "Implement hiring freeze to control costs during market uncertainty",
      category: "Resource Allocation",
      parameters: {
        resource_type: "All Departments",
        action: "Freeze",
        duration: "Q1",
      },
    },
  ],

  // Pair 3: Timeline Contradiction
  [
    {
      title: "Launch Product Beta in 2 Weeks",
      description: "Accelerate beta launch to beat competitor release",
      category: "Timeline & Milestones",
      parameters: {
        milestone: "Beta Launch",
        timeline: "2 weeks",
        priority: "High",
      },
    },
    {
      title: "Delay All Releases for Quality Assurance",
      description:
        "Extend QA testing period by 6 weeks to ensure product stability",
      category: "Timeline & Milestones",
      parameters: {
        milestone: "All Releases",
        timeline: "6 weeks delay",
        priority: "High",
      },
    },
  ],

  // Pair 4: Strategic Contradiction
  [
    {
      title: "Focus on Enterprise B2B Market",
      description:
        "Pivot product strategy to target large enterprise customers",
      category: "Strategic Initiative",
      parameters: {
        target_market: "Enterprise B2B",
        focus: "Large Customers",
      },
    },
    {
      title: "Double Down on Consumer Self-Service",
      description:
        "Invest heavily in consumer-friendly features and self-service tools",
      category: "Strategic Initiative",
      parameters: {
        target_market: "Consumer",
        focus: "Self-Service",
      },
    },
  ],

  // Pair 5: Technical Architecture Contradiction
  [
    {
      title: "Migrate All Services to AWS",
      description: "Complete migration from Azure to AWS by end of quarter",
      category: "Technical Architecture",
      parameters: {
        platform: "AWS",
        action: "Migrate To",
        timeline: "End of Quarter",
      },
    },
    {
      title: "Expand Azure Infrastructure Investment",
      description:
        "Purchase 3-year Azure reserved instances and expand Azure services",
      category: "Technical Architecture",
      parameters: {
        platform: "Azure",
        action: "Expand",
        commitment: "3 years",
      },
    },
  ],

  // Pair 6: Spending vs Cost-Cutting
  [
    {
      title: "Reduce Overall Operating Expenses by 25%",
      description:
        "Company-wide cost reduction initiative to improve profitability",
      category: "Budget & Financial",
      parameters: {
        direction: "Decrease",
        scope: "Company-wide",
        percentage: 25,
      },
    },
    {
      title: "Build New Office Space with Premium Amenities",
      description:
        "Invest $2M in new office with gym, cafeteria, and collaboration spaces",
      category: "Budget & Financial",
      parameters: {
        direction: "Increase",
        resource_type: "Infrastructure Budget",
        amount: 2000000,
      },
    },
  ],

  // Pair 7: Quality vs Speed
  [
    {
      title: "Implement Rigorous Code Review Process",
      description:
        "Require 3 senior engineer approvals for all production code changes",
      category: "Technical Architecture",
      parameters: {
        process: "Code Review",
        requirement: "3 approvals",
        focus: "Quality",
      },
    },
    {
      title: "Move Fast and Ship Features Daily",
      description:
        "Adopt continuous deployment with minimal review to ship faster",
      category: "Strategic Initiative",
      parameters: {
        deployment: "Continuous",
        review: "Minimal",
        focus: "Speed",
      },
    },
  ],

  // Pair 8: Headcount Contradiction
  [
    {
      title: "Reduce Workforce by 15%",
      description:
        "Layoff 15% of employees across all departments to cut costs",
      category: "Resource Allocation",
      parameters: {
        action: "Reduce",
        scope: "All Departments",
        percentage: 15,
      },
    },
    {
      title: "Hire 20 Customer Support Representatives",
      description:
        "Rapidly expand customer support team to improve satisfaction",
      category: "Resource Allocation",
      parameters: {
        action: "Hire",
        department: "Customer Support",
        count: 20,
      },
    },
  ],
];

async function seedConflictingDecisions() {
  try {
    console.log("🔄 Starting to seed conflicting decisions...\n");

    // Get the Anushk TRY organization specifically
    const { data: org, error: orgError } = await db
      .from("organizations")
      .select("id, name")
      .eq("name", "Anushk TRY")
      .single();

    if (orgError || !org) {
      console.error(
        "❌ Anushk TRY organization not found. Please ensure it exists first.",
      );
      console.error(`Error: ${orgError?.message || "Organization not found"}`);
      process.exit(1);
    }

    const organizationId = org.id;
    console.log(`📋 Using organization: ${org.name} (${organizationId})\n`);

    let pairNumber = 1;
    const insertedPairs: string[][] = [];

    for (const pair of conflictingDecisionPairs) {
      console.log(`\n🔄 Inserting Pair ${pairNumber}:`);
      console.log(`   Decision A: ${pair[0].title}`);
      console.log(`   Decision B: ${pair[1].title}`);

      const decisionIds: string[] = [];

      for (const decision of pair) {
        const { data, error } = await db
          .from("decisions")
          .insert({
            title: decision.title,
            description: decision.description,
            lifecycle: "STABLE",
            health_signal: 95,
            organization_id: organizationId,
            metadata: {
              category: decision.category,
              parameters: decision.parameters,
            },
          })
          .select("id")
          .single();

        if (error) {
          console.error(`   ❌ Error inserting decision: ${error.message}`);
          continue;
        }

        if (data) {
          decisionIds.push(data.id);
        }
      }

      if (decisionIds.length === 2) {
        insertedPairs.push(decisionIds);
        console.log(`   ✅ Successfully inserted pair ${pairNumber}`);
      }

      pairNumber++;
    }

    console.log(
      `\n\n✅ Successfully seeded ${insertedPairs.length} conflicting decision pairs!`,
    );
    console.log(`\n📊 Summary:`);
    console.log(`   - Total decisions created: ${insertedPairs.length * 2}`);
    console.log(`   - Organization: ${org.name}`);
    console.log(`\n🔍 Next steps:`);
    console.log(`   1. Navigate to the Decision Conflicts page in the UI`);
    console.log(`   2. Click "Run Detection" to detect conflicts`);
    console.log(`   3. Review and resolve the detected conflicts\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding decisions:", error);
    process.exit(1);
  }
}

// Run the seed script
seedConflictingDecisions();
