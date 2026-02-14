# AUTHENTICATION & ROLE-BASED ACCESS CONTROL - IMPLEMENTATION PLAN

## EXECUTIVE SUMMARY

This document outlines the complete implementation plan for adding role-based authentication with organization-based access control to DECIVUE. The system currently has NO authentication - all routes are open and there is no user management.

### Current State Analysis
- **Authentication**: None - all API routes are publicly accessible
- **Database**: Supabase configured for data access only (no auth integration)
- **RLS Policies**: Enabled but permissive (`USING (true)` - allow all)
- **Frontend**: No login/registration flow
- **Architecture**: Event-driven, deterministic decision engine with full audit trails

### Implementation Scope
1. Multi-organization support with unique organization codes
2. Two roles: Organization Lead (Admin) and Team Member
3. Supabase Auth integration (email/password)
4. Organization-scoped data isolation
5. Role-based decision permissions
6. Registration flows (create org vs join org)
7. Protected routes and role-based UI

---

## PART 1: DATABASE SCHEMA MODIFICATIONS

### 1.1 New Tables

#### **users** Table
Purpose: Store user profiles linked to Supabase Auth
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

**Fields:**
- `id`: Links to Supabase auth.users(id)
- `email`: User email (must match auth.users.email)
- `full_name`: Display name
- `role`: Either 'lead' (admin) or 'member'
- `organization_id`: Links to organization

#### **organizations** Table
Purpose: Store organization details and unique join codes
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_org_code ON organizations(org_code);
```

**Fields:**
- `id`: Organization UUID
- `name`: Organization name (user-provided during registration)
- `org_code`: 8-character unique code for joining (e.g., "ORG-A1B2")
- `created_by`: User who created the organization

**Org Code Generation Function:**
```sql
CREATE OR REPLACE FUNCTION generate_org_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    -- Generate format: ORG-XXXX (4 alphanumeric chars)
    code := 'ORG-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4));

    SELECT EXISTS(SELECT 1 FROM organizations WHERE org_code = code) INTO exists_already;

    EXIT WHEN NOT exists_already;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;
```

### 1.2 Modify Existing Tables

All decision-related tables need `organization_id` field:

#### Tables to Modify:
- `decisions`
- `assumptions`
- `constraints`
- `decision_tensions`
- `evaluation_history`
- `organization_profile` (rename to `organization_profiles`)
- `decision_signals`
- `notifications`
- `parameter_templates`

#### Example Migration (apply pattern to all):
```sql
-- Add organization_id to decisions
ALTER TABLE decisions
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Backfill for existing data (temporary - will be removed after migration)
UPDATE decisions SET organization_id = (SELECT id FROM organizations LIMIT 1);

-- Make NOT NULL after backfill
ALTER TABLE decisions ALTER COLUMN organization_id SET NOT NULL;

-- Add index
CREATE INDEX idx_decisions_organization ON decisions(organization_id);
```

**Apply same pattern to:**
- assumptions
- constraints
- decision_tensions
- evaluation_history
- decision_signals
- notifications
- parameter_templates

#### Special Case: organization_profile → organization_profiles
Currently singleton table. Change to one profile per organization:
```sql
-- Rename table
ALTER TABLE organization_profile RENAME TO organization_profiles;

-- Add organization_id
ALTER TABLE organization_profiles
ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Make organization_id the primary key
ALTER TABLE organization_profiles DROP CONSTRAINT IF EXISTS organization_profile_pkey;
ALTER TABLE organization_profiles ADD PRIMARY KEY (organization_id);
```

### 1.3 Row-Level Security (RLS) Policies

**Critical**: Replace permissive policies with organization-scoped policies.

#### Helper Function: Get Current User's Organization
```sql
CREATE OR REPLACE FUNCTION auth.user_organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;
```

#### RLS Policy Pattern (apply to all tables with organization_id):
```sql
-- Example: decisions table
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON decisions;

-- Organization isolation policy
CREATE POLICY "Users can only access their organization's decisions"
ON decisions
FOR ALL
USING (organization_id = auth.user_organization_id());

