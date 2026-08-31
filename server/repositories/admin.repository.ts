import { getRequiredSupabase, getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Business, PlatformSettings, SubscriptionPlan } from '../../src/types';
import { DEFAULT_SUBSCRIPTION_PLANS } from './subscription.repository';

export interface AdminPlatformMetrics {
  totalBusinesses: number;
  activeStores: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  planBreakdown: Record<string, number>;
}

export interface AdminBusinessDetail extends Business {
  storeSlug?: string;
  storeStatus?: string;
  plan: string;
  planId: string;
  ownerName: string;
  ownerEmail: string;
  productsCount: number;
  ordersCount: number;
}

export class AdminRepository {
  /**
   * Platform-wide aggregated metrics
   */
  async getPlatformMetrics(): Promise<AdminPlatformMetrics> {
    const supabase = getRequiredSupabase();

    try {
      const [
        { count: totalBusinesses, error: bizErr },
        { count: activeStores, error: actErr },
        { count: totalOrders, error: ordErr },
        { count: totalProducts, error: prodErr },
        { data: paidOrders, error: revErr },
        { data: subscriptions, error: subErr }
      ] = await Promise.all([
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('*', { count: 'exact', head: true }).neq('status', 'archived'),
        supabase.from('orders').select('total').eq('payment_status', 'paid'),
        supabase.from('subscriptions').select('plan_id')
      ]);

      if (bizErr) throw bizErr;
      if (actErr) throw actErr;
      if (ordErr) throw ordErr;
      if (prodErr) throw prodErr;
      if (revErr) throw revErr;
      if (subErr) throw subErr;

      const totalRevenue = (paidOrders || []).reduce((sum, o) => sum + Number(o.total || 0), 0);

      const planBreakdown: Record<string, number> = {
        free: 0,
        beginner: 0,
        whatsapp_starter: 0,
        growth: 0,
        pro: 0
      };

      for (const sub of subscriptions || []) {
        const pId = sub.plan_id || 'free';
        planBreakdown[pId] = (planBreakdown[pId] || 0) + 1;
      }

      return {
        totalBusinesses: totalBusinesses || 0,
        activeStores: activeStores || 0,
        totalOrders: totalOrders || 0,
        totalProducts: totalProducts || 0,
        totalRevenue,
        planBreakdown
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * List all businesses with enriched plan, owner, and metrics details
   */
  async getAllBusinesses(): Promise<AdminBusinessDetail[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: businesses, error: bizErr } = await supabase
        .from('businesses')
        .select(`
          *,
          stores(*),
          subscriptions(*, subscription_plans(*)),
          business_members(*, profiles(*)),
          products(id, status),
          orders(id)
        `)
        .order('created_at', { ascending: false });

      if (bizErr) throw bizErr;

      return (businesses || []).map((b: any) => {
        const store = Array.isArray(b.stores) ? b.stores[0] : b.stores;
        const sub = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions;
        const plan = sub?.subscription_plans;
        const ownerMember = (b.business_members || []).find((bm: any) => bm.role === 'owner') || b.business_members?.[0];
        const ownerProfile = ownerMember?.profiles;
        const productsCount = (b.products || []).filter((p: any) => p.status !== 'archived').length;
        const ordersCount = (b.orders || []).length;

        const effectiveSlug = (store?.slug && store.slug.trim()) ||
          (b.slug && b.slug.trim()) ||
          (b.name ? b.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : '') ||
          `store-${(b.id || 'x').slice(0, 8)}`;

        const ownerEmail = ownerProfile?.email || b.email || '';
        const ownerName = ownerProfile?.full_name || 'Store Owner';
        const planName = plan?.name || sub?.plan_id || 'Starter';

        return {
          id: b.id,
          name: b.name || 'Store',
          slug: effectiveSlug,
          description: b.description,
          logo_url: b.logo_url,
          phone: b.phone,
          whatsapp_number: b.whatsapp_number,
          email: b.email,
          country: b.country || 'NG',
          currency: b.currency || 'NGN',
          state: b.state,
          city: b.city,
          address: b.address,
          status: b.status || 'active',
          created_at: b.created_at,
          updated_at: b.updated_at,
          storeSlug: effectiveSlug,
          storeStatus: store?.status || (b.status === 'active' ? 'published' : 'suspended'),
          store: {
            id: store?.id,
            slug: effectiveSlug,
            status: store?.status || (b.status === 'active' ? 'published' : 'suspended')
          },
          plan: planName,
          planId: plan?.id || sub?.plan_id || 'starter',
          subscription: {
            plan: {
              name: planName
            }
          },
          owner: {
            email: ownerEmail,
            full_name: ownerName
          },
          ownerName,
          ownerEmail,
          productsCount,
          productCount: productsCount,
          ordersCount
        };
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update business and associated store status
   */
  async updateBusinessStatus(businessId: string, status: 'active' | 'suspended' | 'cancelled'): Promise<Business> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data: business, error: bizErr } = await supabase
        .from('businesses')
        .update({ status, updated_at: now })
        .eq('id', businessId)
        .select('*')
        .single();

      if (bizErr) throw bizErr;

      // Also cascade status to store
      const storeStatus = status === 'active' ? 'published' : 'suspended';
      await supabase
        .from('stores')
        .update({ status: storeStatus, updated_at: now })
        .eq('business_id', businessId);

      return business as Business;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Retrieve platform governance settings
   */
  async getPlatformSettings(): Promise<PlatformSettings> {
    const defaultSettings: PlatformSettings = {
      platform_name: 'Xhipa Storefront SaaS',
      support_email: 'support@xhipa.ng',
      maintenance_mode: false,
      show_affiliate_button: true,
      affiliate_program_enabled: true
    };

    if (!isSupabaseConfigured()) {
      return defaultSettings;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return defaultSettings;
    }

    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'general')
        .maybeSingle();

      if (error || !data || !data.value) {
        return defaultSettings;
      }

      return { ...defaultSettings, ...(data.value as Partial<PlatformSettings>) };
    } catch (err: any) {
      console.warn('[AdminRepository] Failed to retrieve platform_settings from DB, serving defaults:', err);
      return defaultSettings;
    }
  }

  /**
   * Update platform governance settings
   */
  async updatePlatformSettings(updates: Partial<PlatformSettings>): Promise<PlatformSettings> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const current = await this.getPlatformSettings();
      const merged = { ...current, ...updates };

      const { data, error } = await supabase
        .from('platform_settings')
        .upsert({
          key: 'general',
          value: merged,
          updated_at: now
        })
        .select('value')
        .single();

      if (error) {
        if (
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('platform_settings') ||
          error.message?.includes('schema cache')
        ) {
          console.warn('[AdminRepository] platform_settings table not available. Returning updated settings in memory.');
          return merged;
        }
        throw error;
      }

      return (data?.value || merged) as PlatformSettings;
    } catch (err: any) {
      if (
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST205' ||
        err?.code === '42P01' ||
        err?.message?.includes('platform_settings') ||
        err?.message?.includes('schema cache')
      ) {
        return { ...await this.getPlatformSettings(), ...updates };
      }
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Retrieve all subscription plans for admin management
   */
  async getAllSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    if (!isSupabaseConfigured()) {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return DEFAULT_SUBSCRIPTION_PLANS;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_SUBSCRIPTION_PLANS;
      }

      return (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price_monthly: Number(p.price_monthly),
        currency: p.currency || 'NGN',
        max_products: p.max_products,
        can_checkout: Boolean(p.can_checkout),
        remove_branding: Boolean(p.remove_branding),
        custom_domain: Boolean(p.custom_domain),
        advanced_analytics: Boolean(p.advanced_analytics),
        is_active: Boolean(p.is_active),
        features: [
          `${p.max_products === -1 ? 'Unlimited' : p.max_products} Products`,
          !['free', 'beginner'].includes(p.id?.toLowerCase()) ? 'Multiple Product Categories' : 'No Categories',
          p.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      }));
    } catch (err) {
      console.warn('[AdminRepository] Failed to query subscription_plans, returning defaults:', err);
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  }

