import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import {
  Affiliate,
  AffiliateClick,
  AffiliateCommission,
  AffiliatePayout,
  AffiliatePayoutDetails,
  AffiliateReferral,
  AffiliateStatus,
  CommissionStatus,
  PayoutStatus,
  ReferralStatus
} from '../../src/types';

export interface AffiliateStatsSummary {
  totalClicks: number;
  totalReferrals: number;
  activeSubscriptions: number;
  pendingCommission: number;
  eligibleCommission: number;
  totalEarned: number;
  totalPaidOut: number;
  recentReferrals: AffiliateReferral[];
  recentCommissions: AffiliateCommission[];
  payoutHistory: AffiliatePayout[];
}

export class AffiliateRepository {
  /**
   * Find affiliate by user ID
   */
  async getAffiliateByUserId(userId: string): Promise<Affiliate | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find affiliate by ID
   */
  async getAffiliateById(affiliateId: string): Promise<Affiliate | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('id', affiliateId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find affiliate by affiliate code
   */
  async getAffiliateByCode(code: string): Promise<Affiliate | null> {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .select('*')
        .eq('affiliate_code', cleanCode)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create affiliate record
   */
  async createAffiliate(userId: string, affiliateCode: string): Promise<Affiliate> {
    const now = new Date().toISOString();
    const cleanCode = affiliateCode.trim().toUpperCase();
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          user_id: userId,
          affiliate_code: cleanCode,
          status: 'active',
          payout_details: {},
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update payout details for affiliate
   */
  async updatePayoutDetails(affiliateId: string, details: AffiliatePayoutDetails): Promise<Affiliate> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({
          payout_details: details,
          updated_at: now
        })
        .eq('id', affiliateId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Record an anonymous affiliate click
   */
  async recordClick(params: {
    affiliateId: string;
    referralCode: string;
    anonymousIdentifier: string;
    landingPage?: string;
  }): Promise<AffiliateClick> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('affiliate_clicks')
        .insert({
          affiliate_id: params.affiliateId,
          referral_code: params.referralCode,
          anonymous_identifier: params.anonymousIdentifier,
          landing_page: params.landingPage || '/register',
          created_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referral_code: data.referral_code,
        anonymous_identifier: data.anonymous_identifier,
        landing_page: data.landing_page,
        created_at: data.created_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create an authoritative referral relationship
   */
  async createReferral(params: {
    affiliateId: string;
    referredUserId: string;
    businessId: string;
    status?: ReferralStatus;
    fraudStatus?: 'normal' | 'suspicious' | 'fraudulent';
    fraudScore?: number;
    fraudReasons?: string[];
  }): Promise<AffiliateReferral> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .insert({
          affiliate_id: params.affiliateId,
          referred_user_id: params.referredUserId,
          business_id: params.businessId,
          status: params.status || 'signed_up',
          fraud_status: params.fraudStatus || 'normal',
          fraud_score: params.fraudScore || 0,
          fraud_reasons: params.fraudReasons || [],
          attributed_at: now,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referred_user_id: data.referred_user_id,
        business_id: data.business_id,
        status: data.status,
        fraud_status: data.fraud_status,
        fraud_score: data.fraud_score,
        fraud_reasons: data.fraud_reasons,
        attributed_at: data.attributed_at,
        converted_at: data.converted_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find referral by business ID
   */
  async getReferralByBusinessId(businessId: string): Promise<AffiliateReferral | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referred_user_id: data.referred_user_id,
        business_id: data.business_id,
        status: data.status,
        fraud_status: data.fraud_status,
        fraud_score: data.fraud_score,
        fraud_reasons: data.fraud_reasons,
        attributed_at: data.attributed_at,
        converted_at: data.converted_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find referral by ID
   */
  async getReferralById(referralId: string): Promise<AffiliateReferral | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('id', referralId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referred_user_id: data.referred_user_id,
        business_id: data.business_id,
        status: data.status,
        fraud_status: data.fraud_status,
        fraud_score: data.fraud_score,
        fraud_reasons: data.fraud_reasons,
        attributed_at: data.attributed_at,
        converted_at: data.converted_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update referral record
   */
  async updateReferral(referralId: string, updates: Partial<AffiliateReferral>): Promise<AffiliateReferral> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const dbUpdates: any = { ...updates, updated_at: now };
      const { data, error } = await supabase
        .from('affiliate_referrals')
        .update(dbUpdates)
        .eq('id', referralId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referred_user_id: data.referred_user_id,
        business_id: data.business_id,
        status: data.status,
        fraud_status: data.fraud_status,
        fraud_score: data.fraud_score,
        fraud_reasons: data.fraud_reasons,
        attributed_at: data.attributed_at,
        converted_at: data.converted_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create an affiliate commission ledger entry (₦800 = 80,000 kobo)
   */
  async createCommission(params: {
    affiliateId: string;
    referralId: string;
    amount?: number;
    currency?: string;
    trigger?: string;
  }): Promise<AffiliateCommission> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();
    const eligibleDate = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days holding period
    const amount = params.amount || 80000;

    try {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: params.affiliateId,
          referral_id: params.referralId,
          amount,
          currency: params.currency || 'NGN',
          status: 'pending',
          trigger: params.trigger || 'first_successful_paid_subscription',
          eligible_at: eligibleDate,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referral_id: data.referral_id,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status as CommissionStatus,
        trigger: data.trigger,
        eligible_at: data.eligible_at,
        paid_at: data.paid_at,
        cancellation_reason: data.cancellation_reason,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find commission by referral ID
   */
  async getCommissionByReferralId(referralId: string): Promise<AffiliateCommission | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('referral_id', referralId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referral_id: data.referral_id,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status as CommissionStatus,
        trigger: data.trigger,
        eligible_at: data.eligible_at,
        paid_at: data.paid_at,
        cancellation_reason: data.cancellation_reason,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update commission record
   */
  async updateCommission(commissionId: string, updates: Partial<AffiliateCommission>): Promise<AffiliateCommission> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const dbUpdates: any = { ...updates, updated_at: now };
      const { data, error } = await supabase
        .from('affiliate_commissions')
        .update(dbUpdates)
        .eq('id', commissionId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        referral_id: data.referral_id,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status as CommissionStatus,
        trigger: data.trigger,
        eligible_at: data.eligible_at,
        paid_at: data.paid_at,
        cancellation_reason: data.cancellation_reason,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get affiliate dashboard stats and activity
   */
  async getDashboardStats(affiliateId: string): Promise<AffiliateStatsSummary> {
    const supabase = getRequiredSupabase();

    try {
      const [
        { count: totalClicks, error: clickErr },
        { data: referrals, error: refErr },
        { data: commissions, error: comErr },
        { data: payouts, error: payErr }
      ] = await Promise.all([
        supabase.from('affiliate_clicks').select('*', { count: 'exact', head: true }).eq('affiliate_id', affiliateId),
        supabase.from('affiliate_referrals').select('*, businesses(name)').eq('affiliate_id', affiliateId).order('created_at', { ascending: false }),
        supabase.from('affiliate_commissions').select('*').eq('affiliate_id', affiliateId).order('created_at', { ascending: false }),
        supabase.from('affiliate_payouts').select('*').eq('affiliate_id', affiliateId).order('created_at', { ascending: false })
      ]);

      if (clickErr) throw clickErr;
      if (refErr) throw refErr;
      if (comErr) throw comErr;
      if (payErr) throw payErr;

      const formattedReferrals = (referrals || []).map((r: any) => ({
        id: r.id,
        affiliate_id: r.affiliate_id,
        referred_user_id: r.referred_user_id,
        business_id: r.business_id,
        business_name: r.businesses?.name,
        status: r.status as ReferralStatus,
        fraud_status: r.fraud_status,
        fraud_score: r.fraud_score,
        fraud_reasons: r.fraud_reasons,
        attributed_at: r.attributed_at,
        converted_at: r.converted_at,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      const formattedCommissions = (commissions || []).map((c: any) => ({
        id: c.id,
        affiliate_id: c.affiliate_id,
        referral_id: c.referral_id,
        amount: Number(c.amount),
        currency: c.currency,
        status: c.status as CommissionStatus,
        trigger: c.trigger,
        eligible_at: c.eligible_at,
        paid_at: c.paid_at,
        cancellation_reason: c.cancellation_reason,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));

      const formattedPayouts = (payouts || []).map((p: any) => ({
        id: p.id,
        affiliate_id: p.affiliate_id,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status as PayoutStatus,
        payment_reference: p.payment_reference,
        commission_ids: p.commission_ids || [],
        notes: p.notes,
        paid_at: p.paid_at,
        created_at: p.created_at,
        updated_at: p.updated_at
      }));

      const activeSubs = formattedReferrals.filter(r => r.status === 'converted').length;
      const totalEarned = formattedCommissions
        .filter(c => c.status !== 'cancelled' && c.status !== 'reversed')
        .reduce((sum, c) => sum + c.amount, 0);

      const pendingCommission = formattedCommissions
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0);

      const eligibleCommission = formattedCommissions
        .filter(c => c.status === 'eligible')
        .reduce((sum, c) => sum + c.amount, 0);

      const totalPaidOut = formattedPayouts
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        totalClicks: totalClicks || 0,
        totalReferrals: formattedReferrals.length,
        activeSubscriptions: activeSubs,
        pendingCommission,
        eligibleCommission,
        totalEarned,
        totalPaidOut,
        recentReferrals: formattedReferrals.slice(0, 10),
        recentCommissions: formattedCommissions.slice(0, 10),
        payoutHistory: formattedPayouts
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create an affiliate payout record
   */
  async createPayout(params: {
    affiliateId: string;
    amount: number;
    currency?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    reference: string;
    proofUrl?: string;
    notes?: string;
    commissionIds?: string[];
  }): Promise<AffiliatePayout> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .insert({
          affiliate_id: params.affiliateId,
          amount: params.amount,
          currency: params.currency || 'NGN',
          status: 'paid',
          payment_reference: params.reference,
          commission_ids: params.commissionIds || [],
          notes: params.notes || null,
          paid_at: now,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        affiliate_id: data.affiliate_id,
        amount: Number(data.amount),
        currency: data.currency,
        status: data.status as PayoutStatus,
        payment_reference: data.payment_reference,
        commission_ids: data.commission_ids || [],
        notes: data.notes,
        paid_at: data.paid_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  // ==========================================
  // ADMIN METHODS (Direct Supabase Queries)
  // ==========================================

  /**
   * Admin: List all affiliates with enriched user & earnings info
   */
  async adminGetAllAffiliates(): Promise<any[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: affiliates, error: affErr } = await supabase
        .from('affiliates')
        .select(`
          *,
          profiles(*),
          affiliate_clicks(id),
          affiliate_referrals(*),
          affiliate_commissions(*)
        `)
        .order('created_at', { ascending: false });

      if (affErr) throw affErr;

      return (affiliates || []).map((a: any) => {
        const user = a.profiles;
        const clicks = (a.affiliate_clicks || []).length;
        const referrals = a.affiliate_referrals || [];
        const commissions = a.affiliate_commissions || [];

        const totalEarned = commissions
          .filter((c: any) => c.status !== 'cancelled' && c.status !== 'reversed')
          .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        const eligibleAmount = commissions
          .filter((c: any) => c.status === 'eligible')
          .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        const paidAmount = commissions
          .filter((c: any) => c.status === 'paid')
          .reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

        return {
          id: a.id,
          user_id: a.user_id,
          affiliate_code: a.affiliate_code,
          status: a.status,
          payout_details: a.payout_details || {},
          created_at: a.created_at,
          updated_at: a.updated_at,
          user_name: user?.full_name || 'N/A',
          user_email: user?.email || 'N/A',
          clicks_count: clicks,
          signups_count: referrals.length,
          conversions_count: referrals.filter((r: any) => r.status === 'converted').length,
          total_earned: totalEarned,
          eligible_amount: eligibleAmount,
          paid_amount: paidAmount
        };
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: List all referrals
   */
  async adminGetAllReferrals(): Promise<any[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: referrals, error: refErr } = await supabase
        .from('affiliate_referrals')
        .select(`
          *,
          affiliates(*, profiles(*)),
          profiles(*),
          businesses(*, subscriptions(*, subscription_plans(*))),
          affiliate_commissions(*)
        `)
        .order('created_at', { ascending: false });

      if (refErr) throw refErr;

      return (referrals || []).map((r: any) => {
        const aff = r.affiliates;
        const affUser = aff?.profiles;
        const refUser = r.profiles;
        const biz = r.businesses;
        const sub = Array.isArray(biz?.subscriptions) ? biz?.subscriptions[0] : biz?.subscriptions;
        const plan = sub?.subscription_plans;
        const commission = Array.isArray(r.affiliate_commissions) ? r.affiliate_commissions[0] : r.affiliate_commissions;

        return {
          id: r.id,
          affiliate_id: r.affiliate_id,
          referred_user_id: r.referred_user_id,
          business_id: r.business_id,
          status: r.status,
          fraud_status: r.fraud_status,
          fraud_score: r.fraud_score,
          fraud_reasons: r.fraud_reasons,
          attributed_at: r.attributed_at,
          converted_at: r.converted_at,
          created_at: r.created_at,
          updated_at: r.updated_at,
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
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: List all commissions
   */
  async adminGetAllCommissions(): Promise<any[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: commissions, error: comErr } = await supabase
        .from('affiliate_commissions')
        .select(`
          *,
          affiliates(*, profiles(*)),
          affiliate_referrals(*, businesses(*))
        `)
        .order('created_at', { ascending: false });

      if (comErr) throw comErr;

      return (commissions || []).map((c: any) => {
        const aff = c.affiliates;
        const affUser = aff?.profiles;
        const ref = c.affiliate_referrals;
        const biz = ref?.businesses;

        return {
          id: c.id,
          affiliate_id: c.affiliate_id,
          referral_id: c.referral_id,
          amount: Number(c.amount),
          currency: c.currency,
          status: c.status,
          trigger: c.trigger,
          eligible_at: c.eligible_at,
          paid_at: c.paid_at,
          cancellation_reason: c.cancellation_reason,
          created_at: c.created_at,
          updated_at: c.updated_at,
          affiliate_code: aff?.affiliate_code,
          affiliate_name: affUser?.full_name,
          affiliate_email: affUser?.email,
          business_name: biz?.name || 'N/A'
        };
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: List all payouts
   */
  async adminGetAllPayouts(): Promise<any[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: payouts, error: payErr } = await supabase
        .from('affiliate_payouts')
        .select(`
          *,
          affiliates(*, profiles(*))
        `)
        .order('created_at', { ascending: false });

      if (payErr) throw payErr;

      return (payouts || []).map((p: any) => {
        const aff = p.affiliates;
        const affUser = aff?.profiles;

        return {
          id: p.id,
          affiliate_id: p.affiliate_id,
          amount: Number(p.amount),
          currency: p.currency,
          status: p.status,
          payment_reference: p.payment_reference,
          commission_ids: p.commission_ids || [],
          notes: p.notes,
          paid_at: p.paid_at,
          created_at: p.created_at,
          updated_at: p.updated_at,
          affiliate_code: aff?.affiliate_code,
          affiliate_user_name: affUser?.full_name,
          affiliate_user_email: affUser?.email,
          payout_details: aff?.payout_details
        };
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: Set affiliate status
   */
  async adminSetAffiliateStatus(affiliateId: string, status: AffiliateStatus): Promise<Affiliate> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('affiliates')
        .update({ status, updated_at: now })
        .eq('id', affiliateId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        user_id: data.user_id,
        affiliate_code: data.affiliate_code,
        status: data.status,
        payout_details: data.payout_details || {},
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: Mark referral fraudulent and cancel pending commission
   */
  async adminMarkReferralFraudulent(referralId: string, reason: string): Promise<AffiliateReferral> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data: ref, error: refErr } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('id', referralId)
        .single();

      if (refErr) throw refErr;

      const currentReasons = ref.fraud_reasons || [];
      const updatedReasons = [...currentReasons, reason];

      const { data: updatedRef, error: updateErr } = await supabase
        .from('affiliate_referrals')
        .update({
          status: 'fraudulent',
          fraud_status: 'fraudulent',
          fraud_reasons: updatedReasons,
          updated_at: now
        })
        .eq('id', referralId)
        .select('*')
        .single();

      if (updateErr) throw updateErr;

      // Cancel associated commission if not already paid
      await supabase
        .from('affiliate_commissions')
        .update({
          status: 'cancelled',
          cancellation_reason: `Fraudulent referral: ${reason}`,
          updated_at: now
        })
        .eq('referral_id', referralId)
        .neq('status', 'paid');

      return {
        id: updatedRef.id,
        affiliate_id: updatedRef.affiliate_id,
        referred_user_id: updatedRef.referred_user_id,
        business_id: updatedRef.business_id,
        status: updatedRef.status,
        fraud_status: updatedRef.fraud_status,
        fraud_score: updatedRef.fraud_score,
        fraud_reasons: updatedRef.fraud_reasons,
        attributed_at: updatedRef.attributed_at,
        converted_at: updatedRef.converted_at,
        created_at: updatedRef.created_at,
        updated_at: updatedRef.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: Cancel or reverse commission
   */
  async adminCancelCommission(commissionId: string, reason: string): Promise<AffiliateCommission> {
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      const { data: comm, error: getErr } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('id', commissionId)
        .single();

      if (getErr) throw getErr;

      const isPaid = comm.status === 'paid';
      const newStatus = isPaid ? 'reversed' : 'cancelled';
      const cancellationReason = isPaid ? `Reversed: ${reason}` : reason;

      const { data: updatedComm, error: updateErr } = await supabase
        .from('affiliate_commissions')
        .update({
          status: newStatus,
          cancellation_reason: cancellationReason,
          updated_at: now
        })
        .eq('id', commissionId)
        .select('*')
        .single();

      if (updateErr) throw updateErr;

      return {
        id: updatedComm.id,
        affiliate_id: updatedComm.affiliate_id,
        referral_id: updatedComm.referral_id,
        amount: Number(updatedComm.amount),
        currency: updatedComm.currency,
        status: updatedComm.status,
        trigger: updatedComm.trigger,
        eligible_at: updatedComm.eligible_at,
        paid_at: updatedComm.paid_at,
        cancellation_reason: updatedComm.cancellation_reason,
        created_at: updatedComm.created_at,
        updated_at: updatedComm.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Admin: Record affiliate payout
   */
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
    const supabase = getRequiredSupabase();
    const now = new Date().toISOString();

    try {
      let amount = params.amount || 0;

      if (params.commissionIds && params.commissionIds.length > 0) {
        // Fetch and mark all commission records as paid
        for (const commId of params.commissionIds) {
          const { data: comm } = await supabase
            .from('affiliate_commissions')
            .select('*')
            .eq('id', commId)
            .maybeSingle();

          if (comm) {
            amount += Number(comm.amount || 0);
            await supabase
              .from('affiliate_commissions')
              .update({
                status: 'paid',
                paid_at: now,
                updated_at: now
              })
              .eq('id', commId);
          }
        }
      }

      const payout = await this.createPayout({
        affiliateId: params.affiliateId,
        amount: amount || 80000,
        currency: params.currency || 'NGN',
        bankName: params.bankName || 'Bank Transfer',
        accountNumber: params.accountNumber || 'N/A',
        accountName: params.accountName || 'N/A',
        reference: params.paymentReference || params.reference || `PAY-${Date.now()}`,
        proofUrl: params.proofUrl,
        notes: params.notes,
        commissionIds: params.commissionIds
      });

      return payout;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const affiliateRepository = new AffiliateRepository();
