import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Payment, PaymentStatus } from '../../src/types';

export class PaymentRepository {
  /**
   * Create a pending payment record in PostgreSQL
   */
  async createPayment(paymentData: {
    businessId: string;
    orderId?: string | null;
    provider?: string;
    providerReference: string;
    amount: number;
    currency?: string;
    metadata?: Record<string, unknown>;
    paymentType?: string;
    subscriptionId?: string | null;
  }): Promise<Payment> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('payments')
        .insert({
          business_id: paymentData.businessId,
          order_id: paymentData.orderId || null,
          provider: paymentData.provider || 'paystack',
          provider_reference: paymentData.providerReference,
          amount: paymentData.amount,
          currency: paymentData.currency || 'NGN',
          status: 'pending',
          metadata: paymentData.metadata || {},
          payment_type: paymentData.paymentType || 'order',
          subscription_id: paymentData.subscriptionId || null,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        business_id: data.business_id,
        order_id: data.order_id,
        payment_type: data.payment_type || 'order',
        provider: data.provider,
        provider_reference: data.provider_reference,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status,
        metadata: data.metadata || {},
        paid_at: data.paid_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find payment by provider reference
   */
  async getPaymentByReference(reference: string): Promise<Payment | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('provider_reference', reference)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        business_id: data.business_id,
        order_id: data.order_id,
        payment_type: data.payment_type || 'order',
        provider: data.provider,
        provider_reference: data.provider_reference,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status,
        metadata: data.metadata || {},
        paid_at: data.paid_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find payment by ID
   */
  async getPaymentById(id: string): Promise<Payment | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        business_id: data.business_id,
        order_id: data.order_id,
        payment_type: data.payment_type || 'order',
        provider: data.provider,
        provider_reference: data.provider_reference,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status,
        metadata: data.metadata || {},
        paid_at: data.paid_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find payments for an order
   */
  async getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        business_id: d.business_id,
        order_id: d.order_id,
        provider: d.provider,
        provider_reference: d.provider_reference,
        amount: Number(d.amount),
        currency: d.currency,
        status: d.status,
        metadata: d.metadata || {},
        paid_at: d.paid_at,
        created_at: d.created_at,
        updated_at: d.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find payments for a business
   */
  async getPaymentsByBusinessId(businessId: string): Promise<Payment[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((d: any) => ({
        id: d.id,
        business_id: d.business_id,
        order_id: d.order_id,
        provider: d.provider,
        provider_reference: d.provider_reference,
        amount: Number(d.amount),
        currency: d.currency,
        status: d.status,
        metadata: d.metadata || {},
        paid_at: d.paid_at,
        created_at: d.created_at,
        updated_at: d.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Atomically update payment status in PostgreSQL
   */
  async updatePaymentStatus(id: string, status: PaymentStatus, paidAt?: string): Promise<Payment> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const updates: any = { status, updated_at: now };
      if (status === 'paid') {
        updates.paid_at = paidAt || now;
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        business_id: data.business_id,
        order_id: data.order_id,
        provider: data.provider,
        provider_reference: data.provider_reference,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status,
        metadata: data.metadata || {},
        paid_at: data.paid_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Atomically settle an order payment via database RPC
   */
  async settleOrderPaymentAtomic(providerReference: string): Promise<{
    success: boolean;
    already_settled?: boolean;
    payment_id?: string;
    order_id?: string;
    business_id?: string;
    message?: string;
    error?: string;
  }> {
    const supabase = getRequiredSupabase();
    try {
      const { data, error } = await supabase.rpc('settle_verified_order_payment', {
        p_provider_reference: providerReference
      });

      if (error) {
        console.warn('[PaymentRepository] RPC settle_verified_order_payment error or not present, returning null for fallback:', error.message);
        return { success: false, error: error.code || 'RPC_ERROR', message: error.message };
      }

      return data || { success: true };
    } catch (err: any) {
      console.warn('[PaymentRepository] Exception in RPC settle_verified_order_payment:', err?.message);
      return { success: false, error: 'EXCEPTION', message: err?.message };
    }
  }

  /**
   * Atomically settle a subscription payment via database RPC
   */
  async settleSubscriptionPaymentAtomic(params: {
    providerReference: string;
    businessId: string;
    planId: string;
    paystackCustomerCode?: string;
    paystackSubscriptionCode?: string;
  }): Promise<{
    success: boolean;
    already_settled?: boolean;
    payment_id?: string;
    business_id?: string;
    plan_id?: string;
    commission_created?: boolean;
    message?: string;
    error?: string;
  }> {
    const supabase = getRequiredSupabase();
    try {
      const { data, error } = await supabase.rpc('settle_verified_subscription_payment', {
        p_provider_reference: params.providerReference,
        p_business_id: params.businessId,
        p_plan_id: params.planId,
        p_paystack_customer_code: params.paystackCustomerCode || null,
        p_paystack_subscription_code: params.paystackSubscriptionCode || null
      });

      if (error) {
        console.warn('[PaymentRepository] RPC settle_verified_subscription_payment error or not present, returning null for fallback:', error.message);
        return { success: false, error: error.code || 'RPC_ERROR', message: error.message };
      }

      return data || { success: true };
    } catch (err: any) {
      console.warn('[PaymentRepository] Exception in RPC settle_verified_subscription_payment:', err?.message);
      return { success: false, error: 'EXCEPTION', message: err?.message };
    }
  }

  /**
   * Check if a webhook has already been processed (Database-backed idempotency)
   */
  async isWebhookProcessed(eventIdOrRef: string): Promise<boolean> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('processed_webhooks')
        .select('event_id')
        .eq('event_id', eventIdOrRef)
        .maybeSingle();

      if (error) {
        if (
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('processed_webhooks') ||
          error.message?.includes('schema cache')
        ) {
          return false;
        }
        throw error;
      }
      return Boolean(data);
    } catch (err: any) {
      if (
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST205' ||
        err?.code === '42P01' ||
        err?.message?.includes('processed_webhooks') ||
        err?.message?.includes('schema cache')
      ) {
        return false;
      }
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Mark a webhook as processed in PostgreSQL
   */
  async markWebhookProcessed(eventIdOrRef: string, eventType = 'charge.success', payload: any = {}): Promise<void> {
    const supabase = getRequiredSupabase();

    try {
      const { error } = await supabase
        .from('processed_webhooks')
        .upsert({
          event_id: eventIdOrRef,
          event_type: eventType,
          provider: 'paystack',
          payload: typeof payload === 'object' ? payload : {},
          processed_at: new Date().toISOString()
        });

      if (error) {
        if (
          error.code === 'PGRST204' ||
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.message?.includes('processed_webhooks') ||
          error.message?.includes('schema cache')
        ) {
          console.warn('[PaymentRepository] processed_webhooks table not present in schema cache.');
          return;
        }
        throw error;
      }
    } catch (err: any) {
      if (
        err?.code === 'PGRST204' ||
        err?.code === 'PGRST205' ||
        err?.code === '42P01' ||
        err?.message?.includes('processed_webhooks') ||
        err?.message?.includes('schema cache')
      ) {
        return;
      }
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find candidate pending payments older than thresholdMinutes for automated reconciliation
   */
  async findPendingPaymentsForReconciliation(thresholdMinutes = 30, maxAgeHours = 48): Promise<Payment[]> {
    const supabase = getRequiredSupabase();
    const thresholdDate = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();
    const minDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .lte('created_at', thresholdDate)
        .gte('created_at', minDate)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      if (!data) return [];

      return data.map(item => ({
        id: item.id,
        business_id: item.business_id,
        order_id: item.order_id,
        payment_type: item.payment_type || 'order',
        provider: item.provider,
        provider_reference: item.provider_reference,
        amount: Number(item.amount),
        currency: item.currency,
        status: item.status,
        metadata: item.metadata || {},
        paid_at: item.paid_at,
        created_at: item.created_at,
        updated_at: item.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const paymentRepository = new PaymentRepository();
