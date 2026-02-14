
import { Router, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';
import { AuthRequest } from '@middleware/auth';

const router = Router();

/**
 * GET /api/profile
 * Get the organization profile for the authenticated user's organization
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const db = getDatabase();
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Fetch profile for this organization
        const { data, error } = await db
            .from('organization_profiles')
            .select('*')
            .eq('organization_id', organizationId)
            .single();

        if (error) {
            // If no rows found (PGRST116), return null
            if (error.code === 'PGRST116') {
                return res.json(null);
            }
            throw error;
        }

        return res.json(data);
    } catch (error) {
        return next(error);
    }
});

/**
 * PUT /api/profile
 * Update or Create the organization profile for authenticated user's organization
 */
router.put('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const {
            name,
            industry,
            size,
            decision_style,
            risk_tolerance,
            strategic_priorities,
            constraints
        } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Organization name is required' });
        }

        const db = getDatabase();
        const organizationId = req.user?.organizationId;

        if (!organizationId) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Check if a profile exists for this organization
        const { data: existing } = await db
            .from('organization_profiles')
            .select('organization_id')
            .eq('organization_id', organizationId)
            .single();

        let result;

        if (existing) {
            // Update existing profile
            const { data, error } = await db
                .from('organization_profiles')
                .update({
                    name,
                    industry,
                    size,
                    decision_style,
                    risk_tolerance,
                    strategic_priorities,
                    constraints,
                    updated_at: new Date()
                })
                .eq('organization_id', organizationId)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Create new profile
            const { data, error } = await db
                .from('organization_profiles')
                .insert({
                    organization_id: organizationId,
                    name,
                    industry,
                    size,
                    decision_style,
                    risk_tolerance,
                    strategic_priorities,
                    constraints
                })
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        return res.json(result);
    } catch (error) {
        return next(error);
    }
});

export default router;
