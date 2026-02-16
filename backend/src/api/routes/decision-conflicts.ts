/**
 * Decision Conflicts Routes
 * HTTP routes for decision conflict detection and resolution operations
 */

import { Router } from "express";
import { Response, NextFunction } from "express";
import { getAuthenticatedDatabase } from "@data/database";
import { DecisionConflictDetector } from "../../services/decision-conflict-detector";
import { logger } from "@utils/logger";
import { AuthRequest } from "../../middleware/auth";

const router = Router();
const detector = new DecisionConflictDetector();

/**
 * GET /api/decision-conflicts
 * Get all decision conflicts (optionally filter by unresolved)
 */
router.get("/", async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const includeResolved = req.query.includeResolved === "true";
    const db = getAuthenticatedDatabase(req.accessToken!);

    const { data, error } = await db.rpc("get_all_decision_conflicts", {
      include_resolved: includeResolved,
    });

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/decision-conflicts/:decisionId
 * Get all conflicts for a specific decision
 */
router.get(
  "/:decisionId",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { decisionId } = req.params;
      const db = getAuthenticatedDatabase(req.accessToken!);

      const { data, error } = await db.rpc("get_decision_conflicts", {
        target_decision_id: decisionId,
      });

      if (error) throw error;

      return res.json(data || []);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/decision-conflicts/detect
 * Run conflict detection on all decisions or specific ones
 */
router.post(
  "/detect",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { decisionIds } = req.body; // Optional: specific decisions to check
      const db = getAuthenticatedDatabase(req.accessToken!);

      // Fetch decisions (exclude invalidated and retired)
      let query = db
        .from("decisions")
        .select(
          "id, title, description, lifecycle, created_at, metadata, category, parameters",
        )
        .in("lifecycle", ["STABLE", "UNDER_REVIEW", "AT_RISK"]);

      if (decisionIds && Array.isArray(decisionIds)) {
        query = query.in("id", decisionIds);
      }

      const { data: decisions, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      if (!decisions || decisions.length === 0) {
        return res.json({
          message: "No active decisions to check",
          conflictsDetected: 0,
          conflicts: [],
        });
      }

      // Detect conflicts
      const detectedConflicts = detector.detectConflictsInList(
        decisions.map((d) => ({
          id: d.id,
          title: d.title,
          description: d.description || "",
          lifecycle: d.lifecycle,
          created_at: d.created_at,
          metadata: d.metadata,
          category: d.category,
          parameters: d.parameters,
        })),
      );

      // Record new conflicts in database (only if confidence >= 0.65)
      const newConflicts: any[] = [];

      for (const { decisionA, decisionB, conflict } of detectedConflicts) {
        // Ensure proper ordering for unique constraint
        const [minId, maxId] = [decisionA.id, decisionB.id].sort();

        // Check if conflict already exists
        const { data: existing } = await db.rpc("decision_conflict_exists", {
          decision_id_1: minId,
          decision_id_2: maxId,
        });

        if (!existing) {
          // Get organization_id from decisionA
          const { data: decisionData } = await db
            .from("decisions")
            .select("organization_id")
            .eq("id", minId)
            .single();

          if (!decisionData) {
            logger.warn("Could not find decision for conflict", {
              decisionId: minId,
            });
            continue;
          }

          // Create new conflict record using RPC to bypass RLS and avoid stack depth errors
          const { data: conflictId, error: insertError } = await db.rpc(
            "insert_decision_conflict",
            {
              p_decision_a_id: minId,
              p_decision_b_id: maxId,
              p_conflict_type: conflict.conflictType,
              p_confidence_score: conflict.confidenceScore,
              p_explanation: conflict.explanation,
              p_organization_id: decisionData.organization_id,
              p_metadata: {},
            },
          );

          if (!insertError && conflictId) {
            newConflicts.push({
              id: conflictId,
              decision_a_id: minId,
              decision_b_id: maxId,
              conflict_type: conflict.conflictType,
              confidence_score: conflict.confidenceScore,
              explanation: conflict.explanation,
            });
            logger.info("Decision conflict detected and recorded", {
              conflictId,
              decisionA: minId,
              decisionB: maxId,
              confidence: conflict.confidenceScore,
              type: conflict.conflictType,
            });
          } else if (insertError) {
            logger.error("Failed to insert decision conflict", {
              error: insertError,
            });
          }
        }
      }

      return res.json({
        message: `Conflict detection complete`,
        conflictsDetected: newConflicts.length,
        totalConflictsFound: detectedConflicts.length,
        conflicts: newConflicts,
      });
    } catch (error) {
      logger.error("Error in decision conflict detection", { error });
      return next(error);
    }
  },
);

/**
 * PUT /api/decision-conflicts/:id/resolve
 * Resolve a conflict with a specific action
 */
router.put(
  "/:id/resolve",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { resolutionAction, resolutionNotes } = req.body;

      if (!resolutionAction) {
        return res.status(400).json({ error: "Resolution action is required" });
      }

      const validActions = [
        "PRIORITIZE_A",
        "PRIORITIZE_B",
        "MODIFY_BOTH",
        "DEPRECATE_BOTH",
        "KEEP_BOTH",
      ];
      if (!validActions.includes(resolutionAction)) {
        return res.status(400).json({ error: "Invalid resolution action" });
      }

      const db = getAuthenticatedDatabase(req.accessToken!);

      // Update the conflict
      const { data, error } = await db
        .from("decision_conflicts")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_action: resolutionAction,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      logger.info("Decision conflict resolved", {
        conflictId: id,
        resolutionAction,
      });

      // Apply resolution actions to the decisions if needed
      if (resolutionAction === "DEPRECATE_BOTH" && data) {
        await db
          .from("decisions")
          .update({ lifecycle: "INVALIDATED" })
          .in("id", [data.decision_a_id, data.decision_b_id]);

        logger.info("Both decisions deprecated due to conflict resolution", {
          decisionIds: [data.decision_a_id, data.decision_b_id],
        });
      }

      return res.json(data);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * DELETE /api/decision-conflicts/:id
 * Delete a conflict (mark as false positive)
 */
router.delete(
  "/:id",
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const db = getAuthenticatedDatabase(req.accessToken!);

      const { error } = await db
        .from("decision_conflicts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      logger.info("Decision conflict deleted (false positive)", {
        conflictId: id,
      });

      return res.json({ message: "Conflict deleted successfully" });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
