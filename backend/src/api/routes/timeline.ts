import { Router, Response, NextFunction } from 'express';
import { getAdminDatabase } from '../../data/database';
import { AuthRequest } from '@middleware/auth';

const router = Router();

// unified event interface for the frontend
interface TimelineEvent {
    id: string;
    type: 'DECISION_CREATED' | 'LIFECYCLE_CHANGE' | 'HEALTH_CHANGE' | 'SIGNAL' | 'ASSUMPTION_LINK';
    timestamp: string;
    title: string;
    description: string;
    decisionId: string;
    decisionTitle: string;
    metadata: any;
    actor?: string; // "System" or "User" (if we had auth)
}

router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(401).json({ error: 'Organization ID required' });
        }

        const db = getAdminDatabase();
        const { decisionId, limit = 50 } = req.query;

        // 1. Fetch Decisions (Creation Events) - filtered by organization
        let decisionsQuery = db.from('decisions')
            .select('id, title, description, created_at, lifecycle, health_signal')
            .eq('organization_id', organizationId);
        if (decisionId) decisionsQuery = decisionsQuery.eq('id', decisionId);

        // 2. Fetch History (Lifecycle/Health Changes) - filtered by organization
        let historyQuery = db.from('evaluation_history').select(`
      id, decision_id, old_lifecycle, new_lifecycle, old_health_signal, new_health_signal, evaluated_at,
      decisions!inner (title, organization_id)
    `).eq('decisions.organization_id', organizationId);
        if (decisionId) historyQuery = historyQuery.eq('decision_id', decisionId);

        // 3. Fetch Signals (Manual Inputs) - filtered by organization
        let signalsQuery = db.from('decision_signals').select(`
      id, decision_id, type, description, impact, created_at, metadata,
      decisions!inner (title, organization_id)
    `).eq('decisions.organization_id', organizationId);
        if (decisionId) signalsQuery = signalsQuery.eq('decision_id', decisionId);

        // Execute parallel
        const [decisionsRes, historyRes, signalsRes] = await Promise.all([
            decisionsQuery.limit(20), // limit individual fetches
            historyQuery.limit(20),
            signalsQuery.limit(20)
        ]);

        if (decisionsRes.error) throw decisionsRes.error;
        if (historyRes.error) throw historyRes.error;
        if (signalsRes.error) throw signalsRes.error;

        const events: TimelineEvent[] = [];

        // Transform Decisions -> Events
        decisionsRes.data.forEach((d: any) => {
            events.push({
                id: `create-${d.id}`,
                type: 'DECISION_CREATED',
                timestamp: d.created_at,
                title: 'Decision Created',
                description: d.description || 'New decision tracked',
                decisionId: d.id,
                decisionTitle: d.title,
                metadata: { lifecycle: d.lifecycle, health: d.health_signal },
                actor: 'User'
            });
        });

        // Transform History -> Events
        historyRes.data.forEach((h: any) => {
            // Lifecycle change event
            if (h.old_lifecycle !== h.new_lifecycle) {
                events.push({
                    id: `life-${h.id}`,
                    type: 'LIFECYCLE_CHANGE',
                    timestamp: h.evaluated_at,
                    title: `Lifecycle: ${h.old_lifecycle} → ${h.new_lifecycle}`,
                    description: 'Decision lifecycle stage updated by system rules.',
                    decisionId: h.decision_id,
                    decisionTitle: h.decisions?.title || 'Unknown',
                    metadata: { from: h.old_lifecycle, to: h.new_lifecycle },
                    actor: 'System'
                });
            }

            // Health change event (significant only?)
            if (h.old_health_signal !== h.new_health_signal) {
                const diff = h.new_health_signal - h.old_health_signal;
                // Only show significant shifts or if it's a dedicated view
                if (Math.abs(diff) > 10 || decisionId) {
                    events.push({
                        id: `health-${h.id}`,
                        type: 'HEALTH_CHANGE',
                        timestamp: h.evaluated_at,
                        title: `Health Signal Update (${diff > 0 ? '+' : ''}${diff})`,
                        description: `Health score changed from ${h.old_health_signal} to ${h.new_health_signal}`,
                        decisionId: h.decision_id,
                        decisionTitle: h.decisions?.title || 'Unknown',
                        metadata: { from: h.old_health_signal, to: h.new_health_signal },
                        actor: 'System'
                    });
                }
            }
        });

        // Transform Signals -> Events
        signalsRes.data.forEach((s: any) => {
            events.push({
                id: s.id,
                type: 'SIGNAL',
                timestamp: s.created_at,
                title: `${s.type}: ${s.description.substring(0, 30)}...`,
                description: s.description,
                decisionId: s.decision_id,
                decisionTitle: s.decisions?.title || 'Unknown',
                metadata: { impact: s.impact, fullDescription: s.description },
                actor: 'User' // or specific user
            });
        });

        // Sort by timestamp DESC
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        // Slice to global limit
        const limitedEvents = events.slice(0, Number(limit));

        return res.json(limitedEvents);

    } catch (error) {
        return next(error);
    }
});

router.post('/signals', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { decision_id, type, description, impact, metadata } = req.body;
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(401).json({ error: 'Organization ID required' });
        }

        const db = getAdminDatabase();

        // Verify decision belongs to user's organization
        const { data: decision } = await db
            .from('decisions')
            .select('organization_id')
            .eq('id', decision_id)
            .single();

        if (!decision || decision.organization_id !== organizationId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const { data, error } = await db
            .from('decision_signals')
            .insert({
                decision_id,
                type,
                description,
                impact,
                metadata,
                organization_id: organizationId
            })
            .select()
            .single();

        if (error) throw error;
        return res.json(data);
    } catch (error) {
        return next(error);
    }
});

export default router;
