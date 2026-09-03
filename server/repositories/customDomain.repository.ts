import { getRequiredSupabase, getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { CustomDomain } from '../../src/types';

export class CustomDomainRepository {
  /**
   * Create a new custom domain record
   */
  async createCustomDomain(data: {
    business_id: string;
    hostname: string;
    normalized_hostname: string;
    status?: string;
    verification_status?: string;
    ssl_status?: string;
    cloudflare_hostname_id?: string;
    cloudflare_status?: string;
    cloudflare_ssl_status?: string;
    validation_records?: any;
    is_primary?: boolean;
    last_error?: string;
  }): Promise<CustomDomain> {
    const supabase = getRequiredSupabase();

    try {
      const { data: result, error } = await supabase
        .from('custom_domains')
        .insert({
          business_id: data.business_id,
          hostname: data.hostname,
          normalized_hostname: data.normalized_hostname,
          status: data.status || 'pending',
          verification_status: data.verification_status || 'pending',
          ssl_status: data.ssl_status || 'pending',
          cloudflare_hostname_id: data.cloudflare_hostname_id || null,
          cloudflare_status: data.cloudflare_status || null,
          cloudflare_ssl_status: data.cloudflare_ssl_status || null,
          validation_records: data.validation_records || [],
          is_primary: Boolean(data.is_primary),
          last_error: data.last_error || null
        })
        .select('*')
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('This domain name has already been registered on the platform.');
        }
        throw error;
      }

      return result as CustomDomain;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Fetch custom domain by ID
   */
  async getDomainById(id: string): Promise<CustomDomain | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return (data as CustomDomain) || null;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Fetch custom domain by normalized hostname
   */
  async getDomainByNormalizedHostname(normalizedHostname: string): Promise<CustomDomain | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = getSupabaseAdmin() || getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('normalized_hostname', normalizedHostname.toLowerCase().trim())
        .maybeSingle();

      if (error) throw error;
      return (data as CustomDomain) || null;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Fetch all custom domains belonging to a specific business
   */
  async getDomainsByBusinessId(businessId: string): Promise<CustomDomain[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as CustomDomain[]) || [];
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Count total domains registered by a business
   */
  async countDomainsByBusinessId(businessId: string): Promise<number> {
    const supabase = getRequiredSupabase();

    try {
      const { count, error } = await supabase
        .from('custom_domains')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Fetch primary domain for a business
   */
  async getPrimaryDomainForBusiness(businessId: string): Promise<CustomDomain | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('custom_domains')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_primary', true)
        .maybeSingle();

      if (error) throw error;
      return (data as CustomDomain) || null;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update a custom domain record
   */
  async updateDomain(id: string, updates: Partial<CustomDomain>): Promise<CustomDomain> {
    const supabase = getRequiredSupabase();

    try {
      const payload: Record<string, any> = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('custom_domains')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      return data as CustomDomain;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Set a domain as the primary domain for a business
   */
  async setPrimaryDomain(businessId: string, domainId: string): Promise<CustomDomain> {
    const supabase = getRequiredSupabase();

    try {
      // 1. Demote all existing domains for this business to is_primary = false
      await supabase
        .from('custom_domains')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('business_id', businessId);

      // 2. Set target domain to is_primary = true
      const { data, error } = await supabase
        .from('custom_domains')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', domainId)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) throw error;
      return data as CustomDomain;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Delete a custom domain record
   */
  async deleteDomain(id: string): Promise<void> {
    const supabase = getRequiredSupabase();

    try {
      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const customDomainRepository = new CustomDomainRepository();
