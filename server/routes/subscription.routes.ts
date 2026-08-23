import { Router, Response } from 'express';
import { db } from '../data/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { entitlementService } from '../services/entitlement.service';
import { affiliateService } from '../services/affiliate.service';

const router = Router();

/**
 * GET /api/plans
 * Publicly retrieve active subscription plans
 */
router.get('/plans', (_req, res: Response) => {
  const plans = db.getActiveSubscriptionPlans();
  return res.json({
    success: true,
    data: plans
  });
});

/**
 * GET /api/platform/settings
 * Publicly retrieve platform configuration & visibility settings
 */
router.get('/platform/settings', (_req, res: Response) => {
  const settings = db.getPlatformSettings();
  return res.json({
    success: true,
    data: settings
  });
});

/**
 * GET /api/merchant/subscription
 * Get merchant subscription status and limits
 */
router.get('/merchant/subscription', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // Find business for the logged-in merchant
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) {
    return res.status(404).json({
      success: false,
      error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' }
    });
  }

  const businessId = membership.business_id;
  const subscription = db.subscriptions.get(businessId);
  const plan = entitlementService.getBusinessPlan(businessId);
  const productLimit = entitlementService.canAddProduct(businessId);

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
        canCheckout: entitlementService.can(businessId, 'can_checkout'),
        removeBranding: entitlementService.can(businessId, 'remove_branding'),
        customDomain: entitlementService.can(businessId, 'custom_domain'),
        advancedAnalytics: entitlementService.can(businessId, 'advanced_analytics')
      }
    }
  });
});

/**
 * POST /api/merchant/subscription/upgrade
 * Upgrade merchant subscription plan
 */
router.post('/merchant/subscription/upgrade', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { planId } = req.body;
  const targetPlan = db.subscriptionPlans.get(planId);
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

  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) {
    return res.status(404).json({
      success: false,
      error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' }
    });
  }

  const businessId = membership.business_id;
  let sub = db.subscriptions.get(businessId);

  if (!sub) {
    sub = {
      id: `sub_${Date.now()}`,
      business_id: businessId,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } else {
    sub.plan_id = planId;
    sub.status = 'active';
    sub.current_period_start = new Date().toISOString();
    sub.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    sub.updated_at = new Date().toISOString();
  }

  db.subscriptions.set(businessId, sub);

  // Trigger affiliate commission if this is a paid subscription (idempotent & authoritative)
  if (planId !== 'free') {
    affiliateService.handleFirstPaidSubscription(businessId).catch(err => {
      console.error('[Affiliate] Error handling paid subscription commission:', err);
    });
  }

  // If upgrading to paid checkout plan, enable checkout in settings if merchant wishes
  const plan = db.subscriptionPlans.get(planId)!;
  const settings = db.storeSettings.get(businessId);
  if (settings && plan.can_checkout) {
    settings.enable_checkout = true;
    db.storeSettings.set(businessId, settings);
  }

  return res.json({
    success: true,
    data: {
      subscription: sub,
      plan,
      message: `Successfully activated ${plan.name}!`
    }
  });
});

export default router;
