import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { entitlementService } from '../services/entitlement.service';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { merchantRepository } from '../repositories/merchant.repository';
import { adminRepository } from '../repositories/admin.repository';
import { paymentService } from '../services/payment.service';
import { config } from '../config';

const router = Router();

/**
 * GET /api/plans
 * Publicly retrieve active subscription plans
 */
router.get('/plans', async (_req, res: Response) => {
  try {
    const plans = await subscriptionRepository.getPlans();
    return res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to retrieve plans.' } });
  }
});

/**
 * GET /api/platform/settings
 * Publicly retrieve platform configuration & visibility settings
 */
router.get('/platform/settings', async (_req, res: Response) => {
  try {
    const settings = await adminRepository.getPlatformSettings();
    return res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to retrieve platform settings.' } });
  }
});

/**
 * GET /api/merchant/subscription
 * Get merchant subscription status and limits
 */
router.get('/merchant/subscription', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' }
      });
    }

    const businessId = membership.business_id;
    const [subscription, plan, productLimit, canCheckout, removeBranding, customDomain, advancedAnalytics] = await Promise.all([
      subscriptionRepository.getSubscriptionByBusinessId(businessId),
      entitlementService.getBusinessPlanAsync(businessId),
      entitlementService.canAddProductAsync(businessId),
      entitlementService.canAsync(businessId, 'can_checkout'),
      entitlementService.canAsync(businessId, 'remove_branding'),
      entitlementService.canAsync(businessId, 'custom_domain'),
      entitlementService.canAsync(businessId, 'advanced_analytics')
    ]);

    return res.json({
      success: true,
      data: {
        subscription: subscription || {
          business_id: businessId,
          plan_id: 'free',
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        plan,
        usage: {
          productCount: productLimit.currentCount,
          maxProducts: productLimit.maxAllowed,
          canCheckout,
          removeBranding,
          customDomain,
          advancedAnalytics
        }
      }
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Failed to retrieve subscription.' } });
  }
});

/**
 * POST /api/merchant/subscription/initialize
 * Initialize Paystack transaction for a paid subscription upgrade
 */
router.post('/merchant/subscription/initialize', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId, callbackUrl } = req.body;
    if (!planId) {
      return res.status(400).json({
        success: false,
        error: { code: 'PLAN_REQUIRED', message: 'Subscription plan ID is required.' }
      });
    }

    // Server-authoritative plan lookup from database
    const targetPlan = await subscriptionRepository.getPlanById(planId);
    if (!targetPlan) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan ID.' }
      });
    }

    if (targetPlan.is_active === false) {
      return res.status(400).json({
        success: false,
        error: { code: 'PLAN_UNAVAILABLE', message: `The ${targetPlan.name} is currently not available for new subscriptions.` }
      });
    }

    const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' }
      });
    }

    const businessId = membership.business_id;

    // If free plan is selected, activate directly without payment
    if (targetPlan.id === 'free' || targetPlan.price_monthly === 0) {
      const sub = await subscriptionRepository.upsertSubscription({
        businessId,
        planId: 'free',
        status: 'active'
      });

      return res.json({
        success: true,
        data: {
          free_activated: true,
          subscription: sub,
          plan: targetPlan,
          message: 'Free tier activated.'
        }
      });
    }

    // Initialize Paystack payment with server-authoritative pricing
    const resolvedCallbackUrl = callbackUrl || `${config.appUrl}/dashboard/subscription`;
    const userEmail = req.user!.email || 'merchant@xhipa.com';

    const result = await paymentService.initializeSubscriptionPayment({
      businessId,
      userId: req.user!.id,
      email: userEmail,
      planId: targetPlan.id,
      callbackUrl: resolvedCallbackUrl
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: { code: 'SUBSCRIPTION_INIT_FAILED', message: error.message || 'Failed to initialize subscription payment.' }
    });
  }
});

/**
 * POST /api/merchant/subscription/upgrade
 * Free plan selection ONLY. Paid plans must go through /initialize and verified payment.
 */
router.post('/merchant/subscription/upgrade', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { planId } = req.body;
    const targetPlan = await subscriptionRepository.getPlanById(planId);
    if (!planId || !targetPlan) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan ID.' }
      });
    }

    if (targetPlan.is_active === false) {
      return res.status(400).json({
        success: false,
        error: { code: 'PLAN_UNAVAILABLE', message: `The ${targetPlan.name} is currently not available for new subscriptions.` }
      });
    }

    const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
    if (!membership) {
      return res.status(404).json({
        success: false,
        error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' }
      });
    }

    const businessId = membership.business_id;

    // ONLY the Free Plan can be activated without payment confirmation
    if (targetPlan.id === 'free' || targetPlan.price_monthly === 0) {
      const sub = await subscriptionRepository.upsertSubscription({
        businessId,
        planId: 'free',
        status: 'active'
      });

      return res.json({
        success: true,
        data: {
          subscription: sub,
          plan: targetPlan,
          message: 'Free tier activated.'
        }
      });
    }

    // Fail-closed: Paid plans cannot be activated without verified payment
    return res.status(402).json({
      success: false,
      error: {
        code: 'PAYMENT_REQUIRED',
        message: 'Paid subscription plans require payment verification before activation. Please initialize payment.'
      }
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({ success: false, error: { message: error.message || 'Upgrade failed.' } });
  }
});

export default router;
