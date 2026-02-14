import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { getDatabase } from '@data/database';

const router = Router();

/**
 * GET /api/users
 * Get all users in the same organization as the authenticated user
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = req.accessToken
      ? require('@data/database').getAuthenticatedDatabase(req.accessToken)
      : getDatabase();

    // Get all users from the same organization
    const { data: users, error } = await db
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }

    // Format the response
    const formattedUsers = (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));

    return res.json({
      users: formattedUsers,
      total: formattedUsers.length
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
