import { getRequiredSupabase, getSupabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../src/types';

export const DEFAULT_SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free Starter',
    description: 'Perfect for new sellers starting their digital storefront journey.',
    price_monthly: 0,
    currency: 'NGN',
    max_products: 10,
    can_checkout: false,
    remove_branding: false,
    custom_domain: false,
    advanced_analytics: false,
    is_active: true,
    features: [
      '10 Products',
      'No Categories',
      'WhatsApp Ordering',
      'Mobile-optimized storefront'
    ]
  },
  {
    id: 'beginner',
    name: 'Beginner',
    description: 'Great for growing micro-merchants needing more product catalog capacity.',
    price_monthly: 135000,
    currency: 'NGN',
    max_products: 30,
    can_checkout: false,
    remove_branding: false,
    custom_domain: false,
    advanced_analytics: false,
    is_active: true,
    features: [
      '30 Products',
      'No Categories',
      'WhatsApp Ordering',
      'Mobile-optimized storefront'
    ]
  },
  {
    id: 'whatsapp_starter',
    name: 'WhatsApp Starter',
    description: 'Clean unbranded catalog with rich analytics tailored for social commerce.',
    price_monthly: 299999,
    currency: 'NGN',
    max_products: 50,
    can_checkout: false,
    remove_branding: true,
    custom_domain: false,
    advanced_analytics: true,
    is_active: true,
    features: [
      '50 Products',
      'Multiple Product Categories',
      'WhatsApp Ordering',
      'Remove Xhipa Branding',
      'Advanced Analytics'
    ]
  },
  {
    id: 'starter',
    name: 'Starter Direct Pay',
    description: 'Empower your customers with direct card/bank checkout and custom branding.',
    price_monthly: 500000,
    currency: 'NGN',
    max_products: 100,
    can_checkout: true,
    remove_branding: true,
    custom_domain: true,
    advanced_analytics: true,
    is_active: true,
    features: [
      '100 Products',
      'Multiple Product Categories',
      'Online Direct Checkout',
      'Remove Xhipa Branding',
      'Custom Domain Support',
      'Advanced Analytics'
    ]
  },
  {
    id: 'business',
    name: 'Business Pro',
    description: 'Unlimited catalog scale, zero limits, and premier priority processing.',
    price_monthly: 1500000,
    currency: 'NGN',
    max_products: -1,
    can_checkout: true,
    remove_branding: true,
    custom_domain: true,
    advanced_analytics: true,
    is_active: true,
    features: [
      'Unlimited Products',
      'Multiple Product Categories',
      'Online Direct Checkout',
      'Remove Xhipa Branding',
      'Custom Domain Support',
      'Advanced Analytics & Priority Support'
    ]
  }
];

