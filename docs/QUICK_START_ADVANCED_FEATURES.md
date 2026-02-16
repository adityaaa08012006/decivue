# Quick Start: Implementing Advanced Features

## Where to Begin

Start with **Phase 1: Decision Versioning** - it's the foundation for all other features.

## First Migration to Create

**File**: `backend/migrations/014_decision_versioning.sql`

```sql
-- =====================================================
-- DECISION VERSIONING SYSTEM
-- Migration 014
-- =====================================================

-- Version history table
CREATE TABLE decision_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,

  -- Snapshot of decision state
  title TEXT NOT NULL,
  description TEXT,
  lifecycle TEXT NOT NULL,
  health_signal INTEGER NOT NULL,

  -- What changed
  change_summary TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT CHECK (change_type IN (
    'CREATED',
    'ASSUMPTION_CHANGE',
    'METADATA_UPDATE',
    'LIFECYCLE_CHANGE',
    'GOVERNANCE_REVIEW'
  )) NOT NULL,

  -- Version metadata
  assumptions_snapshot JSONB,
  constraints_snapshot JSONB,
  metadata_snapshot JSONB,
  confidence_at_version DECIMAL(5,2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(decision_id, version_number)
);

CREATE INDEX idx_decision_versions_decision ON decision_versions(decision_id, version_number DESC);
CREATE INDEX idx_decision_versions_org ON decision_versions(organization_id);
CREATE INDEX idx_decision_versions_date ON decision_versions(created_at DESC);

-- Add version tracking to decisions
ALTER TABLE decisions
  ADD COLUMN IF NOT EXISTS current_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_lock BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS version_lock_reason TEXT;

-- Confidence history
CREATE TABLE decision_confidence_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_number INTEGER,
  confidence_score DECIMAL(5,2) NOT NULL,
  contributing_factors JSONB NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_confidence_history_decision ON decision_confidence_history(decision_id, recorded_at DESC);
CREATE INDEX idx_confidence_history_org ON decision_confidence_history(organization_id);

-- Enable RLS
ALTER TABLE decision_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_confidence_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org scoped decision_versions"
ON decision_versions FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

CREATE POLICY "Org scoped confidence_history"
ON decision_confidence_history FOR ALL
TO authenticated
USING (organization_id = public.user_organization_id())
WITH CHECK (organization_id = public.user_organization_id());

-- Verification
DO $$
BEGIN
  RAISE NOTICE 'Migration 014 complete: Decision versioning system installed';
END $$;
```

## First Service to Create

**File**: `backend/src/services/decision-versioning-service.ts`

