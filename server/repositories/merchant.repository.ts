import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Business, BusinessMember, Store, StoreSettings } from '../../src/types';
import { getBusinessMetadata, setBusinessMetadata } from '../lib/metadataStore';

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

export class MerchantRepository {
  /**
   * Get business membership for a user
   */
  async getMembershipByUserId(userId: string): Promise<BusinessMember | null> {
    if (!userId || !isUUID(userId)) {
      return null;
    }

    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('business_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        business_id: data.business_id,
        user_id: data.user_id,
        role: data.role,
        created_at: data.created_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Resolves business membership and entity for a given user ID
   */
  async getBusinessByUserId(userId: string): Promise<{
    business: Business | null;
    store: Store | null;
    settings: StoreSettings | null;
    membership: BusinessMember | null;
  }> {
    const membership = await this.getMembershipByUserId(userId);
    if (!membership) {
      return { business: null, store: null, settings: null, membership: null };
    }

    const [business, store, settings] = await Promise.all([
      this.getBusinessById(membership.business_id),
      this.getStoreByBusinessId(membership.business_id),
      this.getStoreSettings(membership.business_id)
    ]);

    return { business, store, settings, membership };
  }

  /**
   * Create a complete business setup for a user
   */
  async createBusinessForUser(params: {
    id: string;
    email: string;
    fullName?: string;
  }): Promise<{
    business: Business;
    store: Store;
    settings: StoreSettings;
    membership: BusinessMember;
  }> {
    const baseSlug = (params.fullName || params.email.split('@')[0] || 'merchant')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'store';
    const slug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    const businessName = params.fullName ? `${params.fullName}'s Store` : 'My Store';

    const result = await this.onboardMerchant({
      userId: params.id,
      fullName: params.fullName || 'Store Owner',
      email: params.email,
      businessName,
      slug,
      phone: '08000000000',
      mode: 'catalogue'
    });

    return {
      business: result.business,
      store: result.store,
      settings: result.settings,
      membership: result.member
    };
  }

  /**
   * Find business by ID
   */
  async getBusinessById(businessId: string): Promise<Business | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', businessId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const biz = data as Business;
      const meta = getBusinessMetadata(businessId);
      if (!biz.banner_url && meta.banner_url) {
        biz.banner_url = meta.banner_url;
      }
      return biz;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find business by slug
   */
  async getBusinessBySlug(slug: string): Promise<Business | null> {
    const cleanSlug = slug.toLowerCase().trim();
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const biz = data as Business;
      const meta = getBusinessMetadata(biz.id);
      if (!biz.banner_url && meta.banner_url) {
        biz.banner_url = meta.banner_url;
      }
      return biz;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find store by business ID
   */
  async getStoreByBusinessId(businessId: string): Promise<Store | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      return (data as Store) || null;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find store settings by business ID
   */
  async getStoreSettings(businessId: string): Promise<StoreSettings | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      const sett = data as StoreSettings;
      const meta = getBusinessMetadata(businessId);
      if (!sett.banner_url && meta.banner_url) {
        sett.banner_url = meta.banner_url;
      }
      return sett;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update business details
   */
  async updateBusiness(businessId: string, updates: Partial<Business>): Promise<Business> {
    const now = new Date().toISOString();
    const cleanUpdates: any = { ...updates, updated_at: now };
    const supabase = getRequiredSupabase();

    if (updates.banner_url !== undefined) {
      setBusinessMetadata(businessId, { banner_url: updates.banner_url });
    }

    try {
      let data: any = null;
      let error: any = null;

      // First attempt with full updates
      const res = await supabase
        .from('businesses')
        .update(cleanUpdates)
        .eq('id', businessId)
        .select('*')
        .single();
      
      data = res.data;
      error = res.error;

      // If banner_url column does not exist in DB table yet, retry without banner_url in SQL
      if (error && (error.code === '42703' || String(error.message).includes('banner_url'))) {
        const fallbackUpdates = { ...cleanUpdates };
        delete fallbackUpdates.banner_url;
        const fallbackRes = await supabase
          .from('businesses')
          .update(fallbackUpdates)
          .eq('id', businessId)
          .select('*')
          .single();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;

      const result = data as Business;
      const meta = getBusinessMetadata(businessId);
      if (meta.banner_url) {
        result.banner_url = meta.banner_url;
      }
      return result;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update store settings
   */
  async updateStoreSettings(businessId: string, updates: Partial<StoreSettings>): Promise<StoreSettings> {
    const now = new Date().toISOString();
    const cleanUpdates: any = { ...updates, updated_at: now };
    const supabase = getRequiredSupabase();

    if (updates.banner_url !== undefined) {
      setBusinessMetadata(businessId, { banner_url: updates.banner_url });
    }

    try {
      let data: any = null;
      let error: any = null;

      const res = await supabase
        .from('store_settings')
        .update(cleanUpdates)
        .eq('business_id', businessId)
        .select('*')
        .single();
      
      data = res.data;
      error = res.error;

      // If banner_url column does not exist in store_settings yet, retry without it
      if (error && (error.code === '42703' || String(error.message).includes('banner_url'))) {
        const fallbackUpdates = { ...cleanUpdates };
        delete fallbackUpdates.banner_url;
        const fallbackRes = await supabase
          .from('store_settings')
          .update(fallbackUpdates)
          .eq('business_id', businessId)
          .select('*')
          .single();
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;

      const result = data as StoreSettings;
      const meta = getBusinessMetadata(businessId);
      if (meta.banner_url) {
        result.banner_url = meta.banner_url;
      }
      return result;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update store details by business ID
   */
  async updateStore(businessId: string, updates: Partial<Store>): Promise<Store> {
    const now = new Date().toISOString();
    const cleanUpdates = { ...updates, updated_at: now };
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('stores')
        .update(cleanUpdates)
        .eq('business_id', businessId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Store;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update store publish status
   */
  async updateStoreStatus(storeId: string, status: 'published' | 'draft'): Promise<Store> {
    const now = new Date().toISOString();
    const updates = {
      status,
      published_at: status === 'published' ? now : null,
      updated_at: now
    };
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId)
        .select('*')
        .single();

      if (error) throw error;
      return data as Store;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Onboard merchant: creates business, member, store, store_settings and initial free subscription in Supabase
   */
  async onboardMerchant(params: {
    userId: string;
    fullName: string;
    email: string;
    businessName: string;
    slug: string;
    phone: string;
    whatsapp?: string;
    mode: 'catalogue' | 'checkout';
    state?: string;
    city?: string;
    address?: string;
    description?: string;
  }): Promise<{
    business: Business;
    store: Store;
    settings: StoreSettings;
    member: BusinessMember;
  }> {
    const now = new Date().toISOString();
    const cleanSlug = params.slug.toLowerCase().trim();
    const supabase = getRequiredSupabase();

    try {
      // Ensure profile exists in public.profiles (if userId is a valid UUID)
      if (isUUID(params.userId)) {
        await supabase.from('profiles').upsert({
          id: params.userId,
          full_name: params.fullName,
          updated_at: now
        });
      }

      // 1. Create Business
      const { data: newBiz, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          name: params.businessName,
          slug: cleanSlug,
          phone: params.phone,
          whatsapp_number: params.whatsapp || params.phone,
          email: params.email,
          description: params.description || 'Welcome to our official store.',
          state: params.state || null,
          city: params.city || null,
          address: params.address || null,
          country: 'NG',
          currency: 'NGN',
          status: 'active',
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (bizErr || !newBiz) {
        throw new Error(bizErr?.message || 'Failed to create business in database');
      }

      const business = newBiz as Business;

      // 2. Create Business Member (Owner)
      const { data: newMember, error: memErr } = await supabase
        .from('business_members')
        .insert({
          business_id: business.id,
          user_id: params.userId,
          role: 'owner',
          created_at: now
        })
        .select('*')
        .single();

      if (memErr) throw memErr;

      // 3. Create Store
      const { data: newStore, error: storeErr } = await supabase
        .from('stores')
        .insert({
          business_id: business.id,
          slug: cleanSlug,
          status: 'published',
          published_at: now,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (storeErr) throw storeErr;

      // 4. Create Store Settings
      const { data: newSettings, error: setErr } = await supabase
        .from('store_settings')
        .insert({
          business_id: business.id,
          theme: 'emerald',
          primary_color: '#10B981',
          show_logo: true,
          show_phone: true,
          show_whatsapp: true,
          show_social_links: true,
          enable_catalogue: true,
          enable_checkout: params.mode === 'checkout',
          delivery_fee_type: 'flat',
          flat_delivery_fee: 150000,
          delivery_information: 'Standard delivery within 24-48 hours.',
          return_policy: 'Exchange available within 48 hours for undamaged items.',
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (setErr) throw setErr;

      // 5. Default Free Subscription
      await supabase
        .from('subscriptions')
        .insert({
          business_id: business.id,
          plan_id: 'free',
          status: 'active',
          current_period_start: now,
          current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          created_at: now,
          updated_at: now
        });

      return {
        business,
        store: newStore as Store,
        settings: newSettings as StoreSettings,
        member: newMember as BusinessMember
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const merchantRepository = new MerchantRepository();
