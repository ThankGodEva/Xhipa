import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Subscription, SubscriptionPlan, SubscriptionStatus } from '../../src/types';

export class SubscriptionRepository {
  /**
   * Get all active subscription plans
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

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
          p.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get a plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

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

  /**
   * Get subscription for a business
   */
  async getSubscriptionByBusinessId(businessId: string): Promise<Subscription | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

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
          data.subscription_plans.can_checkout ? 'Online Direct Checkout' : 'WhatsApp Ordering',
          'Mobile-optimized storefront'
        ]
      } : undefined;

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
      throw normalizeDatabaseError(err);
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
