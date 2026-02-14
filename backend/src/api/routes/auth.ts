import { Router } from 'express';
import { supabase } from '../../data/database';
import { getAdminDatabase } from '../../data/database';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const registerCreateOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  organizationName: z.string().min(1, 'Organization name is required'),
});

const registerJoinOrgSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name is required'),
  orgCode: z.string().min(1, 'Organization code is required'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/register/create-org
 * Register new user and create organization
 */
router.post('/register/create-org', async (req, res) => {
  try {
    console.log('📝 Registration request received:', { email: req.body.email, organizationName: req.body.organizationName });
    const { email, password, fullName, organizationName } = registerCreateOrgSchema.parse(req.body);

    // 1. Create auth user via Supabase Auth
    console.log('🔐 Step 1: Creating Supabase auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error('❌ Step 1 FAILED: Auth signup error:', authError);
      return res.status(400).json({
        error: authError?.message || 'Failed to create user',
        code: 'AUTH_SIGNUP_FAILED'
      });
    }

    console.log('✅ Step 1 SUCCESS: User created with ID:', authData.user.id);
    const userId = authData.user.id;

    // Use admin client for all database operations during registration
    const adminDb = getAdminDatabase();

    // 2. Generate unique org code using RPC function
    console.log('🎲 Step 2: Generating organization code...');
    const { data: orgCode, error: orgCodeError } = await adminDb
      .rpc('generate_org_code');

    if (orgCodeError || !orgCode) {
      console.error('❌ Step 2 FAILED: Org code generation error:', orgCodeError);
      // Rollback: delete auth user
      await adminDb.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error: 'Failed to generate organization code',
        code: 'ORGCODE_GEN_FAILED',
        details: orgCodeError?.message
      });
    }

    console.log('✅ Step 2 SUCCESS: Generated code:', orgCode);

    // 3. Create organization using admin client (bypasses RLS)
    console.log('🏢 Step 3: Creating organization...');
    const { data: org, error: orgError } = await adminDb
      .from('organizations')
      .insert({
        name: organizationName,
        org_code: orgCode,
        created_by: userId,
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error('❌ Step 3 FAILED: Organization creation error:', orgError);
      // Rollback: delete auth user
      await adminDb.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error: 'Failed to create organization',
        code: 'ORG_CREATE_FAILED',
        details: orgError?.message
      });
    }

    console.log('✅ Step 3 SUCCESS: Organization created with ID:', org.id);

    // 4. Create user profile with role = 'lead' using admin client
    console.log('👤 Step 4: Creating user profile...');
    const { error: profileError } = await adminDb
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: fullName,
        role: 'lead',
        organization_id: org.id,
      });

    if (profileError) {
      console.error('❌ Step 4 FAILED: Profile creation error:', profileError);
      // Rollback: delete auth user and organization
      await adminDb.auth.admin.deleteUser(userId);
      await adminDb.from('organizations').delete().eq('id', org.id);
      return res.status(500).json({
        error: 'Failed to create user profile',
        code: 'PROFILE_CREATE_FAILED',
        details: profileError.message
      });
    }

    console.log('✅ Step 4 SUCCESS: User profile created');

    // 5. Create default organization profile using admin client
    console.log('📊 Step 5: Creating organization profile...');
    await adminDb.from('organization_profiles').insert({
      organization_id: org.id,
      name: organizationName,
    });

    console.log('✅ Step 5 SUCCESS: Organization profile created');

    // 6. Seed default parameter templates for the organization
    console.log('📋 Step 6: Seeding default parameter templates...');
    const { error: templateError } = await adminDb.rpc('seed_default_parameter_templates', {
      p_organization_id: org.id
    });

    if (templateError) {
      console.error('⚠️ Step 6 WARNING: Template seeding failed (non-fatal):', templateError);
      // Continue anyway - templates can be added later
    } else {
      console.log('✅ Step 6 SUCCESS: Default templates seeded');
    }

    console.log('🎉 REGISTRATION COMPLETE!');

    // 7. Sign in the user to get a valid session
    console.log('🔑 Step 7: Signing in user to get session...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      console.error('❌ Step 7 FAILED: Sign-in error:', signInError);
      // User and org were created, but couldn't get session
      // Return error but don't rollback (user can just login)
      return res.status(500).json({
        error: 'Account created but failed to sign in. Please try logging in.',
        code: 'SIGNIN_AFTER_SIGNUP_FAILED',
        details: signInError?.message
      });
    }

    console.log('✅ Step 7 SUCCESS: User signed in with session');

    // Return session
    return res.status(201).json({
      message: 'Organization created successfully',
      session: signInData.session,
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
    console.error('💥 UNEXPECTED ERROR in registration:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      details: error.message
    });
  }
});

/**
 * POST /api/auth/register/join-org
 * Register new user and join existing organization
 */
router.post('/register/join-org', async (req, res) => {
  try {
    const { email, password, fullName, orgCode } = registerJoinOrgSchema.parse(req.body);

    // Use admin client for database operations
    const adminDb = getAdminDatabase();

    // 1. Validate organization code using admin client
    const { data: org, error: orgError } = await adminDb
      .from('organizations')
      .select('id, name')
      .eq('org_code', orgCode.trim().toUpperCase())
      .single();

    if (orgError || !org) {
      return res.status(400).json({
        error: 'Invalid organization code',
        code: 'INVALID_ORG_CODE'
      });
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError || !authData.user) {
      return res.status(400).json({
        error: authError?.message || 'Failed to create user',
        code: 'AUTH_SIGNUP_FAILED'
      });
    }

    const userId = authData.user.id;

    // 3. Create user profile with role = 'member' using admin client
    const { error: profileError } = await adminDb
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
      await adminDb.auth.admin.deleteUser(userId);
      return res.status(500).json({
        error: 'Failed to create user profile',
        code: 'PROFILE_CREATE_FAILED',
        details: profileError.message
      });
    }

    // 4. Sign in the user to get a valid session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError || !signInData.session) {
      // User was created, but couldn't get session
      // Return error but don't rollback (user can just login)
      return res.status(500).json({
        error: 'Account created but failed to sign in. Please try logging in.',
        code: 'SIGNIN_AFTER_SIGNUP_FAILED',
        details: signInError?.message
      });
    }

    // Return session
    return res.status(201).json({
      message: 'Successfully joined organization',
      session: signInData.session,
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
      return res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
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
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS'
      });
    }

    // 2. Fetch user profile with organization
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
      return res.status(500).json({
        error: 'Failed to fetch user profile',
        code: 'PROFILE_FETCH_FAILED'
      });
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
      return res.status(400).json({
        error: 'Invalid input',
        code: 'VALIDATION_ERROR',
        details: error.errors
      });
    }
    return res.status(500).json({
      error: 'Internal server error',
      code: 'SERVER_ERROR'
    });
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

    return res.status(200).json({
      message: 'Logged out successfully',
      code: 'LOGOUT_SUCCESS'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      error: 'Logout failed',
      code: 'LOGOUT_FAILED'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'AUTH_REQUIRED'
      });
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
      return res.status(404).json({
        error: 'Profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
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
    return res.status(500).json({
      error: 'Failed to fetch user',
      code: 'USER_FETCH_FAILED'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh auth token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Refresh token required',
        code: 'REFRESH_TOKEN_REQUIRED'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error || !data.session) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    return res.status(200).json({
      session: data.session,
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      error: 'Token refresh failed',
      code: 'REFRESH_FAILED'
    });
  }
});

export default router;
