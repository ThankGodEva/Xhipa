import { Router, Request, Response } from 'express';
import { affiliateService } from '../services/affiliate.service';
import { notificationService } from '../services/notification.service';
import { AuthenticatedRequest, requirePlatformAdmin, requireAuth } from '../middleware/auth';

const router = Router();

// ==========================================
// PUBLIC / CLIENT-SIDE ATTRIBUTION ENDPOINTS
// ==========================================

/**
 * GET /api/affiliate/track-click
 * Records a referral click anonymously and validates referral code
 */
router.get('/track-click', async (req: Request, res: Response) => {
  const refCode = req.query.ref as string;
  const landingPage = (req.query.page as string) || '/register';

  if (!refCode) {
    return res.status(400).json({ success: false, error: { message: 'Referral code is required.' } });
  }

  const result = await affiliateService.recordClick({
    code: refCode,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    landingPage
  });

  if (!result.success) {
    return res.status(404).json({ success: false, error: { message: result.error } });
  }

  return res.json({
    success: true,
    data: {
      affiliate_code: result.affiliate_code,
      message: 'Referral touch recorded.'
    }
  });
});

/**
 * GET /api/affiliate/validate-code/:code
 * Publicly verifies if a referral code exists and is active
 */
router.get('/validate-code/:code', async (req: Request, res: Response) => {
  const code = req.params.code;
  const validation = await affiliateService.validateReferralCode(code);

  if (!validation.valid) {
    return res.status(404).json({ success: false, error: { message: validation.error } });
  }

  return res.json({
    success: true,
    data: {
      valid: true,
      code: validation.code
    }
  });
});

// ==========================================
// AUTHENTICATED AFFILIATE USER ENDPOINTS
// ==========================================

/**
 * GET /api/affiliate/dashboard
 * Retrieves comprehensive affiliate metrics, referral link, referral history, commissions, and payouts
 */
router.get('/dashboard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
    const appUrl = `${protocol}://${host}`;

    const dashboard = await affiliateService.getAffiliateDashboard(userId, appUrl);
    return res.json({ success: true, data: dashboard });
  } catch (err: any) {
    console.error('[Affiliate Dashboard Error]:', err);
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message || 'Internal server error' } });
  }
});

/**
 * PUT /api/affiliate/payout-details
 * Updates bank account info for receiving payout disbursements
 */
router.put('/payout-details', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { bank_name, account_number, account_name, bank_code } = req.body;

    if (!bank_name || !account_number || !account_name) {
      return res.status(400).json({
        success: false,
        error: { message: 'Bank name, account number, and account name are required.' }
      });
    }

    const updated = await affiliateService.updatePayoutDetails(req.user!.id, {
      bank_name: bank_name.trim(),
      account_number: account_number.trim(),
      account_name: account_name.trim(),
      bank_code: bank_code ? bank_code.trim() : undefined
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Bank payout details updated successfully.'
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/affiliate/notifications
 * In-app notification feed for the affiliate
 */
router.get('/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notifs = await notificationService.getUserNotifications(req.user!.id);
    return res.json({ success: true, data: notifs });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/affiliate/notifications/:id/read
 */
router.patch('/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = await notificationService.markAsRead(req.params.id, req.user!.id);
    return res.json({ success });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * POST /api/affiliate/notifications/mark-all-read
 */
router.post('/notifications/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await notificationService.markAllAsRead(req.user!.id);
    return res.json({ success: true, count });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

// ==========================================
// ADMIN MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/admin/affiliates
 */
router.get('/admin/affiliates', requireAuth, requirePlatformAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const affiliates = await affiliateService.adminGetAllAffiliates();
    return res.json({ success: true, data: affiliates });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/admin/referrals
 */
router.get('/admin/referrals', requireAuth, requirePlatformAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const referrals = await affiliateService.adminGetAllReferrals();
    return res.json({ success: true, data: referrals });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/admin/commissions
 */
router.get('/admin/commissions', requireAuth, requirePlatformAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const commissions = await affiliateService.adminGetAllCommissions();
    return res.json({ success: true, data: commissions });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/admin/payouts
 */
router.get('/admin/payouts', requireAuth, requirePlatformAdmin, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const payouts = await affiliateService.adminGetAllPayouts();
    return res.json({ success: true, data: payouts });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/admin/affiliates/:id/status
 */
router.patch('/admin/affiliates/:id/status', requireAuth, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ success: false, error: { message: 'Status must be active or suspended.' } });
  }

  try {
    const updated = await affiliateService.adminSetAffiliateStatus(req.params.id, status);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(err.statusCode || 404).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/admin/referrals/:id/fraud
 */
router.patch('/admin/referrals/:id/fraud', requireAuth, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  try {
    const updated = await affiliateService.adminMarkReferralFraudulent(req.params.id, reason || 'Flagged by Administrator');
    return res.json({ success: true, data: updated, message: 'Referral marked as fraudulent and pending commission cancelled.' });
  } catch (err: any) {
    return res.status(err.statusCode || 404).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/admin/commissions/:id/cancel
 */
router.patch('/admin/commissions/:id/cancel', requireAuth, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  try {
    const updated = await affiliateService.adminCancelCommission(req.params.id, reason || 'Cancelled by Administrator');
    return res.json({ success: true, data: updated, message: 'Commission successfully cancelled/reversed.' });
  } catch (err: any) {
    return res.status(err.statusCode || 404).json({ success: false, error: { message: err.message } });
  }
});

/**
 * POST /api/admin/payouts/process
 */
router.post('/admin/payouts/process', requireAuth, requirePlatformAdmin, async (req: AuthenticatedRequest, res: Response) => {
  const { affiliateId, paymentReference, commissionIds, notes } = req.body;

  if (!affiliateId || !paymentReference || !commissionIds || !commissionIds.length) {
    return res.status(400).json({
      success: false,
      error: { message: 'Affiliate ID, payment reference, and commission IDs are required.' }
    });
  }

  try {
    const payout = await affiliateService.adminRecordPayout({
      affiliateId,
      paymentReference,
      commissionIds,
      notes
    });

    return res.json({
      success: true,
      data: payout,
      message: 'Payout recorded and associated commissions marked as paid.'
    });
  } catch (err: any) {
    return res.status(err.statusCode || 500).json({ success: false, error: { message: err.message } });
  }
});

export default router;
