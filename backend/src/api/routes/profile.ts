
import { Router } from 'express';
import { Request, Response, NextFunction } from 'express';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/profile
 * Get the organization profile (singleton)
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const db = getDatabase();

        // Fetch the single profile row
        const { data, error } = await db
            .from('organization_profile')
            .select('*')
            .limit(1)
            .single();

        if (error) {
            // If no rows found (PGRST116), return empty object or null
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
 * Update or Create the organization profile
 */
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
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

        // Check if a profile exists
        const { data: existing } = await db
            .from('organization_profile')
            .select('id')
            .limit(1)
            .single();

        let result;

        if (existing) {
            // Update
            const { data, error } = await db
                .from('organization_profile')
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
                .eq('id', existing.id)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Create new
            const { data, error } = await db
                .from('organization_profile')
                .insert({
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
