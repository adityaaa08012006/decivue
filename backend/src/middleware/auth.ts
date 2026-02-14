import { Request, Response, NextFunction } from 'express';
import { supabase } from '../data/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'lead' | 'member';
    organizationId: string;
    fullName?: string;
  };
  accessToken?: string; // Store JWT for authenticated Supabase client
}

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing or invalid authorization header',
        code: 'AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7);

    // Store token for use with authenticated Supabase client
    req.accessToken = token;

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'TOKEN_INVALID'
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, organization_id, full_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }

    // Attach to request
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role as 'lead' | 'member',
      organizationId: profile.organization_id,
      fullName: profile.full_name,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: ('lead' | 'member')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'AUTH_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

/**
 * Optional auth - attach user if token present, but don't block
 */
export async function optionalAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('id, email, role, organization_id, full_name')
        .eq('id', user.id)
        .single();

      if (profile) {
        req.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role as 'lead' | 'member',
          organizationId: profile.organization_id,
          fullName: profile.full_name,
        };
      }
    }

    next();
  } catch (error) {
    // Continue without user on error
    next();
  }
}
