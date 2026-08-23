import { Router, Response } from 'express';
import { db } from '../data/store';
import { AuthenticatedRequest, requireAuth, requirePlatformAdmin } from '../middleware/auth';

const router = Router();

// Middleware: all admin routes require authentication and admin flag
router.use(requireAuth);
router.use(requirePlatformAdmin);

/**
 * GET /api/admin/metrics
 * Platform-wide metrics
 */
router.get('/metrics', (_req: AuthenticatedRequest, res: Response) => {
  const businesses = Array.from(db.businesses.values());
  const orders = Array.from(db.orders.values());
  const products = Array.from(db.products.values()).filter(p => p.status !== 'archived');
  const subscriptions = Array.from(db.subscriptions.values());

  const totalRevenue = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0);
  const activeStores = businesses.filter(b => b.status === 'active').length;

  const planBreakdown = {
    free: subscriptions.filter(s => s.plan_id === 'free').length,
    beginner: subscriptions.filter(s => s.plan_id === 'beginner').length,
    whatsapp_starter: subscriptions.filter(s => s.plan_id === 'whatsapp_starter').length,
    starter: subscriptions.filter(s => s.plan_id === 'starter').length,
    business: subscriptions.filter(s => s.plan_id === 'business').length
  };

  return res.json({
    success: true,
    data: {
      totalBusinesses: businesses.length,
      activeStores,
      totalOrders: orders.length,
      totalProducts: products.length,
      totalRevenue,
      planBreakdown
    }
  });
});

/**
 * GET /api/admin/businesses
 * List all business tenants with plans and owner details
 */
router.get('/businesses', (_req: AuthenticatedRequest, res: Response) => {
  const businesses = Array.from(db.businesses.values()).map(b => {
    const store = db.stores.get(b.id);
    const sub = db.subscriptions.get(b.id);
    const plan = sub ? db.subscriptionPlans.get(sub.plan_id) : db.subscriptionPlans.get('free');
    const member = Array.from(db.businessMembers.values()).find(bm => bm.business_id === b.id && bm.role === 'owner');
    const owner = member ? db.profiles.get(member.user_id) : null;
    const productsCount = Array.from(db.products.values()).filter(p => p.business_id === b.id && p.status !== 'archived').length;
    const ordersCount = Array.from(db.orders.values()).filter(o => o.business_id === b.id).length;

    return {
      ...b,
      storeSlug: store?.slug,
      storeStatus: store?.status,
      plan: plan?.name || 'Free Plan',
      planId: plan?.id || 'free',
      ownerName: owner?.full_name || 'N/A',
      ownerEmail: owner?.email || b.email,
      productsCount,
      ordersCount
    };
  });

  return res.json({
    success: true,
    data: businesses
  });
});

/**
 * PATCH /api/admin/businesses/:id/status
 * Suspend or reactivate a business
 */
router.patch('/businesses/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const business = db.businesses.get(id);
  if (!business) {
    return res.status(404).json({ success: false, error: { message: 'Business not found.' } });
  }

  business.status = status;
  business.updated_at = new Date().toISOString();
  db.businesses.set(business.id, business);

  const store = db.stores.get(id);
  if (store) {
    store.status = status === 'active' ? 'published' : 'suspended';
    store.updated_at = new Date().toISOString();
    db.stores.set(id, store);
  }

  return res.json({
    success: true,
    data: {
      business,
      message: `Business ${business.name} is now ${status}.`
    }
  });
});

/**
 * GET /api/admin/platform/settings
 * Retrieve platform governance settings (e.g. affiliate visibility)
 */
router.get('/platform/settings', (_req: AuthenticatedRequest, res: Response) => {
  const settings = db.getPlatformSettings();
  return res.json({
    success: true,
    data: settings
  });
});

/**
 * PUT /api/admin/platform/settings
 * Update platform governance settings (e.g. toggle affiliate button visibility)
 */
router.put('/platform/settings', (req: AuthenticatedRequest, res: Response) => {
  const { show_affiliate_button, affiliate_program_enabled, maintenance_mode } = req.body;
  const updates: any = {};

  if (show_affiliate_button !== undefined) {
    updates.show_affiliate_button = Boolean(show_affiliate_button);
  }
  if (affiliate_program_enabled !== undefined) {
    updates.affiliate_program_enabled = Boolean(affiliate_program_enabled);
  }
  if (maintenance_mode !== undefined) {
    updates.maintenance_mode = Boolean(maintenance_mode);
  }

  const updated = db.updatePlatformSettings(updates);
  return res.json({
    success: true,
    data: updated,
    message: 'Platform settings updated successfully.'
  });
});

/**
 * GET /api/admin/plans
 * Retrieve all subscription plans with status for admin management
 */
router.get('/plans', (_req: AuthenticatedRequest, res: Response) => {
  const plans = db.getAllSubscriptionPlans();
  return res.json({
    success: true,
    data: plans
  });
});

/**
 * PATCH /api/admin/plans/:id/status
 * Toggle a subscription plan's availability for merchants
 */
router.patch('/plans/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({ success: false, error: { message: 'is_active boolean required.' } });
  }

  const updated = db.updateSubscriptionPlan(id, { is_active: Boolean(is_active) });
  if (!updated) {
    return res.status(404).json({ success: false, error: { message: 'Plan not found.' } });
  }

  return res.json({
    success: true,
    data: updated,
    message: `Subscription plan '${updated.name}' is now ${is_active ? 'available' : 'disabled'} for merchants.`
  });
});

/**
 * PUT /api/admin/plans/:id
 * Update subscription plan details (pricing, limits, description, features)
 */
router.put('/plans/:id', (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, price_monthly, max_products, can_checkout, remove_branding, custom_domain, is_active } = req.body;

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price_monthly !== undefined) updates.price_monthly = Number(price_monthly);
  if (max_products !== undefined) updates.max_products = Number(max_products);
  if (can_checkout !== undefined) updates.can_checkout = Boolean(can_checkout);
  if (remove_branding !== undefined) updates.remove_branding = Boolean(remove_branding);
  if (custom_domain !== undefined) updates.custom_domain = Boolean(custom_domain);
  if (is_active !== undefined) updates.is_active = Boolean(is_active);

  const updated = db.updateSubscriptionPlan(id, updates);
  if (!updated) {
    return res.status(404).json({ success: false, error: { message: 'Plan not found.' } });
  }

  return res.json({
    success: true,
    data: updated,
    message: `Plan '${updated.name}' updated successfully.`
  });
});

export default router;