-- Apply INSERT/UPDATE checks
CREATE POLICY "Users can only insert into their organization"
ON decisions
FOR INSERT
WITH CHECK (organization_id = auth.user_organization_id());
```

**Apply to tables:**
- decisions
- assumptions
- constraints
- decision_assumptions
- decision_constraints
- dependencies
- decision_tensions
- assumption_conflicts
- evaluation_history
- decision_signals
- notifications
- organization_profiles
- constraint_violations

#### Special RLS: Role-Based Decision Editing
```sql
-- Only allow editing decisions created by user OR if user is lead
CREATE OR REPLACE FUNCTION auth.can_edit_decision(decision_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  decision_creator UUID;
BEGIN
  -- Get current user role
  SELECT role INTO user_role FROM users WHERE id = auth.uid();

  -- Leads can edit any decision in their org
  IF user_role = 'lead' THEN
    RETURN TRUE;
  END IF;

  -- Members can only edit their own decisions
  SELECT created_by INTO decision_creator FROM decisions WHERE id = decision_id;
  RETURN decision_creator = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;

-- Update policy on decisions table
CREATE POLICY "Decision edit permissions"
ON decisions
FOR UPDATE
USING (auth.can_edit_decision(id));
```

#### Users Table RLS
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read all users in their organization
CREATE POLICY "Users can view organization members"
ON users
FOR SELECT
USING (organization_id = auth.user_organization_id());

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (id = auth.uid());
```

#### Organizations Table RLS
```sql
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own organization
CREATE POLICY "Users can view their organization"
ON organizations
FOR SELECT
USING (id = auth.user_organization_id());

-- Only leads can update organization
CREATE POLICY "Only leads can update organization"
ON organizations
FOR UPDATE
USING (
  id = auth.user_organization_id()
  AND
  (SELECT role FROM users WHERE id = auth.uid()) = 'lead'
);
```

---

## PART 2: BACKEND IMPLEMENTATION

### 2.1 Environment Variables

Update `backend/.env.example`:
```env
# Existing
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
PORT=3001

# New - Required for auth
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For admin operations
JWT_SECRET=your_jwt_secret  # For token validation (optional - Supabase handles)
```

### 2.2 Authentication Middleware

Create `backend/src/middleware/auth.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../data/database';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'lead' | 'member';
    organizationId: string;
  };
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
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found' });
    }

    // Attach to request
    req.user = {
      id: profile.id,
      email: profile.email,
      role: profile.role as 'lead' | 'member',
      organizationId: profile.organization_id,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: ('lead' | 'member')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
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
        .select('id, email, role, organization_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        req.user = {
          id: profile.id,
          email: profile.email,
          role: profile.role as 'lead' | 'member',
          organizationId: profile.organization_id,
        };
      }
    }

    next();
  } catch (error) {
    next(); // Continue without user on error
  }
}
```

### 2.3 New API Routes

Create `backend/src/api/routes/auth.ts`:
```typescript
import { Router } from 'express';
import { supabase } from '../../data/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerCreateOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  organizationName: z.string().min(1),
});

const registerJoinOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(1),
  orgCode: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/register/create-org
 * Register new user and create organization
 */
router.post('/register/create-org', async (req, res) => {
  try {
    const { email, password, fullName, organizationName } = registerCreateOrgSchema.parse(req.body);

    // 1. Create auth user via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    const userId = authData.user.id;

    // 2. Generate unique org code
    const { data: orgCodeData, error: orgCodeError } = await supabase
      .rpc('generate_org_code');

    if (orgCodeError || !orgCodeData) {
      return res.status(500).json({ error: 'Failed to generate organization code' });
    }

    const orgCode = orgCodeData;

    // 3. Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        org_code: orgCode,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError || !org) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create organization' });
    }

    // 4. Create user profile with role = 'lead'
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'lead',
        organization_id: org.id,
      });

    if (profileError) {
      // Rollback: delete auth user and organization
      await supabase.auth.admin.deleteUser(userId);
      await supabase.from('organizations').delete().eq('id', org.id);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // 5. Create default organization profile
    await supabase.from('organization_profiles').insert({
      organization_id: org.id,
      name: organizationName,
    });

    // Return session
    return res.status(201).json({
      message: 'Organization created successfully',
      session: authData.session,
      user: {
        id: userId,
        email,
        fullName,
        role: 'lead',
        organizationId: org.id,
        organizationName,
        orgCode,
      },
    });

  } catch (error) {
    console.error('Registration error (create org):', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register/join-org
 * Register new user and join existing organization
 */
router.post('/register/join-org', async (req, res) => {
  try {
    const { email, password, fullName, orgCode } = registerJoinOrgSchema.parse(req.body);

    // 1. Validate organization code
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('org_code', orgCode.trim().toUpperCase())
      .single();

    if (orgError || !org) {
      return res.status(400).json({ error: 'Invalid organization code' });
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({ error: authError?.message || 'Failed to create user' });
    }

    const userId = authData.user.id;

    // 3. Create user profile with role = 'member'
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'member',
        organization_id: org.id,
      });

    if (profileError) {
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      return res.status(500).json({ error: 'Failed to create user profile' });
    }

    // Return session
    return res.status(201).json({
      message: 'Successfully joined organization',
      session: authData.session,
      user: {
        id: userId,
        email,
        fullName,
        role: 'member',
        organizationId: org.id,
        organizationName: org.name,
      },
    });

  } catch (error) {
    console.error('Registration error (join org):', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login existing user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // 1. Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user || !authData.session) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 2. Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        organization_id,
        organizations (
          name,
          org_code
        )
      `)
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    // 3. Return session and user data
    return res.status(200).json({
      message: 'Login successful',
      session: authData.session,
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        organizationId: profile.organization_id,
        organizationName: profile.organizations.name,
        orgCode: profile.role === 'lead' ? profile.organizations.org_code : undefined,
      },
    });

  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout current user
 */
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.substring(7);

    if (token) {
      await supabase.auth.signOut();
    }

    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Fetch full profile with organization
    const { data: profile, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        role,
        organization_id,
        organizations (
          name,
          org_code
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    return res.status(200).json({
      user: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        role: profile.role,
        organizationId: profile.organization_id,
        organizationName: profile.organizations.name,
        orgCode: profile.role === 'lead' ? profile.organizations.org_code : undefined,
      },
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * PUT /api/auth/refresh
 * Refresh auth token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    return res.status(200).json({
      session: data.session,
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Token refresh failed' });
  }
});

export default router;
```

### 2.4 Protect Existing Routes

Update `backend/src/server.ts`:
```typescript
import authRoutes from './api/routes/auth';
import { authenticate } from './middleware/auth';

// Public routes (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api', (req, res) => {
  res.json({ message: 'DECIVUE API', version: '1.0.0' });
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// All other API routes require authentication
app.use('/api', authenticate); // <-- Add this middleware

// Protected routes
app.use('/api/decisions', decisionsRouter);
app.use('/api/assumptions', assumptionsRouter);
app.use('/api/constraints', constraintsRouter);
// ... rest of routes
```

### 2.5 Update Repositories to Filter by Organization

Example: `backend/src/data/repositories/decision-repository.ts`

Add organization filtering to all queries:
```typescript
export class DecisionRepository {
  async findAll(organizationId: string): Promise<Decision[]> {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('organization_id', organizationId) // <-- Add this
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async findById(id: string, organizationId: string): Promise<Decision | null> {
    const { data, error } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId) // <-- Add this
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(decision: Partial<Decision>, organizationId: string): Promise<Decision> {
    const { data, error } = await supabase
      .from('decisions')
      .insert({ ...decision, organization_id: organizationId }) // <-- Add this
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Apply to all methods: update, delete, etc.
}
```

**Apply same pattern to all repositories:**
- AssumptionRepository
- ConstraintRepository
- NotificationRepository
- etc.

### 2.6 Update Controllers to Use Authenticated User

Example: `backend/src/api/controllers/decision-controller.ts`

```typescript
import { AuthRequest } from '../../middleware/auth';

export async function getDecisions(req: AuthRequest, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const decisions = await decisionRepository.findAll(organizationId);
    res.json(decisions);
  } catch (error) {
    // ...
  }
}

export async function createDecision(req: AuthRequest, res: Response) {
  try {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    const decision = await decisionRepository.create({
      ...req.body,
      created_by: userId, // Track creator
    }, organizationId);

    res.status(201).json(decision);
  } catch (error) {
    // ...
  }
}
```

### 2.7 Add Role-Based Authorization Checks

For edit/delete operations, check permissions:

```typescript
import { requireRole } from '../../middleware/auth';

// Only leads can delete decisions
router.delete('/:id', authenticate, requireRole('lead'), deleteDecision);

// Edit: check if user is lead OR decision creator
export async function updateDecision(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { role, id: userId, organizationId } = req.user!;

    // Fetch decision
    const decision = await decisionRepository.findById(id, organizationId);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    // Authorization check
    if (role !== 'lead' && decision.created_by !== userId) {
      return res.status(403).json({
        error: 'You can only edit decisions you created'
      });
    }

    const updated = await decisionRepository.update(id, req.body, organizationId);
    res.json(updated);
  } catch (error) {
    // ...
  }
}
```

---

## PART 3: FRONTEND IMPLEMENTATION

### 3.1 Authentication State Management

Create `frontend/src/contexts/AuthContext.jsx`:
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem('decivue_session');
    const storedUser = localStorage.getItem('decivue_user');

    if (storedSession && storedUser) {
      try {
        const parsedSession = JSON.parse(storedSession);
        const parsedUser = JSON.parse(storedUser);

        // Verify token is still valid
        api.setAuthToken(parsedSession.access_token);

        api.get('/auth/me')
          .then(response => {
            setUser(response.data.user);
            setSession(parsedSession);
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => {
            setLoading(false);
          });
      } catch (error) {
        console.error('Failed to restore session:', error);
        logout();
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { session, user } = response.data;

      // Store in localStorage
      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      // Set auth token for API calls
      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const registerCreateOrg = async (email, password, fullName, organizationName) => {
    try {
      const response = await api.post('/auth/register/create-org', {
        email,
        password,
        fullName,
        organizationName,
      });

      const { session, user } = response.data;

      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true, orgCode: user.orgCode };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const registerJoinOrg = async (email, password, fullName, orgCode) => {
    try {
      const response = await api.post('/auth/register/join-org', {
        email,
        password,
        fullName,
        orgCode,
      });

      const { session, user } = response.data;

      localStorage.setItem('decivue_session', JSON.stringify(session));
      localStorage.setItem('decivue_user', JSON.stringify(user));

      api.setAuthToken(session.access_token);

      setSession(session);
      setUser(user);

      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Invalid organization code or registration failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('decivue_session');
      localStorage.removeItem('decivue_user');
      api.setAuthToken(null);
      setSession(null);
      setUser(null);
    }
  };

  const value = {
    user,
    session,
    loading,
    login,
    logout,
    registerCreateOrg,
    registerJoinOrg,
    isAuthenticated: !!user,
    isLead: user?.role === 'lead',
    isMember: user?.role === 'member',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 3.2 Update API Service

Update `frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to all requests
api.interceptors.request.use(
  (config) => {
    const session = localStorage.getItem('decivue_session');
    if (session) {
      const { access_token } = JSON.parse(session);
      config.headers.Authorization = `Bearer ${access_token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout
      localStorage.removeItem('decivue_session');
      localStorage.removeItem('decivue_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to set auth token
api.setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export default api;

// Export existing methods unchanged...
```

### 3.3 Login Page

Create `frontend/src/components/LoginPage.jsx`:
```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn } from 'lucide-react';

export default function LoginPage({ onNavigateToRegister }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // Success handled by AuthContext - user will be redirected
  };

  return (
    <div className="min-h-screen bg-[#F2F5FA] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <LogIn className="w-8 h-8 text-[#E53761] mr-2" />
          <h1 className="text-2xl font-bold text-black">DECIVUE Login</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E53761] text-white py-2 rounded font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onNavigateToRegister}
              className="text-[#3788E5] hover:underline font-medium"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Registration Page

Create `frontend/src/components/RegisterPage.jsx`:
```javascript
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Building2 } from 'lucide-react';

export default function RegisterPage({ onNavigateToLogin }) {
  const { registerCreateOrg, registerJoinOrg } = useAuth();
  const [mode, setMode] = useState('create'); // 'create' or 'join'

  // Common fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // Create org fields
  const [organizationName, setOrganizationName] = useState('');

  // Join org fields
  const [orgCode, setOrgCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedOrgCode, setGeneratedOrgCode] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    let result;
    if (mode === 'create') {
      result = await registerCreateOrg(email, password, fullName, organizationName);
      if (result.success) {
        setGeneratedOrgCode(result.orgCode);
        setSuccessMessage(
          `Organization created! Share this code with your team: ${result.orgCode}`
        );
        // User will be auto-logged in and redirected
      }
    } else {
      result = await registerJoinOrg(email, password, fullName, orgCode);
      // User will be auto-logged in and redirected
    }

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F5FA] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <UserPlus className="w-8 h-8 text-[#E53761] mr-2" />
          <h1 className="text-2xl font-bold text-black">Sign Up for DECIVUE</h1>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              mode === 'create'
                ? 'bg-[#3788E5] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Create Organization
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 px-4 rounded font-medium transition ${
              mode === 'join'
                ? 'bg-[#3788E5] text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Join Existing
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-sm">
              {successMessage}
              {generatedOrgCode && (
                <div className="mt-2 p-2 bg-green-100 rounded font-mono text-center text-lg">
                  {generatedOrgCode}
                </div>
              )}
            </div>
          )}

          {/* Common Fields */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="Min 8 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
              placeholder="Repeat password"
            />
          </div>

          {/* Mode-Specific Fields */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5]"
                placeholder="Acme Corp"
              />
              <p className="text-xs text-gray-500 mt-1">
                You'll receive a code to share with your team
              </p>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization Code
              </label>
              <input
                type="text"
                value={orgCode}
                onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#3788E5] font-mono"
                placeholder="ORG-XXXX"
                maxLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Ask your organization lead for the code
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E53761] text-white py-2 rounded font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : mode === 'create' ? 'Create Organization' : 'Join Organization'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onNavigateToLogin}
              className="text-[#3788E5] hover:underline font-medium"
            >
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 3.5 Update App Component

Update `frontend/src/components/App.jsx`:
```javascript
import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import Sidebar from './Sidebar';
// ... other imports

function AppContent() {
  const { user, loading, logout, isLead } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' or 'register'
  const [currentView, setCurrentView] = useState('dashboard');
  // ... rest of state

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F5FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3788E5] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login/register
  if (!user) {
    if (authView === 'login') {
      return <LoginPage onNavigateToRegister={() => setAuthView('register')} />;
    }
    return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
  }

  // Authenticated - show app
  return (
    <div className="flex h-screen bg-[#F2F5FA]">
      <Sidebar
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={logout}
        user={user}
      />

      <div className="flex-1 overflow-auto">
        {/* Render views based on currentView */}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'monitoring' && <DecisionMonitoring isLead={isLead} />}
        {currentView === 'assumptions' && <AssumptionsPage />}
        {currentView === 'notifications' && <NotificationsPage />}
        {currentView === 'profile' && <OrganizationProfile user={user} />}
        {currentView === 'flow' && <DecisionFlow />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
```

### 3.6 Update Sidebar with User Info & Logout

Update `frontend/src/components/Sidebar.jsx` to show user info and logout:
```javascript
// Add props: user, onLogout
export default function Sidebar({ currentView, onNavigate, user, onLogout }) {
  // ... existing code

  return (
    <div className="w-64 bg-white shadow-lg flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-[#E53761]">DECIVUE</h1>
        <p className="text-xs text-gray-500 mt-1">Decision Monitoring</p>
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
        <p className="text-xs text-gray-500">{user.email}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${
            user.role === 'lead'
              ? 'bg-[#3788E5] text-white'
              : 'bg-gray-200 text-gray-700'
          }`}>
            {user.role === 'lead' ? 'Org Lead' : 'Team Member'}
          </span>
          {user.role === 'lead' && user.orgCode && (
            <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-1 rounded">
              {user.orgCode}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* ... existing nav items */}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-[#E53761] rounded transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
```

### 3.7 Role-Based UI in DecisionMonitoring

Update `frontend/src/components/DecisionMonitoring.jsx` to show/hide edit/delete based on role:

```javascript
export default function DecisionMonitoring({ isLead }) {
  // ... existing code

  const canEditDecision = (decision) => {
    // Leads can edit any decision
    if (isLead) return true;

    // Members can only edit their own decisions
    // (Assuming decision.created_by matches user.id - need to pass user)
    return decision.created_by === userId;
  };

  return (
    // ... in the expanded decision view
    <div className="flex gap-2">
      {canEditDecision(expandedDecision) && (
        <button
          onClick={() => handleEdit(expandedDecision)}
          className="px-4 py-2 bg-[#3788E5] text-white rounded hover:bg-opacity-90"
        >
          Edit Decision
        </button>
      )}

      {isLead && (
        <button
          onClick={() => handleDelete(expandedDecision.id)}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-opacity-90"
        >
          Delete Decision
        </button>
      )}
    </div>
  );
}
```

---

## PART 4: MIGRATION & ROLLOUT

### 4.1 Database Migration Script

Create `backend/migrations/006_add_authentication.sql`:
```sql
-- This is the comprehensive migration combining all auth changes

-- 1. Create organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  org_code TEXT UNIQUE NOT NULL,
  created_by UUID, -- Will reference auth.users after it's populated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_organizations_org_code ON organizations(org_code);

-- 2. Create org code generation function
CREATE OR REPLACE FUNCTION generate_org_code() RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_already BOOLEAN;
BEGIN
  LOOP
    code := 'ORG-' || UPPER(SUBSTRING(MD5(random()::text) FROM 1 FOR 4));
    SELECT EXISTS(SELECT 1 FROM organizations WHERE org_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 3. Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lead', 'member')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- 4. Add organization_id to existing tables
ALTER TABLE decisions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE assumptions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE constraints ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE decision_tensions ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE evaluation_history ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE decision_signals ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE parameter_templates ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 5. Rename organization_profile to organization_profiles and add organization_id
ALTER TABLE organization_profile RENAME TO organization_profiles;
ALTER TABLE organization_profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- 6. Create default organization for existing data (if any)
-- This step is for development/migration only
INSERT INTO organizations (id, name, org_code, created_at)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'Default Organization',
  'ORG-DEMO',
  NOW()
);

-- 7. Backfill organization_id for existing data
UPDATE decisions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE assumptions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE constraints SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE decision_tensions SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE evaluation_history SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE decision_signals SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE notifications SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE parameter_templates SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;
UPDATE organization_profiles SET organization_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid WHERE organization_id IS NULL;

-- 8. Make organization_id NOT NULL
ALTER TABLE decisions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE assumptions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE constraints ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE decision_tensions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE evaluation_history ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE decision_signals ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE parameter_templates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE organization_profiles ALTER COLUMN organization_id SET NOT NULL;

-- 9. Create indexes
CREATE INDEX idx_decisions_organization ON decisions(organization_id);
CREATE INDEX idx_assumptions_organization ON assumptions(organization_id);
CREATE INDEX idx_constraints_organization ON constraints(organization_id);
CREATE INDEX idx_decision_tensions_organization ON decision_tensions(organization_id);
CREATE INDEX idx_evaluation_history_organization ON evaluation_history(organization_id);
CREATE INDEX idx_decision_signals_organization ON decision_signals(organization_id);
CREATE INDEX idx_notifications_organization ON notifications(organization_id);
CREATE INDEX idx_parameter_templates_organization ON parameter_templates(organization_id);

-- 10. Make organization_profiles.organization_id the primary key
ALTER TABLE organization_profiles DROP CONSTRAINT IF EXISTS organization_profile_pkey;
ALTER TABLE organization_profiles ADD PRIMARY KEY (organization_id);

-- 11. Add created_by field to decisions (for tracking creator)
ALTER TABLE decisions ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 12. Helper function: get current user's organization
CREATE OR REPLACE FUNCTION auth.user_organization_id() RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- 13. Helper function: check if user can edit decision
CREATE OR REPLACE FUNCTION auth.can_edit_decision(decision_id UUID) RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  decision_creator UUID;
BEGIN
  SELECT role INTO user_role FROM users WHERE id = auth.uid();
  IF user_role = 'lead' THEN
    RETURN TRUE;
  END IF;
  SELECT created_by INTO decision_creator FROM decisions WHERE id = decision_id;
  RETURN decision_creator = auth.uid();
END;
$$ LANGUAGE plpgsql STABLE;

-- 14. RLS Policies

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON organizations;

CREATE POLICY "Users can view their organization"
ON organizations FOR SELECT
USING (id = auth.user_organization_id());

CREATE POLICY "Only leads can update organization"
ON organizations FOR UPDATE
USING (
  id = auth.user_organization_id()
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'lead'
);

-- Users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organization members"
ON users FOR SELECT
USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = auth.uid());

-- Decisions
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations" ON decisions;

CREATE POLICY "Users can view their org decisions"
ON decisions FOR SELECT
USING (organization_id = auth.user_organization_id());

CREATE POLICY "Users can insert decisions in their org"
ON decisions FOR INSERT
WITH CHECK (organization_id = auth.user_organization_id());

CREATE POLICY "Decision edit permissions"
ON decisions FOR UPDATE
USING (auth.can_edit_decision(id));

CREATE POLICY "Only leads can delete decisions"
ON decisions FOR DELETE
USING (
  organization_id = auth.user_organization_id()
  AND (SELECT role FROM users WHERE id = auth.uid()) = 'lead'
);

-- Apply same pattern to other tables (assumptions, constraints, etc.)
-- (Full RLS policies for brevity - apply organization_id check to all)

-- Assumptions
ALTER TABLE assumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON assumptions;
CREATE POLICY "Org scoped assumptions" ON assumptions FOR ALL
USING (organization_id = auth.user_organization_id());

-- Constraints
ALTER TABLE constraints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON constraints;
CREATE POLICY "Org scoped constraints" ON constraints FOR ALL
USING (organization_id = auth.user_organization_id());

-- Decision tensions
ALTER TABLE decision_tensions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON decision_tensions;
CREATE POLICY "Org scoped tensions" ON decision_tensions FOR ALL
USING (organization_id = auth.user_organization_id());

-- Evaluation history
ALTER TABLE evaluation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON evaluation_history;
CREATE POLICY "Org scoped history" ON evaluation_history FOR ALL
USING (organization_id = auth.user_organization_id());

-- Decision signals
ALTER TABLE decision_signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON decision_signals;
CREATE POLICY "Org scoped signals" ON decision_signals FOR ALL
USING (organization_id = auth.user_organization_id());

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON notifications;
CREATE POLICY "Org scoped notifications" ON notifications FOR ALL
USING (organization_id = auth.user_organization_id());

-- Parameter templates
ALTER TABLE parameter_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON parameter_templates;
CREATE POLICY "Org scoped templates" ON parameter_templates FOR ALL
USING (organization_id = auth.user_organization_id());

-- Organization profiles
ALTER TABLE organization_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON organization_profiles;
CREATE POLICY "Org scoped profiles" ON organization_profiles FOR ALL
USING (organization_id = auth.user_organization_id());

-- Decision assumptions (junction table)
ALTER TABLE decision_assumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON decision_assumptions;
CREATE POLICY "Org scoped decision_assumptions" ON decision_assumptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM decisions
    WHERE decisions.id = decision_assumptions.decision_id
    AND decisions.organization_id = auth.user_organization_id()
  )
);