```typescript
import { getDatabase } from "@data/database";
import { logger } from "@utils/logger";

export type VersionChangeType =
  | "CREATED"
  | "ASSUMPTION_CHANGE"
  | "METADATA_UPDATE"
  | "LIFECYCLE_CHANGE"
  | "GOVERNANCE_REVIEW";

export interface DecisionVersion {
  id: string;
  decision_id: string;
  version_number: number;
  title: string;
  description: string;
  lifecycle: string;
  health_signal: number;
  change_summary: string;
  changed_by: string;
  change_type: VersionChangeType;
  assumptions_snapshot: any[];
  constraints_snapshot: any[];
  metadata_snapshot: any;
  confidence_at_version: number;
  created_at: Date;
}

export interface VersionComparison {
  versionA: DecisionVersion;
  versionB: DecisionVersion;
  changes: {
    title?: { old: string; new: string };
    description?: { old: string; new: string };
    lifecycle?: { old: string; new: string };
    assumptionsAdded: any[];
    assumptionsRemoved: any[];
    constraintsAdded: any[];
    constraintsRemoved: any[];
    confidenceDelta: number;
    metadataChanges: any;
  };
}

export class DecisionVersioningService {
  /**
   * Create a new version when decision changes
   */
  async createVersion(
    decisionId: string,
    changeSummary: string,
    changeType: VersionChangeType,
    userId: string,
  ): Promise<DecisionVersion> {
    const db = getDatabase();

    try {
      // 1. Get current decision state
      const { data: decision, error: decisionError } = await db
        .from("decisions")
        .select("*")
        .eq("id", decisionId)
        .single();

      if (decisionError) throw decisionError;
      if (!decision) throw new Error("Decision not found");

      // 2. Get current version number
      const currentVersion = decision.current_version || 1;
      const newVersion = currentVersion + 1;

      // 3. Get assumptions snapshot
      const { data: assumptions } = await db
        .from("decision_assumptions")
        .select("assumption_id, assumptions(*)")
        .eq("decision_id", decisionId);

      // 4. Get constraints snapshot
      const { data: constraints } = await db
        .from("decision_constraints")
        .select("constraint_id, constraints(*)")
        .eq("decision_id", decisionId);

      // 5. Calculate confidence from health_signal
      const confidence = this.calculateConfidence(decision.health_signal);

      // 6. Create version record
      const { data: version, error: versionError } = await db
        .from("decision_versions")
        .insert({
          decision_id: decisionId,
          organization_id: decision.organization_id,
          version_number: newVersion,
          title: decision.title,
          description: decision.description,
          lifecycle: decision.lifecycle,
          health_signal: decision.health_signal,
          change_summary: changeSummary,
          changed_by: userId,
          change_type: changeType,
          assumptions_snapshot: assumptions?.map((a) => a.assumptions) || [],
          constraints_snapshot: constraints?.map((c) => c.constraints) || [],
          metadata_snapshot: decision.metadata,
          confidence_at_version: confidence,
        })
        .select()
        .single();

      if (versionError) throw versionError;

      // 7. Update decision's current version
      await db
        .from("decisions")
        .update({ current_version: newVersion })
        .eq("id", decisionId);

      // 8. Record confidence history
      await this.recordConfidence(
        decisionId,
        decision.organization_id,
        newVersion,
        confidence,
        {
          health_signal: decision.health_signal,
          assumption_count: assumptions?.length || 0,
          lifecycle: decision.lifecycle,
        },
      );

      logger.info("Decision version created", {
        decisionId,
        versionNumber: newVersion,
        changeType,
      });

      return version;
    } catch (error) {
      logger.error("Failed to create decision version", { decisionId, error });
      throw error;
    }
  }

  /**
   * Compare two versions and show differences
   */
  async compareVersions(
    decisionId: string,
    versionA: number,
    versionB: number,
  ): Promise<VersionComparison> {
    const db = getDatabase();

    const { data: versions, error } = await db
      .from("decision_versions")
      .select("*")
      .eq("decision_id", decisionId)
      .in("version_number", [versionA, versionB])
      .order("version_number");

    if (error) throw error;
    if (versions.length !== 2) throw new Error("Versions not found");

    const [vA, vB] = versions;

    return {
      versionA: vA,
      versionB: vB,
      changes: {
        title:
          vA.title !== vB.title ? { old: vA.title, new: vB.title } : undefined,
        description:
          vA.description !== vB.description
            ? { old: vA.description, new: vB.description }
            : undefined,
        lifecycle:
          vA.lifecycle !== vB.lifecycle
            ? { old: vA.lifecycle, new: vB.lifecycle }
            : undefined,
        assumptionsAdded: this.findAdded(
          vA.assumptions_snapshot,
          vB.assumptions_snapshot,
        ),
        assumptionsRemoved: this.findRemoved(
          vA.assumptions_snapshot,
          vB.assumptions_snapshot,
        ),
        constraintsAdded: this.findAdded(
          vA.constraints_snapshot,
          vB.constraints_snapshot,
        ),
        constraintsRemoved: this.findRemoved(
          vA.constraints_snapshot,
          vB.constraints_snapshot,
        ),
        confidenceDelta: vB.confidence_at_version - vA.confidence_at_version,
        metadataChanges: this.diffMetadata(
          vA.metadata_snapshot,
          vB.metadata_snapshot,
        ),
      },
    };
  }

  /**
   * Detect if confidence dropped significantly
   */
  async detectConfidenceDrop(
    decisionId: string,
    thresholdPercent: number = 15,
  ): Promise<{
    dropped: boolean;
    delta: number;
    versions: [number, number];
  } | null> {
    const db = getDatabase();

    const { data: recentVersions } = await db
      .from("decision_versions")
      .select("version_number, confidence_at_version")
      .eq("decision_id", decisionId)
      .order("version_number", { ascending: false })
      .limit(2);

    if (!recentVersions || recentVersions.length < 2) return null;

    const [current, previous] = recentVersions;
    const delta =
      current.confidence_at_version - previous.confidence_at_version;

    if (delta < -thresholdPercent) {
      return {
        dropped: true,
        delta,
        versions: [previous.version_number, current.version_number],
      };
    }

    return null;
  }

  /**
   * Get all versions for a decision
   */
  async getVersionHistory(decisionId: string): Promise<DecisionVersion[]> {
    const db = getDatabase();

    const { data: versions, error } = await db
      .from("decision_versions")
      .select("*")
      .eq("decision_id", decisionId)
      .order("version_number", { ascending: false });

    if (error) throw error;
    return versions || [];
  }

  // Helper methods

  private calculateConfidence(healthSignal: number): number {
    // Convert 0-100 health signal to confidence score
    return Math.round(healthSignal * 100) / 100;
  }

  private async recordConfidence(
    decisionId: string,
    organizationId: string,
    versionNumber: number,
    confidence: number,
    factors: any,
  ): Promise<void> {
    const db = getDatabase();

    await db.from("decision_confidence_history").insert({
      decision_id: decisionId,
      organization_id: organizationId,
      version_number: versionNumber,
      confidence_score: confidence,
      contributing_factors: factors,
    });
  }

  private findAdded(oldArray: any[], newArray: any[]): any[] {
    const oldIds = new Set(oldArray.map((item) => item.id));
    return newArray.filter((item) => !oldIds.has(item.id));
  }

  private findRemoved(oldArray: any[], newArray: any[]): any[] {
    const newIds = new Set(newArray.map((item) => item.id));
    return oldArray.filter((item) => !newIds.has(item.id));
  }

  private diffMetadata(oldMeta: any, newMeta: any): any {
    // Simple diff - can be enhanced
    const changes: any = {};
    const allKeys = new Set([
      ...Object.keys(oldMeta || {}),
      ...Object.keys(newMeta || {}),
    ]);

    for (const key of allKeys) {
      if (JSON.stringify(oldMeta?.[key]) !== JSON.stringify(newMeta?.[key])) {
        changes[key] = { old: oldMeta?.[key], new: newMeta?.[key] };
      }
    }

    return changes;
  }
}

export const decisionVersioningService = new DecisionVersioningService();
```

