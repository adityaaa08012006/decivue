/**
 * Supabase Database Client
 * Centralizes database connection using Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@utils/logger';

let supabase: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

/**
 * Initialize the Supabase client
 */
export function initializeDatabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
  }

  // Regular client (uses anon key) with increased timeout
  supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      fetch: (url, options = {}) => {
        return fetch(url, {
          ...options,
          // Increase timeout from default 10s to 30s
          signal: AbortSignal.timeout(30000)
        });
      }
    }
  });
  logger.info('Supabase client initialized');

  // Admin client (uses service role key for admin operations)
  if (supabaseServiceKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000)
          });
        }
      }
    });
    logger.info('Supabase admin client initialized');
  } else {
    logger.warn('SUPABASE_SERVICE_ROLE_KEY not set - admin operations will be unavailable');
  }

  return supabase;
}

/**
 * Get the Supabase client instance
 * Throws if not initialized
 */
export function getDatabase(): SupabaseClient {
  if (!supabase) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return supabase;
}

/**
 * Get an authenticated Supabase client for a specific user
 * This client will have the user's JWT token, allowing RLS policies to work
 */
export function getAuthenticatedDatabase(accessToken: string): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  // Create a client with the user's access token
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}

/**
 * Get the Supabase admin client instance (for admin operations)
 * Throws if not initialized
 */
export function getAdminDatabase(): SupabaseClient {
  if (!supabaseAdmin) {
    throw new Error('Admin database not initialized. Check SUPABASE_SERVICE_ROLE_KEY is set.');
  }
  return supabaseAdmin;
}

// Export default client
export { supabase };
