import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { DatabaseError } from './errors';

let supabaseAdminClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    config.supabaseUrl &&
    !config.supabaseUrl.includes('placeholder') &&
    !config.supabaseUrl.includes('your-project') &&
    (config.supabaseServiceRoleKey || config.supabaseAnonKey)
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!supabaseAdminClient) {
    const key = config.supabaseServiceRoleKey || config.supabaseAnonKey;
    supabaseAdminClient = createClient(config.supabaseUrl, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }

  return supabaseAdminClient;
}

export function getRequiredSupabase(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new DatabaseError('Supabase database is not configured or unavailable.', 503, 'DATABASE_UNAVAILABLE');
  }
  return client;
}
