/**
 * Time Simulation Route
 * Allows simulating time jumps to test system behavior
 */

import { Router, Request, Response } from 'express';
import { getAdminDatabase } from '@data/database';
import { DeterministicEngine } from '@engine/index';
import { EvaluationInput } from '@engine/types';
import { logger } from '@utils/logger';

const router = Router();

// Store the simulated time offset in memory
// null means no simulation active (use real time)
let simulatedTimeOffset: number | null = null;

/**
 * Get the current time (simulated or real)
 * This is exported so other modules can use the simulated time
 */
export function getCurrentTime(): Date {
  return simulatedTimeOffset 
    ? new Date(Date.now() + simulatedTimeOffset)
    : new Date();
}

/**
 * POST /api/simulate-time
 * Simulate a time jump and re-evaluate all decisions
 */
router.post('/', async (req: Request, res: Response): Promise<any> => {
  try {
    const supabase = getAdminDatabase();
    const { days} = req.body;

    if (!days || typeof days !== 'number' || days <= 0) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'days must be a positive number'
      });
    }

    logger.info(`Time simulation requested: +${days} days`);

    // Calculate simulated timestamp and store offset
    const simulatedTimestamp = new Date();
    simulatedTimestamp.setDate(simulatedTimestamp.getDate() + days);
    simulatedTimeOffset = days * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    // Fetch all decisions
    const { data: decisions, error: decisionsError } = await supabase
      .from('decisions')
      .select('*')
      .neq('lifecycle', 'RETIRED');

    if (decisionsError) {
      throw decisionsError;
    }

    if (!decisions || decisions.length === 0) {
      return res.json({
        evaluatedCount: 0,
        healthChanges: 0,
        lifecycleChanges: 0,
        newNotifications: 0,
        message: 'No decisions to evaluate'
      });
    }

    const engine = new DeterministicEngine();
    let healthChanges = 0;
    let lifecycleChanges = 0;

    // Evaluate each decision with simulated time
    for (const decision of decisions) {
      // Fetch related data
      const [assumptionsResult, constraintsResult, dependenciesResult] = await Promise.all([
        supabase
          .from('decision_assumptions')
          .select('assumptions(*)')
          .eq('decision_id', decision.id),
        supabase
          .from('decision_constraints')
          .select('constraints(*)')
          .eq('decision_id', decision.id),
        supabase
          .from('dependencies')
          .select('blocking_decision_id, decisions!dependencies_blocking_decision_id_fkey(id, title, description, health_signal, lifecycle, created_at, last_reviewed_at, expiry_date, metadata)')
          .eq('blocked_decision_id', decision.id)
      ]);

      const assumptions = (assumptionsResult.data || [])
        .map((da: any) => da.assumptions)
        .filter(Boolean);

      const constraints = (constraintsResult.data || [])
        .map((dc: any) => dc.constraints)
        .filter(Boolean);

      const dependencies = (dependenciesResult.data || [])
        .map((dep: any) => ({
          id: dep.decisions?.id,
          title: dep.decisions?.title || '',
          description: dep.decisions?.description || '',
          healthSignal: dep.decisions?.health_signal || 100,
          lifecycle: dep.decisions?.lifecycle || 'STABLE',
          createdAt: dep.decisions?.created_at ? new Date(dep.decisions.created_at) : new Date(),
          lastReviewedAt: dep.decisions?.last_reviewed_at ? new Date(dep.decisions.last_reviewed_at) : new Date(),
          expiryDate: dep.decisions?.expiry_date ? new Date(dep.decisions.expiry_date) : undefined,
          metadata: dep.decisions?.metadata || {}
        }))
        .filter((dep: any) => dep.id);

      // Prepare evaluation input with simulated time
      const evaluationInput: EvaluationInput = {
        decision: {
          id: decision.id,
          title: decision.title,
          description: decision.description,
          lifecycle: decision.lifecycle,
          healthSignal: decision.health_signal,
          lastReviewedAt: new Date(decision.last_reviewed_at),
          createdAt: new Date(decision.created_at),
          expiryDate: decision.expiry_date ? new Date(decision.expiry_date) : undefined,
          metadata: decision.metadata || {}
        },
        assumptions: assumptions.map((a: any) => ({
          id: a.id,
          description: a.description,
          status: a.status,
          createdAt: a.created_at ? new Date(a.created_at) : new Date(),
          validatedAt: a.validated_at ? new Date(a.validated_at) : undefined,
          metadata: a.metadata || {}
        })) as any,
        constraints: constraints.map((c: any) => ({
          id: c.id,
          name: c.constraint_name ||'',
          description: c.description || '',
          constraintType: c.constraint_type || 'OTHER',
          ruleExpression: c.rule_definition,
          isImmutable: c.is_immutable !== false,
          createdAt: c.created_at ? new Date(c.created_at) : new Date(),
          // Keep database fields for engine compatibility
          constraint_name: c.constraint_name,
          constraint_type: c.constraint_type,
          rule_definition: c.rule_definition,
          scope: c.scope
        })) as any,
        dependencies: dependencies,
        currentTimestamp: simulatedTimestamp // Use simulated time
      };

      // Run evaluation
      const result = engine.evaluate(evaluationInput);

      // Track changes
      if (result.newHealthSignal !== decision.health_signal) {
        healthChanges++;
      }
      if (result.newLifecycle !== decision.lifecycle) {
        lifecycleChanges++;
      }

      // Update decision if changes detected
      if (result.changesDetected) {
        logger.info(`Updating decision ${decision.id}: health ${decision.health_signal} -> ${result.newHealthSignal}, lifecycle ${decision.lifecycle} -> ${result.newLifecycle}`);

        const { data: updateData, error: updateError } = await supabase
          .from('decisions')
          .update({
            health_signal: result.newHealthSignal,
            lifecycle: result.newLifecycle,
            invalidated_reason: result.invalidatedReason
          })
          .eq('id', decision.id);

        if (updateError) {
          logger.error(`Failed to update decision ${decision.id}:`, updateError);
          throw updateError;
        }

        logger.info(`Successfully updated decision ${decision.id}`);

        // Create notifications for significant changes
        const notifications = [];

        // Create lifecycle change notification
        if (result.newLifecycle !== decision.lifecycle) {
          let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'WARNING';
          let notifType: string = 'LIFECYCLE_CHANGED';

          if (result.newLifecycle === 'INVALIDATED') {
            severity = 'CRITICAL';
          } else if (result.newLifecycle === 'AT_RISK') {
            severity = 'CRITICAL';
          } else if (result.newLifecycle === 'UNDER_REVIEW') {
            severity = 'WARNING';
            notifType = 'NEEDS_REVIEW';
          }

          notifications.push({
            decision_id: decision.id,
            organization_id: decision.organization_id,
            type: notifType,
            severity,
            title: `Decision ${result.newLifecycle.toLowerCase().replace('_', ' ')}`,
            message: `"${decision.title}" changed from ${decision.lifecycle} to ${result.newLifecycle} (time simulation +${days}d)`,
            metadata: {
              from: decision.lifecycle,
              to: result.newLifecycle,
              reason: 'time_simulation',
              simulatedDays: days
            }
          });
        }

        // Create health degradation notification if health dropped significantly
        const healthDrop = decision.health_signal - result.newHealthSignal;
        if (healthDrop >= 10) {
          let severity: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
          if (healthDrop >= 40) severity = 'CRITICAL';
          else if (healthDrop >= 20) severity = 'WARNING';

          notifications.push({
            decision_id: decision.id,
            organization_id: decision.organization_id,
            type: 'HEALTH_DEGRADED',
            severity,
            title: `Health declined by ${healthDrop} points`,
            message: `"${decision.title}" health reduced from ${decision.health_signal} to ${result.newHealthSignal} (time simulation +${days}d)`,
            metadata: {
              from: decision.health_signal,
              to: result.newHealthSignal,
              drop: healthDrop,
              reason: 'time_decay',
              simulatedDays: days
            }
          });
        }

        // Insert notifications
        if (notifications.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            logger.error(`Failed to create notifications for decision ${decision.id}:`, notifError);
          } else {
            logger.info(`Created ${notifications.length} notification(s) for decision ${decision.id}`);
          }
        }


        // Create timeline event for lifecycle change
        if (result.newLifecycle !== decision.lifecycle) {
          await supabase.from('timeline_events').insert({
            type: 'LIFECYCLE_CHANGE',
            decision_id: decision.id,
            decision_title: decision.title,
            title: `Lifecycle changed: ${decision.lifecycle} → ${result.newLifecycle}`,
            description: `Time simulation (+${days}d) triggered lifecycle change`,
            metadata: {
              from: decision.lifecycle,
              to: result.newLifecycle,
              reason: 'time_simulation',
              simulatedDays: days
            }
          });
        }

        // Create timeline event for health change
        if (result.newHealthSignal !== decision.health_signal) {
          await supabase.from('timeline_events').insert({
            type: 'HEALTH_CHANGE',
            decision_id: decision.id,
            decision_title: decision.title,
            title: `Health changed: ${decision.health_signal} → ${result.newHealthSignal}`,
            description: `Time simulation (+${days}d) triggered health decay`,
            metadata: {
              from: decision.health_signal,
              to: result.newHealthSignal,
              reason: 'time_decay',
              simulatedDays: days
            }
          });
        }
      }
    }

    // Count new notifications (created in the last few seconds)
    const { count: newNotifications } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 5000).toISOString());

    logger.info(`Time simulation complete: ${decisions.length} evaluated, ${healthChanges} health changes, ${lifecycleChanges} lifecycle changes`);

    res.json({
      evaluatedCount: decisions.length,
      healthChanges,
      lifecycleChanges,
      newNotifications: newNotifications || 0,
      simulatedTimestamp: simulatedTimestamp.toISOString()
    });

  } catch (error: any) {
    logger.error('Time simulation failed', { error: error.message });
    res.status(500).json({
      error: 'Simulation failed',
      message: error.message
    });
  }
});

/**
 * GET /api/simulate-time/current
 * Get the current time (simulated or real)
 */
router.get('/current', (_req: Request, res: Response): any => {
  const currentTime = getCurrentTime();
  
  return res.json({
    currentTime: currentTime.toISOString(),
    isSimulated: simulatedTimeOffset !== null,
    offsetDays: simulatedTimeOffset ? Math.floor(simulatedTimeOffset / (1000 * 60 * 60 * 24)) : 0
  });
});

/**
 * DELETE /api/simulate-time/reset
 * Reset time simulation to real time
 */
router.delete('/reset', (_req: Request, res: Response): any => {
  simulatedTimeOffset = null;
  logger.info('Time simulation reset to real time');
  
  return res.json({
    message: 'Time simulation reset',
    currentTime: getCurrentTime().toISOString(),
    isSimulated: false
  });
});

export default router;