-- Decision constraints (junction table)
ALTER TABLE decision_constraints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON decision_constraints;
CREATE POLICY "Org scoped decision_constraints" ON decision_constraints FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM decisions
    WHERE decisions.id = decision_constraints.decision_id
    AND decisions.organization_id = auth.user_organization_id()
  )
);

-- Dependencies
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON dependencies;
CREATE POLICY "Org scoped dependencies" ON dependencies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM decisions
    WHERE decisions.id = dependencies.source_decision_id
    AND decisions.organization_id = auth.user_organization_id()
  )
);

-- Assumption conflicts
ALTER TABLE assumption_conflicts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON assumption_conflicts;
CREATE POLICY "Org scoped assumption_conflicts" ON assumption_conflicts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assumptions
    WHERE assumptions.id = assumption_conflicts.assumption_a_id
    AND assumptions.organization_id = auth.user_organization_id()
  )
);

-- Constraint violations
ALTER TABLE constraint_violations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations" ON constraint_violations;
CREATE POLICY "Org scoped constraint_violations" ON constraint_violations FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM decisions
    WHERE decisions.id = constraint_violations.decision_id
    AND decisions.organization_id = auth.user_organization_id()
  )
);

-- 15. Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT SELECT ON auth.users TO authenticated;
```

### 4.2 Running the Migration

1. Connect to Supabase dashboard → SQL Editor
2. Paste and run `006_add_authentication.sql`
3. Verify all tables and policies created
4. Test with sample user registration

### 4.3 Testing Checklist

**Backend Tests:**
- [ ] User can register (create org flow)
- [ ] User can register (join org flow)
- [ ] User can login
- [ ] User can logout
- [ ] Invalid org code rejected
- [ ] Duplicate email rejected
- [ ] Token authentication works
- [ ] Token refresh works
- [ ] RLS policies enforce organization isolation
- [ ] Lead can edit any decision
- [ ] Member can only edit own decisions
- [ ] Lead can delete decisions
- [ ] Member cannot delete decisions

**Frontend Tests:**
- [ ] Login page loads
- [ ] Registration page loads
- [ ] Mode toggle works (create vs join)
- [ ] Registration creates org and shows code
- [ ] Registration joins existing org
- [ ] Login redirects to dashboard
- [ ] Sidebar shows user info
- [ ] Sidebar shows org code for leads
- [ ] Logout works
- [ ] Edit/delete buttons show/hide based on role
- [ ] Session persists across page refresh
- [ ] 401 errors redirect to login

---

## PART 5: FILE CHANGES SUMMARY

### New Files to Create

**Backend:**
- `backend/src/middleware/auth.ts` - Authentication middleware
- `backend/src/api/routes/auth.ts` - Auth endpoints (register/login/logout)
- `backend/migrations/006_add_authentication.sql` - Database migration

**Frontend:**
- `frontend/src/contexts/AuthContext.jsx` - Auth state management
- `frontend/src/components/LoginPage.jsx` - Login UI
- `frontend/src/components/RegisterPage.jsx` - Registration UI (dual-mode)

### Files to Modify

**Backend:**
- `backend/.env.example` - Add SUPABASE_SERVICE_ROLE_KEY
- `backend/src/server.ts` - Add auth routes, apply middleware
- `backend/src/data/repositories/decision-repository.ts` - Add organization filtering
- All repository files - Add organization_id parameter to methods
- All controller files - Extract organizationId from req.user
- All route files - Apply authenticate middleware

**Frontend:**
- `frontend/src/components/App.jsx` - Wrap with AuthProvider, add auth routing
- `frontend/src/components/Sidebar.jsx` - Add user info, logout button
- `frontend/src/components/DecisionMonitoring.jsx` - Add role-based edit/delete visibility
- `frontend/src/services/api.js` - Add token interceptors
- `frontend/src/main.jsx` - Wrap root with AuthProvider (if needed)

---

## ESTIMATED IMPLEMENTATION COMPLEXITY

### Database: MEDIUM
- 2 new tables (organizations, users)
- 8+ table alterations (add organization_id)
- 15+ RLS policies
- 2 helper functions

### Backend: HIGH
- New auth middleware
- New auth routes (5+ endpoints)
- Update all repositories (10+ files)
- Update all controllers (10+ files)
- Update all routes with middleware

### Frontend: MEDIUM-HIGH
- New auth context
- 2 new pages (login/register)
- Update App routing logic
- Update API service
- Role-based UI changes across components

**Total Estimated Time:** 2-3 full development days

---

## NEXT STEPS

1. Review this plan and propose modifications
2. Confirm database schema design
3. Approve RLS policies
4. Approve registration flow UX
5. Begin implementation phase
