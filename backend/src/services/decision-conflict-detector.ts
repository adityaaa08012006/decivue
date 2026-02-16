/**
 * Decision Conflict Detector
 * Detects potential conflicts between decisions using semantic analysis
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../utils/logger";

export interface Decision {
  id: string;
  title: string;
  description: string;
  lifecycle: string;
  created_at?: string;
  metadata?: Record<string, any>;
  category?: string;
  parameters?: Record<string, any>;
}

export interface ConflictDetectionResult {
  conflictType:
    | "CONTRADICTORY"
    | "RESOURCE_COMPETITION"
    | "OBJECTIVE_UNDERMINING"
    | "PREMISE_INVALIDATION"
    | "MUTUALLY_EXCLUSIVE";
  confidenceScore: number; // 0.0 - 1.0
  explanation: string;
  aiGenerated?: boolean; // Whether the explanation was enhanced by AI
}

export class DecisionConflictDetector {
  // Resource-related keywords
  private readonly resourceKeywords = [
    "budget",
    "money",
    "cost",
    "spending",
    "expense",
    "investment",
    "fund",
    "hire",
    "headcount",
    "staff",
    "team",
    "employee",
    "personnel",
    "time",
    "resource",
    "capacity",
    "bandwidth",
    "space",
    "office",
    "facility",
    "equipment",
  ];

  // Action pairs that typically conflict
  private readonly actionConflicts = [
    ["increase", "decrease"],
    ["reduce", "expand"],
    ["more", "less"],
    ["hire", "layoff"],
    ["add", "remove"],
    ["start", "stop"],
    ["begin", "end"],
    ["create", "delete"],
    ["build", "dismantle"],
    ["grow", "shrink"],
    ["accelerate", "slow"],
    ["prioritize", "deprioritize"],
    ["invest", "divest"],
    ["acquire", "sell"],
    ["centralize", "decentralize"],
  ];

  // Negation words
  private readonly negationWords = [
    "no",
    "not",
    "never",
    "none",
    "neither",
    "nor",
    "cannot",
    "won't",
    "don't",
    "shouldn't",
  ];

  // Gemini AI for generating detailed explanations
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        logger.info("Gemini AI initialized for conflict explanations");
      } catch (error) {
        logger.warn("Failed to initialize Gemini AI", { error });
      }
    } else {
      logger.warn("GEMINI_API_KEY not found, using basic explanations");
    }
  }

  /**
   * Generate detailed explanation using Gemini LLM
   */
  private async generateDetailedExplanation(
    decisionA: Decision,
    decisionB: Decision,
    conflictType: string,
    basicExplanation: string,
  ): Promise<{ explanation: string; aiGenerated: boolean }> {
    if (!this.model) {
      return { explanation: basicExplanation, aiGenerated: false };
    }

    try {
      const prompt = `You are analyzing a conflict between two organizational decisions. Generate a clear, concise explanation (2-3 sentences) that answers:

1. Which decisions are involved? (Use their titles)
2. What aspect conflicts? (objective, resource, timeline, assumption, technical approach, etc.)
3. Why is this inconsistent or problematic?

Conflict Type: ${conflictType}

Decision A:
Title: ${decisionA.title}
Description: ${decisionA.description || "N/A"}
Category: ${decisionA.category || "N/A"}

Decision B:
Title: ${decisionB.title}
Description: ${decisionB.description || "N/A"}
Category: ${decisionB.category || "N/A"}

Basic Detection: ${basicExplanation}

Generate a professional, actionable explanation that clearly states the conflict without jargon.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (text && text.length > 10) {
        return { explanation: text.trim(), aiGenerated: true };
      }

      return { explanation: basicExplanation, aiGenerated: false };
    } catch (error) {
      logger.error("Failed to generate LLM explanation", { error });
      return { explanation: basicExplanation, aiGenerated: false };
    }
  }

  /**
   * Detect conflicts between two decisions
   */
  public async detectConflict(
    decisionA: Decision,
    decisionB: Decision,
  ): Promise<ConflictDetectionResult | null> {
    // Don't check a decision against itself
    if (decisionA.id === decisionB.id) {
      return null;
    }

    // Skip if either decision is already invalidated or retired
    if (
      decisionA.lifecycle === "INVALIDATED" ||
      decisionA.lifecycle === "RETIRED" ||
      decisionB.lifecycle === "INVALIDATED" ||
      decisionB.lifecycle === "RETIRED"
    ) {
      return null;
    }

    // Strategy 0: Structured parameter conflict detection (PRIORITY - most accurate)
    // Check if both decisions have category and parameters from dropdown selections
    if (
      decisionA.category &&
      decisionB.category &&
      decisionA.parameters &&
      decisionB.parameters
    ) {
      const structuredResult = this.detectStructuredConflict(
        decisionA,
        decisionB,
      );
      if (structuredResult) {
        logger.debug("Structured parameter conflict detected", {
          decisionA: decisionA.id,
          decisionB: decisionB.id,
          category: decisionA.category,
          confidence: structuredResult.confidenceScore,
        });
        
        const { explanation, aiGenerated } = await this.generateDetailedExplanation(
          decisionA,
          decisionB,
          structuredResult.conflictType,
          structuredResult.explanation,
        );
        
        return {
          ...structuredResult,
          explanation,
          aiGenerated,
        };
      }
    }

    const textA = this.getDecisionFullText(decisionA).toLowerCase();
    const textB = this.getDecisionFullText(decisionB).toLowerCase();

    // Strategy 1: Resource competition detection
    const resourceResult = this.detectResourceCompetition(
      textA,
      textB,
      decisionA,
      decisionB,
    );
    if (resourceResult) {
      logger.debug("Resource competition detected", {
        decisionA: decisionA.id,
        decisionB: decisionB.id,
        confidence: resourceResult.confidenceScore,
      });
      
      const { explanation, aiGenerated } = await this.generateDetailedExplanation(
        decisionA,
        decisionB,
        resourceResult.conflictType,
        resourceResult.explanation,
      );
      
      return {
        ...resourceResult,
        explanation,
        aiGenerated,
      };
    }

    // Strategy 2: Contradictory actions
    const contradictoryResult = this.detectContradictoryActions(
      textA,
      textB,
      decisionA,
      decisionB,
    );
    if (contradictoryResult) {
      logger.debug("Contradictory actions detected", {
        decisionA: decisionA.id,
        decisionB: decisionB.id,
        confidence: contradictoryResult.confidenceScore,
      });
      
      const { explanation, aiGenerated } = await this.generateDetailedExplanation(
        decisionA,
        decisionB,
        contradictoryResult.conflictType,
        contradictoryResult.explanation,
      );
      
      return {
        ...contradictoryResult,
        explanation,
        aiGenerated,
      };
    }

    // Strategy 3: Objective undermining
    const underminingResult = this.detectObjectiveUndermining(
      textA,
      textB,
      decisionA,
      decisionB,
    );
    if (underminingResult) {
      logger.debug("Objective undermining detected", {
        decisionA: decisionA.id,
        decisionB: decisionB.id,
        confidence: underminingResult.confidenceScore,
      });
      
      const { explanation, aiGenerated } = await this.generateDetailedExplanation(
        decisionA,
        decisionB,
        underminingResult.conflictType,
        underminingResult.explanation,
      );
      
      return {
        ...underminingResult,
        explanation,
        aiGenerated,
      };
    }

    // Strategy 4: Premise invalidation (newer invalidates older)
    const premiseResult = this.detectPremiseInvalidation(
      textA,
      textB,
      decisionA,
      decisionB,
    );
    if (premiseResult) {
      logger.debug("Premise invalidation detected", {
        decisionA: decisionA.id,
        decisionB: decisionB.id,
        confidence: premiseResult.confidenceScore,
      });
      
      const { explanation, aiGenerated } = await this.generateDetailedExplanation(
        decisionA,
        decisionB,
        premiseResult.conflictType,
        premiseResult.explanation,
      );
      
      return {
        ...premiseResult,
        explanation,
        aiGenerated,
      };
    }

    return null;
  }

  /**
   * Detect conflicts in a list of decisions (compare all pairs)
   */
  public async detectConflictsInList(decisions: Decision[]): Promise<Array<{
    decisionA: Decision;
    decisionB: Decision;
    conflict: ConflictDetectionResult;
  }>> {
    const conflicts: Array<{
      decisionA: Decision;
      decisionB: Decision;
      conflict: ConflictDetectionResult;
    }> = [];

    for (let i = 0; i < decisions.length; i++) {
      for (let j = i + 1; j < decisions.length; j++) {
        const conflict = await this.detectConflict(decisions[i], decisions[j]);
        if (conflict && conflict.confidenceScore >= 0.65) {
          // Lower threshold for decisions
          conflicts.push({
            decisionA: decisions[i],
            decisionB: decisions[j],
            conflict,
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Get full text from decision for analysis
   */
  private getDecisionFullText(decision: Decision): string {
    let text = decision.title;
    if (decision.description) text += " " + decision.description;
    return text;
  }

  /**
   * STRATEGY 0: Detect structured parameter conflicts
   * Detects conflicts based on dropdown parameters from structured decision entry
   * This is the most accurate method as it uses explicitly structured data
   */
  private detectStructuredConflict(
    decisionA: Decision,
    decisionB: Decision,
  ): ConflictDetectionResult | null {
    // Only works if both have the same category
    if (decisionA.category !== decisionB.category) {
      return null;
    }

    const paramsA = decisionA.parameters || {};
    const paramsB = decisionB.parameters || {};

    // Budget & Financial conflicts
    if (decisionA.category === "Budget & Financial") {
      // Check for conflicting budget allocations
      if (
        paramsA.amount &&
        paramsB.amount &&
        paramsA.timeframe === paramsB.timeframe
      ) {
        const amountA = parseFloat(
          String(paramsA.amount).replace(/[^0-9.-]/g, ""),
        );
        const amountB = parseFloat(
          String(paramsB.amount).replace(/[^0-9.-]/g, ""),
        );

        // Different amounts for same timeframe = potential conflict
        if (!isNaN(amountA) && !isNaN(amountB) && amountA !== amountB) {
          return {
            conflictType: "CONTRADICTORY",
            confidenceScore: 0.92,
            explanation: `Conflicting budget allocations for ${paramsA.timeframe}: "${decisionA.title}" specifies ${paramsA.amount} while "${decisionB.title}" specifies ${paramsB.amount}. These decisions may contradict each other's financial planning.`,
          };
        }
      }

      // Check for contradictory direction (e.g., increase vs decrease)
      if (paramsA.direction && paramsB.direction) {
        const oppositeDirections = [
          ["Increase", "Decrease"],
          ["Expand", "Reduce"],
          ["Approve", "Reject"],
        ];

        for (const [dir1, dir2] of oppositeDirections) {
          if (
            (paramsA.direction === dir1 && paramsB.direction === dir2) ||
            (paramsA.direction === dir2 && paramsB.direction === dir1)
          ) {
            return {
              conflictType: "CONTRADICTORY",
              confidenceScore: 0.95,
              explanation: `Direct budget conflict: "${decisionA.title}" aims to ${paramsA.direction} while "${decisionB.title}" aims to ${paramsB.direction} in the same budget area. These decisions are contradictory.`,
            };
          }
        }
      }

      // Check for same resource with different allocations
      if (
        paramsA.resourceType &&
        paramsB.resourceType &&
        paramsA.resourceType === paramsB.resourceType
      ) {
        if (
          paramsA.allocation &&
          paramsB.allocation &&
          paramsA.allocation !== paramsB.allocation
        ) {
          return {
            conflictType: "RESOURCE_COMPETITION",
            confidenceScore: 0.88,
            explanation: `Both decisions compete for ${paramsA.resourceType} with different allocation requirements: "${decisionA.title}" requires ${paramsA.allocation} while "${decisionB.title}" requires ${paramsB.allocation}.`,
          };
        }
      }
    }

    // Resource Allocation conflicts
    if (decisionA.category === "Resource Allocation") {
      // Check for same resource type with conflicting actions
      if (
        paramsA.resourceType === paramsB.resourceType &&
        paramsA.timeframe === paramsB.timeframe
      ) {
        // Check for contradictory actions
        if (paramsA.action && paramsB.action) {
          const conflictingActions = [
            ["Allocate", "Deallocate"],
            ["Add", "Remove"],
            ["Hire", "Layoff"],
            ["Increase", "Decrease"],
          ];

          for (const [action1, action2] of conflictingActions) {
            if (
              (paramsA.action === action1 && paramsB.action === action2) ||
              (paramsA.action === action2 && paramsB.action === action1)
            ) {
              return {
                conflictType: "RESOURCE_COMPETITION",
                confidenceScore: 0.94,
                explanation: `Contradictory resource actions on ${paramsA.resourceType} in ${paramsA.timeframe}: "${decisionA.title}" plans to ${paramsA.action} while "${decisionB.title}" plans to ${paramsB.action}.`,
              };
            }
          }
        }

        // Even if actions don't directly conflict, same resource + same timeframe = potential competition
        if (paramsA.quantity && paramsB.quantity) {
          return {
            conflictType: "RESOURCE_COMPETITION",
            confidenceScore: 0.82,
            explanation: `Both decisions compete for ${paramsA.resourceType} in ${paramsA.timeframe}. "${decisionA.title}" and "${decisionB.title}" may need resource prioritization or reallocation.`,
          };
        }
      }
    }

    // Timeline & Milestones conflicts
    if (decisionA.category === "Timeline & Milestones") {
      if (
        paramsA.milestone === paramsB.milestone &&
        paramsA.targetDate &&
        paramsB.targetDate
      ) {
        // Same milestone but different target dates
        if (paramsA.targetDate !== paramsB.targetDate) {
          return {
            conflictType: "CONTRADICTORY",
            confidenceScore: 0.9,
            explanation: `Conflicting target dates for ${paramsA.milestone}: "${decisionA.title}" targets ${paramsA.targetDate} while "${decisionB.title}" targets ${paramsB.targetDate}. These decisions have incompatible timelines.`,
          };
        }
      }

      // Check for contradictory timeline expectations
      if (paramsA.expectation && paramsB.expectation) {
        const opposites = [
          ["Accelerate", "Delay"],
          ["On Track", "At Risk"],
          ["Meet Deadline", "Miss Deadline"],
        ];

        for (const [exp1, exp2] of opposites) {
          if (
            (paramsA.expectation.includes(exp1) &&
              paramsB.expectation.includes(exp2)) ||
            (paramsA.expectation.includes(exp2) &&
              paramsB.expectation.includes(exp1))
          ) {
            return {
              conflictType: "CONTRADICTORY",
              confidenceScore: 0.93,
              explanation: `Incompatible timeline expectations: "${decisionA.title}" expects to ${paramsA.expectation} while "${decisionB.title}" expects to ${paramsB.expectation}.`,
            };
          }
        }
      }
    }

    // Strategic Initiative conflicts
    if (decisionA.category === "Strategic Initiative") {
      // Check for conflicting priorities
      if (
        paramsA.priority &&
        paramsB.priority &&
        paramsA.impactArea === paramsB.impactArea
      ) {
        // If targeting same area with different priorities, could cause confusion
        if (paramsA.priority !== paramsB.priority) {
          return {
            conflictType: "OBJECTIVE_UNDERMINING",
            confidenceScore: 0.78,
            explanation: `Both decisions impact ${paramsA.impactArea} but have different priority levels (${paramsA.priority} vs ${paramsB.priority}). This may cause conflicting resource allocation or execution focus.`,
          };
        }
      }

      // Check for contradictory directions on same impact area
      if (
        paramsA.impactArea &&
        paramsB.impactArea &&
        paramsA.impactArea === paramsB.impactArea
      ) {
        if (paramsA.direction && paramsB.direction) {
          const dirA = String(paramsA.direction).toLowerCase();
          const dirB = String(paramsB.direction).toLowerCase();

          const oppositeDirections = [
            ["increase", "decrease"],
            ["improve", "reduce"],
            ["expand", "contract"],
            ["grow", "shrink"],
          ];

          let isOpposite = false;
          for (const [dir1, dir2] of oppositeDirections) {
            if (
              (dirA.includes(dir1) && dirB.includes(dir2)) ||
              (dirA.includes(dir2) && dirB.includes(dir1))
            ) {
              isOpposite = true;
              break;
            }
          }

          if (isOpposite) {
            return {
              conflictType: "CONTRADICTORY",
              confidenceScore: 0.96,
              explanation: `Direct conflict on ${paramsA.impactArea}: "${decisionA.title}" aims to ${paramsA.direction} while "${decisionB.title}" aims to ${paramsB.direction}. These strategic decisions are working against each other.`,
            };
          }
        }
      }
    }

    // Technical Architecture conflicts
    if (decisionA.category === "Technical Architecture") {
      // Check for conflicting technology choices
      if (
        paramsA.component === paramsB.component &&
        paramsA.technology &&
        paramsB.technology
      ) {
        if (paramsA.technology !== paramsB.technology) {
          return {
            conflictType: "MUTUALLY_EXCLUSIVE",
            confidenceScore: 0.91,
            explanation: `Conflicting technology decisions for ${paramsA.component}: "${decisionA.title}" chooses ${paramsA.technology} while "${decisionB.title}" chooses ${paramsB.technology}. These decisions cannot both be implemented.`,
          };
        }
      }

      // Check for architectural approach conflicts
      if (paramsA.approach && paramsB.approach) {
        const conflictingApproaches = [
          ["Monolith", "Microservices"],
          ["Centralized", "Distributed"],
          ["SQL", "NoSQL"],
          ["Synchronous", "Asynchronous"],
        ];

        for (const [approach1, approach2] of conflictingApproaches) {
          if (
            (String(paramsA.approach).includes(approach1) &&
              String(paramsB.approach).includes(approach2)) ||
            (String(paramsA.approach).includes(approach2) &&
              String(paramsB.approach).includes(approach1))
          ) {
            return {
              conflictType: "CONTRADICTORY",
              confidenceScore: 0.89,
              explanation: `Fundamentally different architectural approaches: "${decisionA.title}" adopts ${paramsA.approach} while "${decisionB.title}" adopts ${paramsB.approach}. These decisions reflect incompatible architectural visions.`,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * STRATEGY 1: Detect resource competition
   * Two decisions competing for the same limited resource
   */
  private detectResourceCompetition(
    textA: string,
    textB: string,
    decisionA: Decision,
    decisionB: Decision,
  ): ConflictDetectionResult | null {
    // Look for resource keywords in both texts
    const resourcesA = this.resourceKeywords.filter((keyword) =>
      textA.includes(keyword),
    );
    const resourcesB = this.resourceKeywords.filter((keyword) =>
      textB.includes(keyword),
    );

    const sharedResources = resourcesA.filter((r) => resourcesB.includes(r));

    if (sharedResources.length > 0) {
      // Check if both are trying to allocate/use the same resource
      const allocationKeywords = [
        "allocate",
        "use",
        "spend",
        "invest",
        "assign",
        "dedicate",
        "commit",
      ];
      const hasAllocationA = allocationKeywords.some((kw) =>
        textA.includes(kw),
      );
      const hasAllocationB = allocationKeywords.some((kw) =>
        textB.includes(kw),
      );

      if (hasAllocationA && hasAllocationB) {
        // Check for quantitative indicators
        const hasQuantityA = /\d+/.test(textA);
        const hasQuantityB = /\d+/.test(textB);

        let confidence = 0.7;
        if (hasQuantityA && hasQuantityB) confidence = 0.85;
        if (sharedResources.length >= 2) confidence += 0.05;

        return {
          conflictType: "RESOURCE_COMPETITION",
          confidenceScore: Math.min(confidence, 1.0),
          explanation: `Both decisions compete for limited ${sharedResources.join(", ")} resources. "${decisionA.title}" and "${decisionB.title}" may need to be prioritized or resource allocation adjusted.`,
        };
      }
    }

    return null;
  }

  /**
   * STRATEGY 2: Detect contradictory actions
   * Two decisions with opposing actions on same subject
   */
  private detectContradictoryActions(
    textA: string,
    textB: string,
    decisionA: Decision,
    decisionB: Decision,
  ): ConflictDetectionResult | null {
    for (const [action1, action2] of this.actionConflicts) {
      const hasAction1InA = textA.includes(action1);
      const hasAction2InA = textA.includes(action2);
      const hasAction1InB = textB.includes(action1);
      const hasAction2InB = textB.includes(action2);

      // Check for contradictory actions: A has action1, B has action2 (or vice versa)
      if (
        (hasAction1InA && hasAction2InB) ||
        (hasAction2InA && hasAction1InB)
      ) {
        // Find common subject/context
        const wordsA = textA.split(/\s+/);
        const wordsB = textB.split(/\s+/);
        const commonWords = wordsA.filter(
          (word) =>
            word.length > 4 &&
            wordsB.includes(word) &&
            ![
              "will",
              "should",
              "would",
              "could",
              "that",
              "this",
              "with",
              "from",
            ].includes(word),
        );

        if (commonWords.length >= 2) {
          const action = hasAction1InA ? action1 : action2;
          const opposingAction = hasAction1InA ? action2 : action1;

          return {
            conflictType: "CONTRADICTORY",
            confidenceScore: 0.8,
            explanation: `Direct contradiction detected: "${decisionA.title}" aims to ${action} while "${decisionB.title}" aims to ${opposingAction} in the same context. These decisions work against each other.`,
          };
        }
      }
    }

    return null;
  }

  /**
   * STRATEGY 3: Detect objective undermining
   * One decision undermines the objective of another
   */
  private detectObjectiveUndermining(
    textA: string,
    textB: string,
    decisionA: Decision,
    decisionB: Decision,
  ): ConflictDetectionResult | null {
    // Look for goal/objective keywords
    const goalKeywords = [
      "goal",
      "objective",
      "target",
      "aim",
      "purpose",
      "outcome",
      "result",
      "achieve",
    ];
    const hasGoalA = goalKeywords.some((kw) => textA.includes(kw));
    const hasGoalB = goalKeywords.some((kw) => textB.includes(kw));

    if (hasGoalA || hasGoalB) {
      // Check for undermining patterns
      const underminingPatterns = [
        ["improve", "reduce"],
        ["enhance", "cut"],
        ["optimize", "sacrifice"],
        ["quality", "speed"],
        ["growth", "stability"],
        ["innovation", "standardize"],
      ];

      for (const [goal, underminer] of underminingPatterns) {
        if (
          (textA.includes(goal) && textB.includes(underminer)) ||
          (textB.includes(goal) && textA.includes(underminer))
        ) {
          return {
            conflictType: "OBJECTIVE_UNDERMINING",
            confidenceScore: 0.75,
            explanation: `Potential conflict: "${decisionA.title}" and "${decisionB.title}" may have competing priorities. One decision's approach could undermine the objectives of the other.`,
          };
        }
      }
    }

    return null;
  }

  /**
   * STRATEGY 4: Detect premise invalidation
   * A newer decision invalidates the premise of an older one
   */
  private detectPremiseInvalidation(
    textA: string,
    textB: string,
    decisionA: Decision,
    decisionB: Decision,
  ): ConflictDetectionResult | null {
    // Determine which is newer
    const dateA = decisionA.created_at
      ? new Date(decisionA.created_at)
      : new Date();
    const dateB = decisionB.created_at
      ? new Date(decisionB.created_at)
      : new Date();

    const [older, newer, olderText, newerText] =
      dateA < dateB
        ? [decisionA, decisionB, textA, textB]
        : [decisionB, decisionA, textB, textA];

    // Look for invalidation patterns
    const invalidationKeywords = [
      "replace",
      "supersede",
      "cancel",
      "reverse",
      "obsolete",
      "deprecate",
      "override",
      "nullify",
      "void",
      "abandon",
    ];

    const hasInvalidation = invalidationKeywords.some((kw) =>
      newerText.includes(kw),
    );

    if (hasInvalidation) {
      // Check if newer text references concepts from older
      const olderKeywords = olderText.split(/\s+/).filter((w) => w.length > 5);
      const sharedConcepts = olderKeywords.filter((kw) =>
        newerText.includes(kw),
      );

      if (sharedConcepts.length >= 2) {
        return {
          conflictType: "PREMISE_INVALIDATION",
          confidenceScore: 0.8,
          explanation: `The newer decision "${newer.title}" may invalidate the premise of the earlier decision "${older.title}". Consider whether the older decision is still valid.`,
        };
      }
    }

    // Also check for implicit invalidation through negation
    const hasNegation = this.negationWords.some((nw) => newerText.includes(nw));
    if (hasNegation) {
      const wordsOlder = olderText.split(/\s+/);
      const wordsNewer = newerText.split(/\s+/);
      const commonSubstantiveWords = wordsOlder.filter(
        (word) =>
          word.length > 5 &&
          wordsNewer.includes(word) &&
          !["should", "would", "could", "decision", "which", "there"].includes(
            word,
          ),
      );

      if (commonSubstantiveWords.length >= 3) {
        return {
          conflictType: "PREMISE_INVALIDATION",
          confidenceScore: 0.7,
          explanation: `"${newer.title}" appears to contradict or negate aspects of "${older.title}". Review if both decisions can coexist or if one should be updated.`,
        };
      }
    }

    return null;
  }
}
