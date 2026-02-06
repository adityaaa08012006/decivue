/**
 * Supabase Database Client
 * Centralizes database connection using Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@utils/logger';

let supabase: SupabaseClient | null = null;

/**
 * Initialize the Supabase client
 */
export function initializeDatabase(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  logger.info('Supabase client initialized');

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
