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
router.get('/validate-code/:code', (req: Request, res: Response) => {
  const code = req.params.code;
  const validation = affiliateService.validateReferralCode(code);

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
    const protocol = req.protocol;
    const host = req.get('host') || 'localhost:3000';
    const appUrl = `${protocol}://${host}`;

    const dashboard = await affiliateService.getAffiliateDashboard(userId, appUrl);
    return res.json({ success: true, data: dashboard });
  } catch (err: any) {
    console.error('[Affiliate Dashboard Error]:', err);
    return res.status(500).json({ success: false, error: { message: err.message || 'Internal server error' } });
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
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

/**
 * GET /api/affiliate/notifications
 * In-app notification feed for the affiliate
 */
router.get('/notifications', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const notifs = notificationService.getUserNotifications(req.user!.id);
  return res.json({ success: true, data: notifs });
});

/**
 * PATCH /api/affiliate/notifications/:id/read
 */
router.patch('/notifications/:id/read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = notificationService.markAsRead(req.params.id, req.user!.id);
  return res.json({ success });
});

/**
 * POST /api/affiliate/notifications/mark-all-read
 */
router.post('/notifications/mark-all-read', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const count = notificationService.markAllAsRead(req.user!.id);
  return res.json({ success: true, count });
});

// ==========================================
// ADMIN MANAGEMENT ENDPOINTS
// ==========================================

/**
 * GET /api/admin/affiliates
 */
router.get('/admin/affiliates', requireAuth, requirePlatformAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const affiliates = affiliateService.adminGetAllAffiliates();
  return res.json({ success: true, data: affiliates });
});

/**
 * GET /api/admin/referrals
 */
router.get('/admin/referrals', requireAuth, requirePlatformAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const referrals = affiliateService.adminGetAllReferrals();
  return res.json({ success: true, data: referrals });
});

/**
 * GET /api/admin/commissions
 */
router.get('/admin/commissions', requireAuth, requirePlatformAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const commissions = affiliateService.adminGetAllCommissions();
  return res.json({ success: true, data: commissions });
});

/**
 * GET /api/admin/payouts
 */
router.get('/admin/payouts', requireAuth, requirePlatformAdmin, (_req: AuthenticatedRequest, res: Response) => {
  const payouts = affiliateService.adminGetAllPayouts();
  return res.json({ success: true, data: payouts });
});

/**
 * PATCH /api/admin/affiliates/:id/status
 */
router.patch('/admin/affiliates/:id/status', requireAuth, requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { status } = req.body;
  if (status !== 'active' && status !== 'suspended') {
    return res.status(400).json({ success: false, error: { message: 'Status must be active or suspended.' } });
  }

  try {
    const updated = affiliateService.adminSetAffiliateStatus(req.params.id, status);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/admin/referrals/:id/fraud
 */
router.patch('/admin/referrals/:id/fraud', requireAuth, requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  try {
    const updated = affiliateService.adminMarkReferralFraudulent(req.params.id, reason || 'Flagged by Administrator');
    return res.json({ success: true, data: updated, message: 'Referral marked as fraudulent and pending commission cancelled.' });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});

/**
 * PATCH /api/admin/commissions/:id/cancel
 */
router.patch('/admin/commissions/:id/cancel', requireAuth, requirePlatformAdmin, (req: AuthenticatedRequest, res: Response) => {
  const { reason } = req.body;
  try {
    const updated = affiliateService.adminCancelCommission(req.params.id, reason || 'Cancelled by Administrator');
    return res.json({ success: true, data: updated, message: 'Commission successfully cancelled/reversed.' });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
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
      message: 'Payout recorded and commissions updated to paid.'
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

export default router;
