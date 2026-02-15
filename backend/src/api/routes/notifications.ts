/**
 * Notification Routes
 * HTTP routes for notification operations
 */

import { Router, Response, NextFunction } from 'express';
import { getAdminDatabase } from '@data/database';
import { AuthRequest } from '../../middleware/auth';

const router = Router();

/**
 * GET /api/notifications
 * Get all notifications (with optional filters)
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { unreadOnly, severity, type, limit = 50 } = req.query;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    let query = db
      .from('notifications')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit as string));

    // Filter by unread status
    if (unreadOnly === 'true') {
      query = query.eq('is_read', false).eq('is_dismissed', false);
    }

    // Filter by severity
    if (severity) {
      query = query.eq('severity', severity);
    }

    // Filter by type
    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    return next(error);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { count, error } = await db
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_read', false)
      .eq('is_dismissed', false);

    if (error) throw error;

    return res.json({ count: count || 0 });
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/notifications/:id/mark-read
 * Mark a notification as read
 */
router.put('/:id/mark-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { data, error } = await db
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.put('/mark-all-read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { error } = await db
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('organization_id', organizationId)
      .eq('is_read', false);

    if (error) throw error;

    return res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
});

/**
 * PUT /api/notifications/:id/dismiss
 * Dismiss a notification
 */
router.put('/:id/dismiss', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { data, error } = await db
      .from('notifications')
      .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) throw error;

    return res.json(data);
  } catch (error) {
    return next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Organization ID required' });
    }

    const db = getAdminDatabase();

    const { error } = await db
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) throw error;

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
