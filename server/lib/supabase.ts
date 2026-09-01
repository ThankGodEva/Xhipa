import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { DatabaseError } from './errors';

let supabaseAdminClient: SupabaseClient | null = null;

export function setSupabaseAdminClient(client: SupabaseClient | null): void {
  supabaseAdminClient = client;
}

export function isSupabaseConfigured(): boolean {
  if (supabaseAdminClient) {
    return true;
  }
  const url = (config.supabaseUrl || '').trim();
  const key = (config.supabaseServiceRoleKey || config.supabaseAnonKey || '').trim();
  return Boolean(
    url &&
    !url.includes('placeholder') &&
    !url.includes('your-project') &&
    key &&
    !key.includes('placeholder')
  );
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminClient) {
    return supabaseAdminClient;
  }

  const url = (config.supabaseUrl || '').trim();
  const key = (config.supabaseServiceRoleKey || config.supabaseAnonKey || '').trim();

  if (url && key && !url.includes('placeholder') && !url.includes('your-project')) {
    try {
      supabaseAdminClient = createClient(url, key, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      return supabaseAdminClient;
    } catch (err) {
      console.error('[Supabase Init Error]:', err);
      return null;
    }
  }

  return null;
}

export function getRequiredSupabase(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new DatabaseError('Supabase database is not configured or unavailable.', 503, 'DATABASE_UNAVAILABLE');
  }
  return client;
}

