import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth, requirePlatformAdmin } from '../middleware/auth';
import { adminRepository } from '../repositories/admin.repository';

const router = Router();

// Middleware: all admin routes require authentication and admin flag
router.use(requireAuth);
router.use(requirePlatformAdmin);

/**
 * GET /api/admin/metrics
 * Platform-wide metrics
 */
router.get('/metrics', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const metrics = await adminRepository.getPlatformMetrics();
    return res.json({
      success: true,
      data: metrics
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'METRICS_ERROR', message: error.message || 'Failed to retrieve platform metrics.' }
    });
  }
});

/**
 * GET /api/admin/businesses
 * List all business tenants with plans and owner details
 */
router.get('/businesses', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const businesses = await adminRepository.getAllBusinesses();
    return res.json({
      success: true,
      data: businesses
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'BUSINESSES_ERROR', message: error.message || 'Failed to list businesses.' }
    });
  }
});

/**
 * PATCH /api/admin/businesses/:id/status
 * Suspend or reactivate a business
 */
router.patch('/businesses/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Status must be active, suspended, or cancelled.' }
      });
    }

    const business = await adminRepository.updateBusinessStatus(id, status);

    return res.json({
      success: true,
      data: {
        business,
        message: `Business ${business.name} is now ${status}.`
      }
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'UPDATE_FAILED', message: error.message || 'Failed to update business status.' }
    });
  }
});

/**
 * GET /api/admin/platform/settings
 * Retrieve platform governance settings (e.g. affiliate visibility)
 */
router.get('/platform/settings', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = await adminRepository.getPlatformSettings();
    return res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'SETTINGS_ERROR', message: error.message || 'Failed to load platform settings.' }
    });
  }
});

/**
 * PUT /api/admin/platform/settings
 * Update platform governance settings (e.g. toggle affiliate button visibility)
 */
router.put('/platform/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    const updated = await adminRepository.updatePlatformSettings(updates);
    return res.json({
      success: true,
      data: updated,
      message: 'Platform settings updated successfully.'
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'UPDATE_FAILED', message: error.message || 'Failed to update platform settings.' }
    });
  }
});

/**
 * GET /api/admin/plans
 * Retrieve all subscription plans with status for admin management
 */
router.get('/plans', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const plans = await adminRepository.getAllSubscriptionPlans();
    return res.json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'PLANS_ERROR', message: error.message || 'Failed to list subscription plans.' }
    });
  }
});

/**
 * PATCH /api/admin/plans/:id/status
 * Toggle a subscription plan's availability for merchants
 */
router.patch('/plans/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
      return res.status(400).json({ success: false, error: { message: 'is_active boolean required.' } });
    }

    const updated = await adminRepository.updateSubscriptionPlan(id, { is_active: Boolean(is_active) });

    return res.json({
      success: true,
      data: updated,
      message: `Subscription plan '${updated.name}' is now ${is_active ? 'available' : 'disabled'} for merchants.`
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'PLAN_UPDATE_FAILED', message: error.message || 'Failed to update plan status.' }
    });
  }
});

/**
 * PUT /api/admin/plans/:id
 * Update subscription plan details (pricing, limits, description, features)
 */
router.put('/plans/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price_monthly, max_products, can_checkout, remove_branding, custom_domain, advanced_analytics, is_active } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price_monthly !== undefined) updates.price_monthly = Number(price_monthly);
    if (max_products !== undefined) updates.max_products = Number(max_products);
    if (can_checkout !== undefined) updates.can_checkout = Boolean(can_checkout);
    if (remove_branding !== undefined) updates.remove_branding = Boolean(remove_branding);
    if (custom_domain !== undefined) updates.custom_domain = Boolean(custom_domain);
    if (advanced_analytics !== undefined) updates.advanced_analytics = Boolean(advanced_analytics);
    if (is_active !== undefined) updates.is_active = Boolean(is_active);

    const updated = await adminRepository.updateSubscriptionPlan(id, updates);

    return res.json({
      success: true,
      data: updated,
      message: `Plan '${updated.name}' updated successfully.`
    });
  } catch (error: any) {
    return res.status(error.statusCode || 500).json({
      success: false,
      error: { code: error.code || 'PLAN_UPDATE_FAILED', message: error.message || 'Failed to update plan details.' }
    });
  }
});

export default router;
