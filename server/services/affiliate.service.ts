import { computeSha256Sync } from '../lib/crypto';
import { affiliateRepository } from '../repositories/affiliate.repository';
import { merchantRepository } from '../repositories/merchant.repository';
import { notificationService } from './notification.service';
import { getRequiredSupabase } from '../lib/supabase';
import {
  Affiliate,
  AffiliateCommission,
  AffiliateDashboardStats,
  AffiliatePayout,
  AffiliatePayoutDetails,
  AffiliateReferral,
  AffiliateStatus
} from '../../src/types';

const INITIAL_COMMISSION_AMOUNT = 80000; // ₦800.00 in Kobo

export class AffiliateService {
  /**
   * Generates a stable anonymous hash for click attribution
   */
  private generateAnonymousIdentifier(ip?: string, userAgent?: string): string {
    const raw = `${ip || 'unknown_ip'}-${userAgent || 'unknown_agent'}`;
    return computeSha256Sync(raw).substring(0, 32);
  }

  /**
   * Generate a unique, clean uppercase affiliate code e.g. STF-CHIO42
   */
  generateAffiliateCode(seedName: string = 'PARTNER'): string {
    const cleanSeed = seedName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6) || 'PARTNER';
    const randomDigits = Math.floor(10 + Math.random() * 90);
    return `STF-${cleanSeed}${randomDigits}`;
  }

  /**
   * Enrolls a user into the affiliate program or retrieves their existing affiliate profile
   */
  async getOrCreateAffiliate(userId: string): Promise<Affiliate> {
    let affiliate = await affiliateRepository.getAffiliateByUserId(userId);
    if (affiliate) {
      return affiliate;
    }

    const supabase = getRequiredSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const firstName = profile?.full_name?.split(' ')[0] || 'PARTNER';
    const affiliateCode = this.generateAffiliateCode(firstName);

    affiliate = await affiliateRepository.createAffiliate(userId, affiliateCode);

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
  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    return affiliateRepository.getAffiliateByUserId(userId);
  }

  /**
   * Find affiliate by referral code
   */
  async getAffiliateByCode(code: string): Promise<Affiliate | null> {
    return affiliateRepository.getAffiliateByCode(code);
  }

  /**
   * Validate a referral code and return affiliate info
   */
  async validateReferralCode(code: string): Promise<{ valid: boolean; code?: string; affiliate_id?: string; error?: string }> {
    if (!code) {
      return { valid: false, error: 'Referral code is required.' };
    }
    const affiliate = await this.getAffiliateByCode(code);
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
    const affiliate = await this.getAffiliateByCode(params.code);
    if (!affiliate || affiliate.status !== 'active') {
      return { success: false, error: 'Invalid or inactive referral code.' };
    }

    const anonId = this.generateAnonymousIdentifier(params.ip, params.userAgent);

    await affiliateRepository.recordClick({
      affiliateId: affiliate.id,
      referralCode: affiliate.affiliate_code,
      anonymousIdentifier: anonId,
      landingPage: params.landingPage || '/register'
    });

    return { success: true, affiliate_code: affiliate.affiliate_code };
  }

  /**
   * Creates authoritative referral relationship on user registration / onboarding
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

    const affiliate = await this.getAffiliateByCode(params.referralCode);
    if (!affiliate || affiliate.status !== 'active') {
      return null;
    }

    // 1. Check Self-Referral Protection
    if (affiliate.user_id === params.referredUserId) {
      console.warn(`[Affiliate] Self-referral attempt blocked for user ${params.referredUserId}`);
      return null;
    }

    // 2. Enforce Database Constraint: Check existing referral for this business
    const existingReferral = await affiliateRepository.getReferralByBusinessId(params.businessId);
    if (existingReferral) {
      return existingReferral;
    }

    // 3. Create authoritative affiliate referral record
    const referral = await affiliateRepository.createReferral({
      affiliateId: affiliate.id,
      referredUserId: params.referredUserId,
      businessId: params.businessId,
      status: 'signed_up'
    });

    // 4. Notify Affiliate of new referral
    const biz = await merchantRepository.getBusinessById(params.businessId);
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
   * Requirement 7.8:
   * - triggered ONLY upon first successful paid subscription upgrade
   * - idempotent
   * - creates an affiliate commission ledger entry
   * - never runs on free tier registration alone
   * - never awards duplicate bonuses for renewal payments
   */
  async handleFirstPaidSubscription(businessId: string): Promise<AffiliateCommission | null> {
    const business = await merchantRepository.getBusinessById(businessId);
    if (!business) return null;

    // Find referral associated with this business
    const referral = await affiliateRepository.getReferralByBusinessId(businessId);
    if (!referral) {
      return null;
    }

    // Check if referral was already converted or has an existing commission
    const existingCommission = await affiliateRepository.getCommissionByReferralId(referral.id);
    if (existingCommission) {
      // Idempotency: commission already created for this referral
      return existingCommission;
    }

    // Check if affiliate is active
    const affiliate = await affiliateRepository.getAffiliateById(referral.affiliate_id);
    if (!affiliate || affiliate.status !== 'active') {
      return null;
    }

    // Mark referral as converted
    const now = new Date().toISOString();
    await affiliateRepository.updateReferral(referral.id, {
      status: 'converted',
      converted_at: now
    });

    // Create commission
    const commission = await affiliateRepository.createCommission({
      affiliateId: affiliate.id,
      referralId: referral.id,
      amount: INITIAL_COMMISSION_AMOUNT,
      currency: 'NGN',
      trigger: 'first_successful_paid_subscription'
    });

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
   * Retrieves complete Affiliate Dashboard statistics and collections for an affiliate user
   */
  async getAffiliateDashboard(userId: string, appUrl: string): Promise<AffiliateDashboardStats> {
    const affiliate = await this.getOrCreateAffiliate(userId);
    const stats = await affiliateRepository.getDashboardStats(affiliate.id);

    const referralUrl = `${appUrl}/register?ref=${affiliate.affiliate_code}`;

    return {
      affiliate,
      referral_url: referralUrl,
      total_clicks: stats.totalClicks,
      total_signups: stats.totalReferrals,
      total_converted: stats.activeSubscriptions,
      pending_commission: stats.pendingCommission,
      eligible_commission: stats.eligibleCommission,
      paid_commission: stats.totalPaidOut,
      total_earned: stats.totalEarned,
      recent_referrals: stats.recentReferrals as any,
      commissions: stats.recentCommissions as any,
      payouts: stats.payoutHistory as any
    };
  }

  /**
   * Updates bank payout details for an affiliate
   */
  async updatePayoutDetails(userId: string, details: AffiliatePayoutDetails): Promise<Affiliate> {
    const affiliate = await this.getOrCreateAffiliate(userId);
    return affiliateRepository.updatePayoutDetails(affiliate.id, details);
  }

  // ==========================================
  // ADMIN OPERATIONS (Supabase-backed)
  // ==========================================

  async adminGetAllAffiliates() {
    return affiliateRepository.adminGetAllAffiliates();
  }

  async adminGetAllReferrals() {
    return affiliateRepository.adminGetAllReferrals();
  }

  async adminGetAllCommissions() {
    return affiliateRepository.adminGetAllCommissions();
  }

  async adminGetAllPayouts() {
    return affiliateRepository.adminGetAllPayouts();
  }

  async adminSetAffiliateStatus(affiliateId: string, status: AffiliateStatus): Promise<Affiliate> {
    return affiliateRepository.adminSetAffiliateStatus(affiliateId, status);
  }

  async adminMarkReferralFraudulent(referralId: string, reason: string) {
    return affiliateRepository.adminMarkReferralFraudulent(referralId, reason);
  }

  async adminCancelCommission(commissionId: string, reason: string) {
    return affiliateRepository.adminCancelCommission(commissionId, reason);
  }

  async adminRecordPayout(params: {
    affiliateId: string;
    amount?: number;
    currency?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    reference?: string;
    paymentReference?: string;
    commissionIds?: string[];
    proofUrl?: string;
    notes?: string;
  }): Promise<AffiliatePayout> {
    return affiliateRepository.adminRecordPayout(params);
  }
}

export const affiliateService = new AffiliateService();
