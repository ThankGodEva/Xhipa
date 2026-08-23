import crypto from 'crypto';
import { db } from '../data/store';
import {
  Affiliate,
  AffiliateClick,
  AffiliateCommission,
  AffiliateDashboardStats,
  AffiliatePayout,
  AffiliatePayoutDetails,
  AffiliateReferral,
  AffiliateStatus
} from '../../src/types';
import { notificationService } from './notification.service';

const INITIAL_COMMISSION_AMOUNT = 80000; // ₦800 NGN in Kobo
const DEFAULT_HOLDING_DAYS = 7; // 7 days holding period before commissions become eligible
const ATTRIBUTION_WINDOW_DAYS = 30; // 30 days attribution window

export class AffiliateService {
  /**
   * Helper to generate privacy-conscious anonymous identifier from IP + UserAgent
   */
  private generateAnonymousIdentifier(ip?: string, userAgent?: string): string {
    const raw = `${ip || '127.0.0.1'}_${userAgent || 'browser'}_salt_stf_2026`;
    return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 24);
  }

  /**
   * Generate a unique, clean uppercase affiliate code e.g. STF-CHIO42
   */
  generateAffiliateCode(seedName: string = 'PARTNER'): string {
    const cleanSeed = seedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6) || 'PARTNER';
    const randomDigits = Math.floor(10 + Math.random() * 90);
    let code = `STF-${cleanSeed}${randomDigits}`;
    let counter = 1;

    while (Array.from(db.affiliates.values()).some(a => a.affiliate_code === code)) {
      code = `STF-${cleanSeed}${randomDigits}${counter++}`;
    }
    return code;
  }

  /**
   * Enrolls a user into the affiliate program or retrieves their existing affiliate profile
   */
  async getOrCreateAffiliate(userId: string): Promise<Affiliate> {
    let affiliate = Array.from(db.affiliates.values()).find(a => a.user_id === userId);
    if (affiliate) {
      return affiliate;
    }

    const profile = db.profiles.get(userId);
    const firstName = profile?.full_name?.split(' ')[0] || 'PARTNER';
    const affiliateCode = this.generateAffiliateCode(firstName);

    affiliate = {
      id: `aff_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId,
      affiliate_code: affiliateCode,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.affiliates.set(affiliate.id, affiliate);

    // In-app notification on enrollment
    await notificationService.notify({
      userId,
      type: 'general',
      title: '🎉 Affiliate Program Enrolled',
      message: `Welcome to the Xhipa Affiliate Program! Your unique referral code is ${affiliateCode}. Earn ₦800 for every business that upgrades to a paid plan.`
    });

    return affiliate;
  }

  /**
   * Find affiliate by user ID
   */
  getAffiliateByUserId(userId: string): Affiliate | undefined {
    return Array.from(db.affiliates.values()).find(a => a.user_id === userId);
  }

  /**
   * Find affiliate by referral code
   */
  getAffiliateByCode(code: string): Affiliate | undefined {
    if (!code) return undefined;
    const cleanCode = code.trim().toUpperCase();
    return Array.from(db.affiliates.values()).find(a => a.affiliate_code.toUpperCase() === cleanCode);
  }

  /**
   * Validate a referral code and return affiliate info
   */
  validateReferralCode(code: string): { valid: boolean; code?: string; affiliate_id?: string; error?: string } {
    if (!code) {
      return { valid: false, error: 'Referral code is required.' };
    }
    const affiliate = this.getAffiliateByCode(code);
    if (!affiliate) {
      return { valid: false, error: 'Invalid referral code.' };
    }
    if (affiliate.status !== 'active') {
      return { valid: false, error: 'This affiliate link is currently inactive.' };
    }
    return {
      valid: true,
      code: affiliate.affiliate_code,
      affiliate_id: affiliate.id
    };
  }

  /**
   * Record a click from a referral link
   */
  async recordClick(params: {
    code: string;
    ip?: string;
    userAgent?: string;
    landingPage?: string;
  }): Promise<{ success: boolean; affiliate_code?: string; error?: string }> {
    const affiliate = this.getAffiliateByCode(params.code);
    if (!affiliate || affiliate.status !== 'active') {
      return { success: false, error: 'Invalid or inactive referral code.' };
    }

    const anonId = this.generateAnonymousIdentifier(params.ip, params.userAgent);

    const click: AffiliateClick = {
      id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      affiliate_id: affiliate.id,
      referral_code: affiliate.affiliate_code,
      anonymous_identifier: anonId,
      landing_page: params.landingPage || '/register',
      created_at: new Date().toISOString()
    };

    db.affiliateClicks.set(click.id, click);
    return { success: true, affiliate_code: affiliate.affiliate_code };
  }

  /**
   * Creates authoritative referral relationship on user registration / onboarding
   * Server validates code, checks self-referral, enforces first-touch and uniqueness constraints.
   */
  async attributeReferralOnSignup(params: {
    referralCode?: string;
    referredUserId: string;
    businessId: string;
    userEmail: string;
    userPhone?: string;
    ip?: string;
    userAgent?: string;
  }): Promise<AffiliateReferral | null> {
    if (!params.referralCode) {
      return null;
    }

    const affiliate = this.getAffiliateByCode(params.referralCode);
    if (!affiliate || affiliate.status !== 'active') {
      return null;
    }

    // 1. Check Self-Referral Protection
    if (affiliate.user_id === params.referredUserId) {
      console.warn(`[Affiliate] Self-referral attempt blocked for user ${params.referredUserId}`);
      return null;
    }

    const affiliateProfile = db.profiles.get(affiliate.user_id);
    if (affiliateProfile) {
      if (affiliateProfile.email.toLowerCase() === params.userEmail.toLowerCase()) {
        console.warn(`[Affiliate] Self-referral by email blocked for ${params.userEmail}`);
        return null;
      }
    }

    const affiliateBusinessMembers = Array.from(db.businessMembers.values()).filter(bm => bm.user_id === affiliate.user_id);
    if (affiliateBusinessMembers.some(bm => bm.business_id === params.businessId)) {
      console.warn(`[Affiliate] Self-referral for owned business blocked for business ${params.businessId}`);
      return null;
    }

    // 2. Enforce Database Constraint: A referred user / business can ONLY be attributed once (first-touch permanent attribution)
    const existingReferral = Array.from(db.affiliateReferrals.values()).find(
      r => r.referred_user_id === params.referredUserId || r.business_id === params.businessId
    );
    if (existingReferral) {
      console.log(`[Affiliate] User/Business already attributed to referral ${existingReferral.id}`);
      return existingReferral;
    }

    // 3. Basic Fraud Detection Signals
    const anonId = this.generateAnonymousIdentifier(params.ip, params.userAgent);
    const recentClicksFromSameAnon = Array.from(db.affiliateClicks.values()).filter(
      c => c.anonymous_identifier === anonId && Date.now() - new Date(c.created_at).getTime() < 30 * 60 * 1000
    );

    let fraudStatus: 'normal' | 'suspicious' | 'fraudulent' = 'normal';
    let fraudScore = 0;
    const fraudReasons: string[] = [];

    if (recentClicksFromSameAnon.length > 20) {
      fraudStatus = 'suspicious';
      fraudScore += 50;
      fraudReasons.push('Rapid repeated registrations from identical fingerprint');
    }

    // 4. Create authoritative affiliate referral record
    const referral: AffiliateReferral = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      affiliate_id: affiliate.id,
      referred_user_id: params.referredUserId,
      business_id: params.businessId,
      status: 'signed_up',
      fraud_status: fraudStatus,
      fraud_score: fraudScore,
      fraud_reasons: fraudReasons,
      attributed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.affiliateReferrals.set(referral.id, referral);

    // 5. Notify Affiliate of new referral
    const biz = db.businesses.get(params.businessId);
    const bizName = biz?.name || 'A new merchant';

    await notificationService.notify({
      userId: affiliate.user_id,
      type: 'affiliate_signup',
      title: '🎉 New Referral Signup!',
      message: `🎉 New referral! ${bizName} just created a Xhipa account using your referral link.`,
      data: { referralId: referral.id, businessId: params.businessId }
    });

    return referral;
  }

  /**
   * Handle first successful paid subscription upgrade.
   * Atomically and idempotently creates the ₦800 commission.
   */
  async handleFirstPaidSubscription(businessId: string): Promise<AffiliateCommission | null> {
    const business = db.businesses.get(businessId);
    if (!business) return null;

    const subscription = db.subscriptions.get(businessId);
    if (!subscription || subscription.status !== 'active') {
      return null;
    }

    // Free plan produces NO commission
    if (subscription.plan_id === 'free') {
      return null;
    }

    // Find referral associated with this business
    const referral = Array.from(db.affiliateReferrals.values()).find(
      r => r.business_id === businessId && r.status !== 'fraudulent' && r.status !== 'cancelled'
    );
    if (!referral) {
      return null;
    }

    // Check if affiliate is active
    const affiliate = db.affiliates.get(referral.affiliate_id);
    if (!affiliate || affiliate.status !== 'active') {
      console.warn(`[Affiliate] Affiliate ${referral.affiliate_id} is inactive or not found.`);
      return null;
    }

    // Idempotency: Verify NO previous commission exists for this referral
    const existingCommission = Array.from(db.affiliateCommissions.values()).find(
      c => c.referral_id === referral.id
    );
    if (existingCommission) {
      console.log(`[Affiliate] Commission already exists for referral ${referral.id}: ${existingCommission.id}`);
      return existingCommission;
    }

    // Atomically update referral status to converted
    referral.status = 'converted';
    referral.converted_at = new Date().toISOString();
    referral.updated_at = new Date().toISOString();
    db.affiliateReferrals.set(referral.id, referral);

    // Calculate eligible_at based on configurable holding period (7 days)
    const eligibleAt = new Date(Date.now() + DEFAULT_HOLDING_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const commission: AffiliateCommission = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      affiliate_id: affiliate.id,
      referral_id: referral.id,
      amount: INITIAL_COMMISSION_AMOUNT, // ₦800 in kobo
      currency: 'NGN',
      status: 'pending',
      trigger: 'first_successful_paid_subscription',
      eligible_at: eligibleAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.affiliateCommissions.set(commission.id, commission);

    // Notify Affiliate of earned commission
    await notificationService.notify({
      userId: affiliate.user_id,
      type: 'commission_earned',
      title: '💰 Commission Earned (₦800)',
      message: `💰 You just earned ₦800! ${business.name} upgraded to a paid Xhipa plan.`,
      data: {
        referralId: referral.id,
        commissionId: commission.id,
        amount: INITIAL_COMMISSION_AMOUNT,
        businessName: business.name
      }
    });

    return commission;
  }

  /**
   * Scans and matures pending commissions that have passed their 7-day holding period to 'eligible'
   */
  checkAndUpdateEligibleCommissions(): number {
    const now = Date.now();
    let updatedCount = 0;

    for (const commission of db.affiliateCommissions.values()) {
      if (commission.status === 'pending' && new Date(commission.eligible_at).getTime() <= now) {
        commission.status = 'eligible';
        commission.updated_at = new Date().toISOString();
        db.affiliateCommissions.set(commission.id, commission);
        updatedCount++;

        const affiliate = db.affiliates.get(commission.affiliate_id);
        if (affiliate) {
          notificationService.notify({
            userId: affiliate.user_id,
            type: 'commission_eligible',
            title: '✅ Commission Now Eligible for Payout',
            message: `Your commission of ₦${(commission.amount / 100).toLocaleString()} has cleared the 7-day holding period and is now eligible for payout!`
          });
        }
      }
    }
    return updatedCount;
  }

  /**
   * Retrieves complete Affiliate Dashboard statistics and collections for an affiliate user
   */
  async getAffiliateDashboard(userId: string, appUrl: string): Promise<AffiliateDashboardStats> {
    const affiliate = await this.getOrCreateAffiliate(userId);
    this.checkAndUpdateEligibleCommissions();

    const referralUrl = `${appUrl}/register?ref=${affiliate.affiliate_code}`;

    const clicks = Array.from(db.affiliateClicks.values()).filter(c => c.affiliate_id === affiliate.id);
    const referrals = Array.from(db.affiliateReferrals.values()).filter(r => r.affiliate_id === affiliate.id);
    const commissions = Array.from(db.affiliateCommissions.values()).filter(c => c.affiliate_id === affiliate.id);
    const payouts = Array.from(db.affiliatePayouts.values()).filter(p => p.affiliate_id === affiliate.id);

    // Compute financial totals
    const pendingCommission = commissions
      .filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.amount, 0);

    const eligibleCommission = commissions
      .filter(c => c.status === 'eligible')
      .reduce((sum, c) => sum + c.amount, 0);

    const paidCommission = commissions
      .filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);

    const totalEarned = commissions
      .filter(c => c.status === 'pending' || c.status === 'eligible' || c.status === 'paid')
      .reduce((sum, c) => sum + c.amount, 0);

    // Enrich referrals with business and plan metadata
    const enrichedReferrals: AffiliateReferral[] = referrals.map(r => {
      const biz = db.businesses.get(r.business_id);
      const sub = db.subscriptions.get(r.business_id);
      const plan = sub ? db.subscriptionPlans.get(sub.plan_id) : db.subscriptionPlans.get('free');
      const refUser = db.profiles.get(r.referred_user_id);
      const comm = commissions.find(c => c.referral_id === r.id);

      return {
        ...r,
        business_name: biz?.name || 'Xhipa Merchant',
        business_slug: biz?.slug,
        referred_user_name: refUser?.full_name,
        referred_user_email: refUser?.email,
        current_plan: plan?.name || 'Free Plan',
        commission_amount: comm?.amount,
        commission_status: comm?.status
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Enrich commissions with business metadata
    const enrichedCommissions: AffiliateCommission[] = commissions.map(c => {
      const ref = db.affiliateReferrals.get(c.referral_id);
      const biz = ref ? db.businesses.get(ref.business_id) : undefined;
      return {
        ...c,
        business_name: biz?.name || 'Referred Business'
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      affiliate,
      referral_url: referralUrl,
      total_clicks: clicks.length,
      total_signups: referrals.length,
      total_converted: referrals.filter(r => r.status === 'converted').length,
      pending_commission: pendingCommission,
      eligible_commission: eligibleCommission,
      paid_commission: paidCommission,
      total_earned: totalEarned,
      recent_referrals: enrichedReferrals,
      commissions: enrichedCommissions,
      payouts: payouts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    };
  }

  /**
   * Updates bank payout details for an affiliate
   */
  async updatePayoutDetails(userId: string, details: AffiliatePayoutDetails): Promise<Affiliate> {
    const affiliate = await this.getOrCreateAffiliate(userId);
    affiliate.payout_details = details;
    affiliate.updated_at = new Date().toISOString();
    db.affiliates.set(affiliate.id, affiliate);
    return affiliate;
  }

  // ==========================================
  // ADMIN OPERATIONS
  // ==========================================

  adminGetAllAffiliates() {
    return Array.from(db.affiliates.values()).map(a => {
      const user = db.profiles.get(a.user_id);
      const clicks = Array.from(db.affiliateClicks.values()).filter(c => c.affiliate_id === a.id).length;
      const referrals = Array.from(db.affiliateReferrals.values()).filter(r => r.affiliate_id === a.id);
      const commissions = Array.from(db.affiliateCommissions.values()).filter(c => c.affiliate_id === a.id);

      const totalEarned = commissions
        .filter(c => c.status !== 'cancelled' && c.status !== 'reversed')
        .reduce((sum, c) => sum + c.amount, 0);

      const eligibleAmount = commissions
        .filter(c => c.status === 'eligible')
        .reduce((sum, c) => sum + c.amount, 0);

      const paidAmount = commissions
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + c.amount, 0);

      return {
        ...a,
        user_name: user?.full_name || 'N/A',
        user_email: user?.email || 'N/A',
        clicks_count: clicks,
        signups_count: referrals.length,
        conversions_count: referrals.filter(r => r.status === 'converted').length,
        total_earned: totalEarned,
        eligible_amount: eligibleAmount,
        paid_amount: paidAmount
      };
    });
  }

  adminGetAllReferrals() {
    return Array.from(db.affiliateReferrals.values()).map(r => {
      const aff = db.affiliates.get(r.affiliate_id);
      const affUser = aff ? db.profiles.get(aff.user_id) : null;
      const refUser = db.profiles.get(r.referred_user_id);
      const biz = db.businesses.get(r.business_id);
      const sub = db.subscriptions.get(r.business_id);
      const plan = sub ? db.subscriptionPlans.get(sub.plan_id) : db.subscriptionPlans.get('free');
      const commission = Array.from(db.affiliateCommissions.values()).find(c => c.referral_id === r.id);

      return {
        ...r,
        affiliate_code: aff?.affiliate_code || 'N/A',
        affiliate_name: affUser?.full_name || 'N/A',
        referred_name: refUser?.full_name || 'N/A',
        referred_email: refUser?.email || 'N/A',
        business_name: biz?.name || 'N/A',
        current_plan: plan?.name || 'Free Plan',
        commission_id: commission?.id,
        commission_amount: commission?.amount,
        commission_status: commission?.status
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  adminGetAllCommissions() {
    return Array.from(db.affiliateCommissions.values()).map(c => {
      const aff = db.affiliates.get(c.affiliate_id);
      const affUser = aff ? db.profiles.get(aff.user_id) : null;
      const ref = db.affiliateReferrals.get(c.referral_id);
      const biz = ref ? db.businesses.get(ref.business_id) : null;

      return {
        ...c,
        affiliate_code: aff?.affiliate_code,
        affiliate_name: affUser?.full_name,
        affiliate_email: affUser?.email,
        business_name: biz?.name || 'N/A'
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  adminGetAllPayouts() {
    return Array.from(db.affiliatePayouts.values()).map(p => {
      const aff = db.affiliates.get(p.affiliate_id);
      const affUser = aff ? db.profiles.get(aff.user_id) : null;
      return {
        ...p,
        affiliate_code: aff?.affiliate_code,
        affiliate_user_name: affUser?.full_name,
        affiliate_user_email: affUser?.email,
        payout_details: aff?.payout_details
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  adminSetAffiliateStatus(affiliateId: string, status: AffiliateStatus): Affiliate {
    const affiliate = db.affiliates.get(affiliateId);
    if (!affiliate) throw new Error('Affiliate not found.');
    affiliate.status = status;
    affiliate.updated_at = new Date().toISOString();
    db.affiliates.set(affiliate.id, affiliate);
    return affiliate;
  }

  adminMarkReferralFraudulent(referralId: string, reason: string) {
    const referral = db.affiliateReferrals.get(referralId);
    if (!referral) throw new Error('Referral not found.');
    referral.status = 'fraudulent';
    referral.fraud_status = 'fraudulent';
    referral.fraud_reasons = [...(referral.fraud_reasons || []), reason];
    referral.updated_at = new Date().toISOString();
    db.affiliateReferrals.set(referral.id, referral);

    // Cancel any associated commission
    const commission = Array.from(db.affiliateCommissions.values()).find(c => c.referral_id === referral.id);
    if (commission && commission.status !== 'paid') {
      commission.status = 'cancelled';
      commission.cancellation_reason = `Fraudulent referral: ${reason}`;
      commission.updated_at = new Date().toISOString();
      db.affiliateCommissions.set(commission.id, commission);
    }
    return referral;
  }

  adminCancelCommission(commissionId: string, reason: string) {
    const commission = db.affiliateCommissions.get(commissionId);
    if (!commission) throw new Error('Commission not found.');
    if (commission.status === 'paid') {
      commission.status = 'reversed';
      commission.cancellation_reason = `Reversed: ${reason}`;
    } else {
      commission.status = 'cancelled';
      commission.cancellation_reason = reason;
    }
    commission.updated_at = new Date().toISOString();
    db.affiliateCommissions.set(commission.id, commission);
    return commission;
  }

  async adminRecordPayout(params: {
    affiliateId: string;
    paymentReference: string;
    commissionIds: string[];
    notes?: string;
  }): Promise<AffiliatePayout> {
    const affiliate = db.affiliates.get(params.affiliateId);
    if (!affiliate) throw new Error('Affiliate not found.');

    const targetCommissions = params.commissionIds
      .map(id => db.affiliateCommissions.get(id))
      .filter((c): c is AffiliateCommission => !!c && c.affiliate_id === affiliate.id && c.status === 'eligible');

    if (targetCommissions.length === 0) {
      throw new Error('No eligible commissions found for payout.');
    }

    const totalAmount = targetCommissions.reduce((sum, c) => sum + c.amount, 0);

    const payout: AffiliatePayout = {
      id: `payout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      affiliate_id: affiliate.id,
      amount: totalAmount,
      currency: 'NGN',
      status: 'paid',
      payment_reference: params.paymentReference,
      commission_ids: targetCommissions.map(c => c.id),
      notes: params.notes,
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.affiliatePayouts.set(payout.id, payout);

    // Atomically mark each commission as paid
    const nowIso = new Date().toISOString();
    for (const comm of targetCommissions) {
      comm.status = 'paid';
      comm.paid_at = nowIso;
      comm.updated_at = nowIso;
      db.affiliateCommissions.set(comm.id, comm);
    }

    // Notify affiliate of completed payout
    await notificationService.notify({
      userId: affiliate.user_id,
      type: 'payout_completed',
      title: '💸 Payout Processed',
      message: `💸 Payout of ₦${(totalAmount / 100).toLocaleString()} has been processed to your bank account! Ref: ${params.paymentReference}`,
      data: { payoutId: payout.id, amount: totalAmount, reference: params.paymentReference }
    });

    return payout;
  }
}

export const affiliateService = new AffiliateService();
