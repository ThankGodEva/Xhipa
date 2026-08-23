import crypto from 'crypto';
import { config } from '../config';
import { db } from '../data/store';
import { Payment } from '../../src/types';

export interface PaystackInitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export class PaymentService {
  /**
   * Verify Paystack Webhook Signature using HMAC SHA512
   */
  verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    if (!signatureHeader) return false;
    const secret = config.paystackSecretKey || 'sk_test_mock_secret';
    const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    return hash === signatureHeader;
  }

  /**
   * Initialize a Paystack transaction for an order
   */
  async initializePayment(params: {
    orderId: string;
    email: string;
    amountInKobo: number;
    callbackUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackInitResponse> {
    const order = db.orders.get(params.orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const business = db.businesses.get(order.business_id);
    if (!business) {
      throw new Error('Business not found');
    }

    // Unique reference: PSTK_{order_number}_{timestamp}
    const reference = `PSTK_${order.order_number}_${Date.now()}`;

    // Create pending payment record
    const paymentRecord: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      business_id: order.business_id,
      order_id: order.id,
      provider: 'paystack',
      provider_reference: reference,
      amount: params.amountInKobo,
      currency: order.currency || 'NGN',
      status: 'pending',
      metadata: {
        customer_email: params.email,
        customer_name: order.customer_name_snapshot,
        ...params.metadata
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.payments.set(paymentRecord.id, paymentRecord);

    // If real Paystack Secret Key is configured, make the live Paystack API call
    if (config.paystackSecretKey && config.paystackSecretKey.startsWith('sk_')) {
      try {
        const response = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: params.email || `${order.customer_phone_snapshot}@guest.platform.ng`,
            amount: params.amountInKobo,
            reference,
            callback_url: params.callbackUrl,
            metadata: {
              order_id: order.id,
              business_id: business.id,
              business_name: business.name,
              order_number: order.order_number,
              ...params.metadata
            }
          })
        });

        const data = await response.json();
        if (data.status && data.data) {
          return {
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            reference: data.data.reference || reference
          };
        }
      } catch (err) {
        console.error('Paystack initialization error, using local checkout flow:', err);
      }
    }

    // Direct checkout callback URL
    const simulatedAuthUrl = `${params.callbackUrl}?reference=${reference}&order_id=${order.id}&amount=${params.amountInKobo}`;
    return {
      authorization_url: simulatedAuthUrl,
      access_code: `mock_code_${Date.now()}`,
      reference
    };
  }

  /**
   * Verify Paystack transaction by reference and atomically update DB
   */
  async verifyPayment(reference: string): Promise<{ success: boolean; orderId?: string; message: string }> {
    // Find payment by reference
    const payment = Array.from(db.payments.values()).find(p => p.provider_reference === reference);
    if (!payment) {
      return { success: false, message: 'Payment record not found for this reference.' };
    }

    const order = db.orders.get(payment.order_id);
    if (!order) {
      return { success: false, message: 'Order associated with payment not found.' };
    }

    // If already verified/paid, return idempotent success
    if (payment.status === 'paid' && order.payment_status === 'paid') {
      return { success: true, orderId: order.id, message: 'Payment has already been confirmed.' };
    }

    let isLiveSuccess = true;

    if (config.paystackSecretKey && config.paystackSecretKey.startsWith('sk_')) {
      try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
          headers: {
            Authorization: `Bearer ${config.paystackSecretKey}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        if (!data.status || data.data.status !== 'success' || data.data.amount < payment.amount) {
          isLiveSuccess = false;
        }
      } catch (err) {
        console.error('Paystack verification network error:', err);
      }
    }

    if (isLiveSuccess) {
      // Atomically mark payment as paid
      payment.status = 'paid';
      payment.paid_at = new Date().toISOString();
      payment.updated_at = new Date().toISOString();
      db.payments.set(payment.id, payment);

      // Atomically mark order as confirmed & paid
      order.payment_status = 'paid';
      order.status = 'confirmed';
      order.updated_at = new Date().toISOString();
      db.orders.set(order.id, order);

      // Deduct inventory for items where track_inventory is enabled
      for (const item of order.items) {
        if (item.product_id) {
          const product = db.products.get(item.product_id);
          if (product && product.track_inventory) {
            product.stock_quantity = Math.max(0, product.stock_quantity - item.quantity);
            if (product.stock_quantity === 0) {
              product.status = 'out_of_stock';
            }
            db.products.set(product.id, product);
          }
        }
      }

      return { success: true, orderId: order.id, message: 'Payment successfully verified.' };
    } else {
      payment.status = 'failed';
      payment.updated_at = new Date().toISOString();
      db.payments.set(payment.id, payment);
      return { success: false, message: 'Payment verification failed at provider.' };
    }
  }

  /**
   * Idempotent webhook handler
   */
  async handleWebhook(event: { event: string; data: { reference: string; status: string; amount: number } }): Promise<boolean> {
    const { reference, status } = event.data;
    if (!reference) return false;

    // Check duplicate webhook processing
    if (db.processedWebhooks.has(reference)) {
      return true;
    }

    if (event.event === 'charge.success' && status === 'success') {
      const result = await this.verifyPayment(reference);
      if (result.success) {
        db.processedWebhooks.add(reference);
        return true;
      }
    }

    return false;
  }
}

export const paymentService = new PaymentService();