  /**
   * Update a subscription plan
   */
  async updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const supabase = getRequiredSupabase();

    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price_monthly !== undefined) dbUpdates.price_monthly = updates.price_monthly;
      if (updates.max_products !== undefined) dbUpdates.max_products = updates.max_products;
      if (updates.can_checkout !== undefined) dbUpdates.can_checkout = updates.can_checkout;
      if (updates.remove_branding !== undefined) dbUpdates.remove_branding = updates.remove_branding;
      if (updates.custom_domain !== undefined) dbUpdates.custom_domain = updates.custom_domain;
      if (updates.advanced_analytics !== undefined) dbUpdates.advanced_analytics = updates.advanced_analytics;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('subscription_plans')
        .update(dbUpdates)
        .eq('id', planId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        price_monthly: Number(data.price_monthly),
        currency: data.currency,
        max_products: data.max_products,
        can_checkout: Boolean(data.can_checkout),
        remove_branding: Boolean(data.remove_branding),
        custom_domain: Boolean(data.custom_domain),
        advanced_analytics: Boolean(data.advanced_analytics),
        is_active: Boolean(data.is_active),
        features: [
          `${data.max_products === -1 ? 'Unlimited' : data.max_products} Products`,
          !['free', 'beginner'].includes(data.id?.toLowerCase()) ? 'Multiple Product Categories' : 'No Categories',
          data.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const adminRepository = new AdminRepository();