export class SubscriptionRepository {
  /**
   * Get all active subscription plans with fallback to defaults
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
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
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error || !data || data.length === 0) {
        return DEFAULT_SUBSCRIPTION_PLANS;
      }

      return (data || []).map((p: any) => ({
        id: p.id as SubscriptionPlan['id'],
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
      console.warn('[SubscriptionRepository] Failed to query subscription_plans, returning defaults:', err);
      return DEFAULT_SUBSCRIPTION_PLANS;
    }
  }

  /**
   * Get a plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    if (!planId) return null;
    const cleanId = planId.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      return DEFAULT_SUBSCRIPTION_PLANS.find(p => p.id === cleanId) || null;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return DEFAULT_SUBSCRIPTION_PLANS.find(p => p.id === cleanId) || null;
    }

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();

      if (error || !data) {
        return DEFAULT_SUBSCRIPTION_PLANS.find(p => p.id === cleanId) || null;
      }

      return {
        id: data.id as SubscriptionPlan['id'],
        name: data.name,
        description: data.description,
        price_monthly: Number(data.price_monthly),
        currency: data.currency || 'NGN',
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
      console.warn(`[SubscriptionRepository] Plan lookup error for "${planId}", using fallback:`, err);
      return DEFAULT_SUBSCRIPTION_PLANS.find(p => p.id === cleanId) || null;
    }
  }

  /**
   * Get subscription for a business
   */
  async getSubscriptionByBusinessId(businessId: string): Promise<Subscription | null> {
    if (!businessId) return null;

    if (!isSupabaseConfigured()) {
      return {
        id: `sub_${businessId}`,
        business_id: businessId,
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        plan: DEFAULT_SUBSCRIPTION_PLANS[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error || !data) {
        return {
          id: `sub_${businessId}`,
          business_id: businessId,
          plan_id: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          plan: DEFAULT_SUBSCRIPTION_PLANS[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const plan = data.subscription_plans ? {
        id: data.subscription_plans.id,
        name: data.subscription_plans.name,
        description: data.subscription_plans.description,
        price_monthly: Number(data.subscription_plans.price_monthly),
        currency: data.subscription_plans.currency,
        max_products: data.subscription_plans.max_products,
        can_checkout: Boolean(data.subscription_plans.can_checkout),
        remove_branding: Boolean(data.subscription_plans.remove_branding),
        custom_domain: Boolean(data.subscription_plans.custom_domain),
        advanced_analytics: Boolean(data.subscription_plans.advanced_analytics),
        is_active: Boolean(data.subscription_plans.is_active),
        features: [
          `${data.subscription_plans.max_products === -1 ? 'Unlimited' : data.subscription_plans.max_products} Products`,
          !['free', 'beginner'].includes(data.subscription_plans.id?.toLowerCase()) ? 'Multiple Product Categories' : 'No Categories',
          data.subscription_plans.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      } : (DEFAULT_SUBSCRIPTION_PLANS.find(p => p.id === data.plan_id) || DEFAULT_SUBSCRIPTION_PLANS[0]);

      return {
        id: data.id,
        business_id: data.business_id,
        plan_id: data.plan_id as SubscriptionPlan['id'],
        status: data.status as SubscriptionStatus,
        paystack_customer_code: data.paystack_customer_code,
        paystack_subscription_code: data.paystack_subscription_code,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        plan: plan as any,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      console.warn('[SubscriptionRepository] Database getSubscriptionByBusinessId error:', err);
      return {
        id: `sub_${businessId}`,
        business_id: businessId,
        plan_id: 'free',
        status: 'active',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        plan: DEFAULT_SUBSCRIPTION_PLANS[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  }

  /**
   * Upsert or upgrade a subscription for a business
   */
  async upsertSubscription(params: {
    businessId: string;
    planId: string;
    status?: SubscriptionStatus;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string;
  }): Promise<Subscription> {
    const now = new Date().toISOString();
    const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    const status = params.status || 'active';
    const planIdTyped = params.planId as SubscriptionPlan['id'];
    const supabase = getRequiredSupabase();

    try {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', params.businessId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await supabase
          .from('subscriptions')
          .update({
            plan_id: params.planId,
            status,
            paystack_customer_code: params.paystackCustomerCode || existing.paystack_customer_code,
            paystack_subscription_code: params.paystackSubscriptionCode || existing.paystack_subscription_code,
            current_period_start: now,
            current_period_end: periodEnd,
            updated_at: now
          })
          .eq('id', existing.id)
          .select('*, subscription_plans(*)')
          .single();

        if (error) throw error;

        return {
          id: updated.id,
          business_id: updated.business_id,
          plan_id: updated.plan_id as SubscriptionPlan['id'],
          status: updated.status as SubscriptionStatus,
          paystack_customer_code: updated.paystack_customer_code,
          paystack_subscription_code: updated.paystack_subscription_code,
          current_period_start: updated.current_period_start,
          current_period_end: updated.current_period_end,
          plan: updated.subscription_plans as any,
          created_at: updated.created_at,
          updated_at: updated.updated_at
        };
      } else {
        const { data: created, error } = await supabase
          .from('subscriptions')
          .insert({
            business_id: params.businessId,
            plan_id: params.planId,
            status,
            paystack_customer_code: params.paystackCustomerCode || null,
            paystack_subscription_code: params.paystackSubscriptionCode || null,
            current_period_start: now,
            current_period_end: periodEnd,
            created_at: now,
            updated_at: now
          })
          .select('*, subscription_plans(*)')
          .single();

        if (error) throw error;

        return {
          id: created.id,
          business_id: created.business_id,
          plan_id: created.plan_id as SubscriptionPlan['id'],
          status: created.status as SubscriptionStatus,
          paystack_customer_code: created.paystack_customer_code,
          paystack_subscription_code: created.paystack_subscription_code,
          current_period_start: created.current_period_start,
          current_period_end: created.current_period_end,
          plan: created.subscription_plans as any,
          created_at: created.created_at,
          updated_at: created.updated_at
        };
      }
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get all subscriptions
   */
  async getAllSubscriptions(): Promise<Subscription[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((s: any) => ({
        id: s.id,
        business_id: s.business_id,
        plan_id: s.plan_id as SubscriptionPlan['id'],
        status: s.status as SubscriptionStatus,
        paystack_customer_code: s.paystack_customer_code,
        paystack_subscription_code: s.paystack_subscription_code,
        current_period_start: s.current_period_start,
        current_period_end: s.current_period_end,
        plan: s.subscription_plans as any,
        created_at: s.created_at,
        updated_at: s.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: Enable or disable a subscription plan
   */
  async updatePlanStatus(planId: string, isActive: boolean): Promise<SubscriptionPlan> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .update({ is_active: isActive })
        .eq('id', planId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id as SubscriptionPlan['id'],
        name: data.name,
        description: data.description,
        price_monthly: Number(data.price_monthly),
        currency: data.currency || 'NGN',
        max_products: data.max_products,
        can_checkout: Boolean(data.can_checkout),
        remove_branding: Boolean(data.remove_branding),
        custom_domain: Boolean(data.custom_domain),
        advanced_analytics: Boolean(data.advanced_analytics),
        is_active: Boolean(data.is_active),
        features: [
          `${data.max_products === -1 ? 'Unlimited' : data.max_products} Products`,
          data.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const subscriptionRepository = new SubscriptionRepository();