## First API Routes

**File**: `backend/src/api/routes/decision-versions.ts`

```typescript
import { Router } from "express";
import { Request, Response, NextFunction } from "express";
import { decisionVersioningService } from "../../services/decision-versioning-service";
import { logger } from "@utils/logger";

const router = Router();

/**
 * GET /api/decisions/:id/versions
 * Get version history for a decision
 */
router.get(
  "/:id/versions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const versions = await decisionVersioningService.getVersionHistory(id);
      return res.json(versions);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/decisions/:id/versions/compare
 * Compare two versions
 * Query params: from (version number), to (version number)
 */
router.get(
  "/:id/versions/compare",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const from = parseInt(req.query.from as string);
      const to = parseInt(req.query.to as string);

      if (!from || !to) {
        return res
          .status(400)
          .json({ error: 'Both "from" and "to" version numbers required' });
      }

      const comparison = await decisionVersioningService.compareVersions(
        id,
        from,
        to,
      );
      return res.json(comparison);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/decisions/:id/versions/confidence-trend
 * Get confidence trend over versions
 */
router.get(
  "/:id/versions/confidence-trend",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const versions = await decisionVersioningService.getVersionHistory(id);

      const trend = versions.map((v) => ({
        version: v.version_number,
        confidence: v.confidence_at_version,
        date: v.created_at,
      }));

      return res.json(trend);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * POST /api/decisions/:id/versions
 * Manually create a version (for testing/migration)
 */
router.post(
  "/:id/versions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { changeSummary, changeType } = req.body;
      const userId = (req as any).user?.id || "SYSTEM";

      if (!changeSummary) {
        return res.status(400).json({ error: "changeSummary required" });
      }

      const version = await decisionVersioningService.createVersion(
        id,
        changeSummary,
        changeType || "METADATA_UPDATE",
        userId,
      );

      return res.status(201).json(version);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * GET /api/decisions/:id/versions/confidence-drop
 * Check if confidence dropped recently
 */
router.get(
  "/:id/versions/confidence-drop",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const threshold = parseFloat(req.query.threshold as string) || 15;

      const drop = await decisionVersioningService.detectConfidenceDrop(
        id,
        threshold,
      );
      return res.json(drop || { dropped: false });
    } catch (error) {
      return next(error);
    }
  },
);

export default router;
```

## Register the Routes

**In**: `backend/src/api/index.ts`

```typescript
import decisionVersionRoutes from "./routes/decision-versions";

// Add to your route registration
app.use("/api/decisions", decisionVersionRoutes);
```

## Test It

```bash
# Run the migration
npm run migrate:014

# Start the backend
npm run dev

# Test creating a version
curl -X POST http://localhost:3001/api/decisions/{decisionId}/versions \
  -H "Content-Type: application/json" \
  -d '{"changeSummary": "Initial version", "changeType": "CREATED"}'

# Get version history
curl http://localhost:3001/api/decisions/{decisionId}/versions

# Compare versions
curl http://localhost:3001/api/decisions/{decisionId}/versions/compare?from=1&to=2
```

## Next Steps After Phase 1

1. Hook versioning into existing decision update flow
2. Add frontend UI to view version history
3. Build version comparison component
4. Move to Phase 2: Review Threading

---

See [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) for the full plan.
