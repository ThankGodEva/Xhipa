import { Router, Request, Response } from 'express';
import { paymentService } from '../services/payment.service';
import { paymentRateLimiter } from '../middleware/rateLimiter';
import { config } from '../config';

const router = Router();

/**
 * POST /api/payments/initialize
 * Initialize Paystack payment for an order
 */
router.post('/initialize', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const { orderId, email, amountInKobo, callbackUrl, metadata } = req.body;

    if (!orderId || !amountInKobo) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'orderId and amountInKobo are required.' }
      });
    }

    const result = await paymentService.initializePayment({
      orderId,
      email: email || 'customer@xhipa.com',
      amountInKobo,
      callbackUrl: callbackUrl || `${config.appUrl}/payment/callback`,
      metadata
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'PAYMENT_INIT_FAILED', message: error.message || 'Payment initialization failed.' }
    });
  }
});

/**
 * GET /api/payments/verify/:reference
 * Verifies Paystack payment reference and updates order
 */
router.get('/verify/:reference', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const { reference } = req.params;
    if (!reference) {
      return res.status(400).json({
        success: false,
        error: { code: 'REFERENCE_REQUIRED', message: 'Payment reference is required.' }
      });
    }

    const result = await paymentService.verifyPayment(reference);

    return res.json({
      success: result.success,
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'VERIFICATION_FAILED', message: error.message || 'Verification failed.' }
    });
  }
});

/**
 * POST /api/payments/webhook
 * Paystack Webhook Handler (HMAC-SHA512 verified)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);

    // In production with live Paystack secret key, verify HMAC SHA512 signature
    if (config.paystackSecretKey && config.paystackSecretKey.startsWith('sk_live')) {
      const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        return res.status(401).json({ success: false, message: 'Invalid signature' });
      }
    }

    const event = req.body;
    await paymentService.handleWebhook(event);

    return res.status(200).json({ status: 'success' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
