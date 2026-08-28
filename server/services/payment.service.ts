import { generateSecureRandomHex, timingSafeEqualStrings } from '../lib/crypto';
import { config } from '../config';
import { paymentRepository } from '../repositories/payment.repository';
import { orderRepository } from '../repositories/order.repository';
import { merchantRepository } from '../repositories/merchant.repository';
import { productRepository } from '../repositories/product.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { affiliateService } from './affiliate.service';
import { Payment } from '../../src/types';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export class PaymentService {
  /**
   * Verify Paystack Webhook Signature using HMAC SHA512 (Timing-safe)
   */
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader?: string): boolean {
    if (!signatureHeader || !config.paystackSecretKey) return false;
    try {
      const cryptoModule = require('crypto');
      const hash = cryptoModule
        .createHmac('sha512', config.paystackSecretKey)
        .update(rawBody)
        .digest('hex');

      return timingSafeEqualStrings(hash, signatureHeader);
    } catch (err) {
      console.error('[PaymentService] Error verifying webhook signature:', err);
      return false;
    }
  }

  /**
   * Initialize a Paystack transaction for an order
   */
  async initializePayment(params: {
    orderId: string;
    email: string;
    amountInKobo?: number;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitResponse> {
    const order = await orderRepository.getOrderById(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const business = await merchantRepository.getBusinessById(order.business_id);
    if (!business) {
      throw new Error('Business not found');
    }

    // Authoritative amount comes directly from server order record
    const authoritativeAmount = order.total;

    // Unique reference: PSTK_{order_number}_{timestamp}_{random}
    const reference = `PSTK_${order.order_number}_${Date.now()}_${generateSecureRandomHex(3)}`;

    // Create pending payment record in Supabase
    await paymentRepository.createPayment({
      businessId: order.business_id,
      orderId: order.id,
      provider: 'paystack',
      providerReference: reference,
      amount: authoritativeAmount,
      currency: order.currency || 'NGN',
      paymentType: 'order',
      metadata: {
        type: 'order',
        customer_email: params.email,
        customer_name: order.customer_name_snapshot,
        order_number: order.order_number,
        business_id: business.id,
        ...params.metadata
      }
    });

    if (!config.paystackSecretKey || !config.paystackSecretKey.startsWith('sk_')) {
      console.error('[PaymentService] PAYSTACK_SECRET_KEY is not configured or invalid.');
      throw new Error('Payment gateway is not configured. Please contact support.');
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email || `${order.customer_phone_snapshot}@guest.platform.ng`,
        amount: authoritativeAmount,
        reference,
        callback_url: params.callbackUrl,
        metadata: {
          type: 'order',
          order_id: order.id,
          business_id: business.id,
          business_name: business.name,
          order_number: order.order_number,
          ...params.metadata
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[PaymentService] Paystack initialization returned HTTP error:', response.status, errText);
      throw new Error('Failed to initialize transaction with payment processor.');
    }

    const data = await response.json();
    if (data.status && data.data) {
      return {
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference || reference
      };
    }

    throw new Error(data.message || 'Payment processor failed to provide authorization URL.');
  }

  /**
   * Initialize a Paystack transaction for a subscription upgrade
   */
  async initializeSubscriptionPayment(params: {
    businessId: string;
    userId: string;
    email: string;
    planId: string;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitResponse> {
    const targetPlan = await subscriptionRepository.getPlanById(params.planId);
    if (!targetPlan || targetPlan.is_active === false) {
      throw new Error('Selected subscription plan is invalid or unavailable.');
    }

    if (targetPlan.price_monthly <= 0) {
      throw new Error('Free plan does not require payment initialization.');
    }

    const business = await merchantRepository.getBusinessById(params.businessId);
    if (!business) {
      throw new Error('Business not found.');
    }

    // Authoritative amount comes directly from subscription_plans in database
    const authoritativeAmount = targetPlan.price_monthly;

    // Unique reference: XHIPA_SUB_{businessId}_{timestamp}_{random}
    const reference = `XHIPA_SUB_${params.businessId}_${Date.now()}_${generateSecureRandomHex(3)}`;

    // Create pending payment record in Supabase
    await paymentRepository.createPayment({
      businessId: params.businessId,
      orderId: null,
      provider: 'paystack',
      providerReference: reference,
      amount: authoritativeAmount,
      currency: targetPlan.currency || 'NGN',
      paymentType: 'subscription',
      metadata: {
        type: 'subscription',
        plan_id: targetPlan.id,
        plan_name: targetPlan.name,
        user_id: params.userId,
        business_id: params.businessId,
        customer_email: params.email,
        ...params.metadata
      }
    });

    if (!config.paystackSecretKey || !config.paystackSecretKey.startsWith('sk_')) {
      console.error('[PaymentService] PAYSTACK_SECRET_KEY is not configured or invalid.');
      throw new Error('Payment gateway is not configured. Please contact support.');
    }

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.paystackSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: params.email,
        amount: authoritativeAmount,
        reference,
        callback_url: params.callbackUrl,
        metadata: {
          type: 'subscription',
          business_id: params.businessId,
          business_name: business.name,
          user_id: params.userId,
          plan_id: targetPlan.id,
          plan_name: targetPlan.name,
          ...params.metadata
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[PaymentService] Paystack subscription init returned HTTP error:', response.status, errText);
      throw new Error('Failed to initialize subscription transaction with payment processor.');
    }

    const data = await response.json();
    if (data.status && data.data) {
      return {
        authorization_url: data.data.authorization_url,
        access_code: data.data.access_code,
        reference: data.data.reference || reference
      };
    }

    throw new Error(data.message || 'Payment processor failed to initialize subscription payment.');
  }

  /**
   * Fail-Closed Verification of Paystack transaction by reference
   */
  async verifyPayment(reference: string): Promise<{
    success: boolean;
    orderId?: string;
    businessId?: string;
    planId?: string;
    message: string;
  }> {
    // 1. Find payment record by reference in Supabase
    const payment = await paymentRepository.getPaymentByReference(reference);
    if (!payment) {
      return { success: false, message: 'Payment record not found for this reference.' };
    }

    const isSubscriptionPayment =
      payment.payment_type === 'subscription' ||
      (payment.metadata && (payment.metadata as any).type === 'subscription');

    // 2. Handle Idempotency for Order Payments
    let order: any = null;
    if (!isSubscriptionPayment && payment.order_id) {
      order = await orderRepository.getOrderById(payment.order_id);
      if (!order) {
        return { success: false, message: 'Order associated with payment not found.' };
      }

      if (payment.status === 'paid' && order.payment_status === 'paid') {
        return { success: true, orderId: order.id, message: 'Payment has already been confirmed.' };
      }
    }

    // 3. Handle Idempotency for Subscription Payments
    if (isSubscriptionPayment && payment.status === 'paid') {
      const planId = (payment.metadata?.plan_id as string) || 'beginner';
      return {
        success: true,
        businessId: payment.business_id,
        planId,
        message: 'Subscription payment has already been confirmed.'
      };
    }

    // 4. Fail-closed Verification: Require valid Paystack Secret Key
    if (!config.paystackSecretKey || !config.paystackSecretKey.startsWith('sk_')) {
      console.error('[PaymentService] PAYSTACK_SECRET_KEY is missing or invalid. Payment verification cannot proceed.');
      return { success: false, message: 'Payment verification unavailable due to server configuration.' };
    }

    // 5. Contact Paystack Transaction Verify API
    let isLiveSuccess = false;
    let verifiedData: any = null;

    try {
      const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.paystackSecretKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (
          data &&
          data.status === true &&
          data.data &&
          typeof data.data === 'object' &&
          data.data.status === 'success' &&
          data.data.reference === reference &&
          Number(data.data.amount) >= payment.amount &&
          (!payment.currency || data.data.currency?.toUpperCase() === payment.currency.toUpperCase())
        ) {
          isLiveSuccess = true;
          verifiedData = data.data;
        } else {
          console.warn(`[PaymentService] Paystack verification validation failed for reference ${reference}:`, data);
        }
      } else {
        console.error(`[PaymentService] Paystack verify endpoint returned HTTP status ${response.status} for ref ${reference}`);
      }
    } catch (err) {
      console.error(`[PaymentService] Network / parse error while verifying Paystack reference ${reference}:`, err);
    }

    // 6. Fail-closed rejection if any check failed
    if (!isLiveSuccess) {
      await paymentRepository.updatePaymentStatus(payment.id, 'failed');
      return { success: false, message: 'Payment verification failed at provider.' };
    }

    // 7. Confirmed Provider Success: Update Database Authoritatively via Atomic RPC
    if (!isSubscriptionPayment && order) {
      const atomicResult = await paymentRepository.settleOrderPaymentAtomic(reference);
      if (atomicResult && atomicResult.success) {
        return {
          success: true,
          orderId: atomicResult.order_id || order.id,
          businessId: atomicResult.business_id || order.business_id,
          message: atomicResult.already_settled ? 'Payment has already been confirmed.' : 'Payment successfully verified and settled.'
        };
      }

      // Fallback if RPC not loaded in current database schema
      const now = new Date().toISOString();
      await paymentRepository.updatePaymentStatus(payment.id, 'paid', now);
      await orderRepository.updatePaymentStatus(order.id, 'paid', 'confirmed');
      for (const item of order.items) {
        if (item.product_id) {
          await productRepository.adjustStock(item.product_id, item.quantity);
        }
      }
      return { success: true, orderId: order.id, message: 'Payment successfully verified.' };
    }

    // Branch: Subscription Upgrade Payment Confirmation
    if (isSubscriptionPayment) {
      const planId = (payment.metadata?.plan_id as string) || 'beginner';
      const businessId = payment.business_id;

      const atomicSubResult = await paymentRepository.settleSubscriptionPaymentAtomic({
        providerReference: reference,
        businessId,
        planId,
        paystackCustomerCode: verifiedData?.customer?.customer_code,
        paystackSubscriptionCode: verifiedData?.subscription?.subscription_code
      });

      if (atomicSubResult && atomicSubResult.success) {
        const targetPlan = await subscriptionRepository.getPlanById(planId);
        return {
          success: true,
          businessId: atomicSubResult.business_id || businessId,
          planId: atomicSubResult.plan_id || planId,
          message: atomicSubResult.already_settled
            ? 'Subscription payment has already been confirmed.'
            : `Subscription for ${targetPlan?.name || planId} successfully verified and activated.`
        };
      }

      // Fallback if RPC not loaded in current database schema
      const now = new Date().toISOString();
      await paymentRepository.updatePaymentStatus(payment.id, 'paid', now);
      await subscriptionRepository.upsertSubscription({
        businessId,
        planId,
        status: 'active',
        paystackCustomerCode: verifiedData?.customer?.customer_code,
        paystackSubscriptionCode: verifiedData?.subscription?.subscription_code
      });

      const targetPlan = await subscriptionRepository.getPlanById(planId);
      if (targetPlan?.can_checkout) {
        await merchantRepository.updateStoreSettings(businessId, { enable_checkout: true });
      }

      affiliateService.handleFirstPaidSubscription(businessId).catch(err => {
        console.error('[Affiliate] Error awarding paid subscription commission:', err);
      });

      return {
        success: true,
        businessId,
        planId,
        message: `Subscription for ${targetPlan?.name || planId} successfully verified and activated.`
      };
    }

    return { success: true, message: 'Payment successfully verified.' };
  }

  /**
   * Idempotent webhook handler
   */
  async handleWebhook(event: { event: string; data: { reference: string; status: string; amount: number } }): Promise<boolean> {
    const { reference, status } = event.data || {};
    if (!reference) return false;

    // Check duplicate webhook processing in database
    const isProcessed = await paymentRepository.isWebhookProcessed(reference);
    if (isProcessed) {
      return true;
    }

    if (event.event === 'charge.success' && status === 'success') {
      const result = await this.verifyPayment(reference);
      if (result.success) {
        await paymentRepository.markWebhookProcessed(reference);
        return true;
      }
    }

    return false;
  }

  /**
   * Automated Background Reconciliation Engine
   * Periodically recovers stale pending payments by querying authoritative Paystack API
   * and invoking the atomic PostgreSQL settlement engine.
   */
  async reconcilePendingPayments(thresholdMinutes = 30, maxAgeHours = 48): Promise<{
    scanned: number;
    settled: number;
    failed: number;
    retried: number;
  }> {
    if (!config.paystackSecretKey || !config.paystackSecretKey.startsWith('sk_')) {
      console.warn('[Reconciliation] PAYSTACK_SECRET_KEY missing. Skipping reconciliation cycle.');
      return { scanned: 0, settled: 0, failed: 0, retried: 0 };
    }

    const candidates = await paymentRepository.findPendingPaymentsForReconciliation(thresholdMinutes, maxAgeHours);
    let settled = 0;
    let failed = 0;
    let retried = 0;

    for (const payment of candidates) {
      const ref = payment.provider_reference;
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          retried++;
          continue;
        }

        const data = await response.json();
        const tx = data?.data;

        if (tx && tx.status === 'success' && Number(tx.amount) >= payment.amount) {
          const verifyResult = await this.verifyPayment(ref);
          if (verifyResult.success) {
            settled++;
            console.log(`[Reconciliation] Successfully recovered and settled stale payment ${ref}`);
          } else {
            retried++;
          }
        } else if (tx && (tx.status === 'failed' || tx.status === 'abandoned')) {
          await paymentRepository.updatePaymentStatus(payment.id, 'failed');
          failed++;
          console.log(`[Reconciliation] Marked stale transaction ${ref} as failed (${tx.status})`);
        } else {
          // Transaction still ongoing or ambiguous - leave for next cycle
          retried++;
        }
      } catch (err) {
        console.error(`[Reconciliation] Error reconciling transaction ${ref}:`, err);
        retried++;
      }
    }

    return { scanned: candidates.length, settled, failed, retried };
  }
}

export const paymentService = new PaymentService();

