import React, { useState, useEffect } from 'react';
import {
  Link2,
  Copy,
  Check,
  Share2,
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  ArrowUpRight,
  Sparkles,
  Wallet,
  Landmark,
  MessageSquare,
  HelpCircle,
  Bell,
  RefreshCw
} from 'lucide-react';
import { api } from '../../lib/api';
import { AffiliateDashboardStats, AffiliatePayoutDetails, AppNotification } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const AffiliateDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<AffiliateDashboardStats | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'referrals' | 'commissions' | 'payouts' | 'promo'>('referrals');
  
  // Payout bank form state
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  const { success, error } = useToast();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [dashData, notifs] = await Promise.all([
        api.getAffiliateDashboard(),
        api.getAffiliateNotifications()
      ]);
      setStats(dashData);
      setNotifications(notifs);

      if (dashData.affiliate?.payout_details) {
        setBankName(dashData.affiliate.payout_details.bank_name || '');
        setAccountNumber(dashData.affiliate.payout_details.account_number || '');
        setAccountName(dashData.affiliate.payout_details.account_name || '');
      }
    } catch (err: any) {
      console.error('Failed to load affiliate dashboard:', err);
      error(err.message || 'Could not load affiliate data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyLink = () => {
    if (!stats?.referral_url) return;
    navigator.clipboard.writeText(stats.referral_url);
    setIsCopied(true);
    success('Referral link copied to clipboard!');
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    if (!stats?.referral_url) return;
    const text = `Hey! Check out Xhipa to build your professional online store with catalogue mode and online payments: ${stats.referral_url}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountNumber || !accountName) {
      error('Please complete all bank payout fields.');
      return;
    }

    try {
      setIsSavingBank(true);
      const updated = await api.updateAffiliatePayoutDetails({
        bank_name: bankName,
        account_number: accountNumber,
        account_name: accountName
      });
      if (stats) {
        setStats({ ...stats, affiliate: updated });
      }
      success('Bank payout details updated successfully!');
    } catch (err: any) {
      error(err.message || 'Failed to update bank details');
    } finally {
      setIsSavingBank(false);
    }
  };

  const unreadNotifs = notifications.filter(n => !n.is_read);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      success('All notifications marked as read.');
    } catch (err) {
      // Ignore
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading affiliate dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-slate-600 mb-4">Could not load affiliate program details.</p>
        <Button variant="primary" onClick={loadData}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Xhipa Partner Program</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Affiliate & Referral Dashboard
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Earn <span className="text-blue-400 font-bold">₦800</span> for every Nigerian business you refer that activates a paid plan.
            </p>
          </div>

          {/* Quick Referral Box */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 min-w-[300px]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Your Referral Link</span>
              <span className="text-2xs font-mono font-bold text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded">
                {stats.affiliate.affiliate_code}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2">
              <input
                type="text"
                readOnly
                value={stats.referral_url}
                className="bg-transparent text-xs text-slate-200 w-full focus:outline-none font-mono"
              />
              <button
                onClick={handleCopyLink}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Copy Link"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 text-xs"
                onClick={handleCopyLink}
                leftIcon={isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              >
                {isCopied ? 'Copied!' : 'Copy Referral Link'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
                onClick={handleShareWhatsApp}
                leftIcon={<Share2 className="w-3.5 h-3.5" />}
              >
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Drawer Banner if unread */}
      {unreadNotifs.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-950">
                You have {unreadNotifs.length} new affiliate notification{unreadNotifs.length > 1 ? 's' : ''}!
              </p>
              <p className="text-2xs text-blue-700">
                {unreadNotifs[0].message}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="text-xs">
            Mark all read
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Link Clicks</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.total_clicks}
          </div>
          <p className="text-2xs text-slate-500">Total visitors from your link</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Businesses Signed Up</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {stats.total_signups}
          </div>
          <p className="text-2xs text-slate-500">Attributed Xhipa accounts</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Converted to Paid</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            {stats.total_converted}
          </div>
          <p className="text-2xs text-slate-500">Qualified paid subscriptions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Earned</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 tracking-tight">
            {formatCurrency(stats.total_earned)}
          </div>
          <div className="flex items-center gap-2 text-2xs font-medium text-slate-500">
            <span>Eligible: <strong className="text-emerald-600">{formatCurrency(stats.eligible_commission)}</strong></span>
            <span>•</span>
            <span>Paid: <strong className="text-slate-700">{formatCurrency(stats.paid_commission)}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Tabbed Interface */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Referrals ({stats.recent_referrals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'commissions'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Commissions Ledger ({stats.commissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'payouts'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Payouts & Bank Info</span>
          </button>

          <button
            onClick={() => setActiveTab('promo')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'promo'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Promotional Kit</span>
          </button>
        </div>

        {/* Tab 1: Referrals Table */}
        {activeTab === 'referrals' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Referred Businesses</h3>
                <p className="text-xs text-slate-500">Every merchant linked permanently to your referral code.</p>
              </div>
              <button
                onClick={loadData}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>

            {stats.recent_referrals.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Referrals Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                  Share your referral link on WhatsApp, Instagram, or email to start earning ₦800 per paid upgrade.
                </p>
                <Button variant="primary" size="sm" onClick={handleCopyLink}>
                  Copy Your Referral Link
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Business / Merchant</th>
                      <th className="px-4 py-3 font-semibold">Current Plan</th>
                      <th className="px-4 py-3 font-semibold">Attributed Date</th>
                      <th className="px-4 py-3 font-semibold">Referral Status</th>
                      <th className="px-4 py-3 font-semibold">Commission</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.recent_referrals.map(ref => (
                      <tr key={ref.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-900">{ref.business_name}</div>
                          <div className="text-2xs text-slate-400">{ref.referred_user_email || 'Verified Merchant'}</div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {ref.current_plan}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 font-mono text-2xs">
                          {new Date(ref.attributed_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          {ref.status === 'converted' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Converted (Paid)
                            </span>
                          ) : ref.status === 'signed_up' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800">
                              <Clock className="w-3 h-3" /> Signed Up (Free)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-slate-700">
                              {ref.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {ref.commission_amount ? formatCurrency(ref.commission_amount) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Commissions Ledger */}
        {activeTab === 'commissions' && (
          <div className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Commissions Ledger</h3>
              <p className="text-xs text-slate-500">
                Commissions mature after a standard 7-day holding period to protect against chargebacks.
              </p>
            </div>

            {stats.commissions.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <DollarSign className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h4 className="text-sm font-bold text-slate-700">No Commissions Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  When your referred merchants upgrade to any paid Xhipa plan, your ₦800 commission appears here instantly.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Business</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Trigger</th>
                      <th className="px-4 py-3 font-semibold">Eligible Date</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.commissions.map(comm => (
                      <tr key={comm.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3.5 font-semibold text-slate-900">
                          {comm.business_name}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900">
                          {formatCurrency(comm.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500">
                          1st Paid Subscription
                        </td>
                        <td className="px-4 py-3.5 font-mono text-2xs text-slate-500">
                          {new Date(comm.eligible_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3.5">
                          {comm.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Paid Out
                            </span>
                          ) : comm.status === 'eligible' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-100 text-blue-800">
                              <Check className="w-3 h-3" /> Eligible for Payout
                            </span>
                          ) : comm.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3" /> In Holding Period (7 days)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-red-100 text-red-800">
                              {comm.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Payouts & Bank Details */}
        {activeTab === 'payouts' && (
          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Payout Bank Form */}
              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Payout Bank Details</h3>
                    <p className="text-2xs text-slate-500">Your direct deposit account for cleared affiliate payouts.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveBankDetails} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GTBank / Access Bank / Zenith Bank"
                      value={bankName}
                      onChange={e => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="0123456789 (10-digit NUBAN)"
                      value={accountNumber}
                      onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chioma Okeke"
                      value={accountName}
                      onChange={e => setAccountName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={isSavingBank}
                  >
                    Save Payout Details
                  </Button>
                </form>
              </div>

              {/* Payout Summary / Balance Card */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-6 rounded-2xl shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-blue-200 uppercase tracking-wider">Eligible for Payout</span>
                    <Wallet className="w-5 h-5 text-blue-300" />
                  </div>
                  <div className="text-3xl font-bold tracking-tight">
                    {formatCurrency(stats.eligible_commission)}
                  </div>
                  <div className="pt-2 border-t border-blue-800/80 flex items-center justify-between text-2xs text-blue-200">
                    <span>Pending Clearance: <strong>{formatCurrency(stats.pending_commission)}</strong></span>
                    <span>Total Paid: <strong>{formatCurrency(stats.paid_commission)}</strong></span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Automated & Admin Disbursements</p>
                    <p className="text-2xs text-amber-800/90 mt-0.5 leading-relaxed">
                      Affiliate payouts are processed directly into your registered Nigerian bank account upon verification of eligible balances.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Payouts History Table */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Disbursement History</h3>
              {stats.payouts.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No payout disbursements recorded yet.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200/80 rounded-2xl">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Payment Reference</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Disbursed Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stats.payouts.map(p => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                            {p.payment_reference}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                              {p.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-2xs font-mono">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Promotional Kit */}
        {activeTab === 'promo' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Promotional Copy & Message Templates</h3>
              <p className="text-xs text-slate-500">
                Ready-to-use copy templates for social media, WhatsApp groups, and email campaigns.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* WhatsApp Broadcast Template */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">💬 WhatsApp DM / Status Template</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-2xs"
                    onClick={() => {
                      const text = `Are you still sending product pictures back and forth in WhatsApp DMs? 🛍️\n\nCreate a professional store on Xhipa with your own link, catalogue mode, and automated online checkout:\n${stats.referral_url}\n\nTakes less than 2 minutes to launch!`;
                      navigator.clipboard.writeText(text);
                      success('WhatsApp message template copied!');
                    }}
                  >
                    Copy Template
                  </Button>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                  {`Are you still sending product pictures back and forth in WhatsApp DMs? 🛍️\n\nCreate a professional store on Xhipa with your own link, catalogue mode, and automated online checkout:\n${stats.referral_url}\n\nTakes less than 2 minutes to launch!`}
                </div>
              </div>

              {/* Instagram / Twitter Bio Template */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">📱 Instagram / TikTok Caption</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-2xs"
                    onClick={() => {
                      const text = `Stop losing sales in Instagram DMs! Get your own branded online store and accept card payments & WhatsApp orders seamlessly. Launch free: ${stats.referral_url}`;
                      navigator.clipboard.writeText(text);
                      success('Instagram caption template copied!');
                    }}
                  >
                    Copy Template
                  </Button>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-line">
                  {`Stop losing sales in Instagram DMs! Get your own branded online store and accept card payments & WhatsApp orders seamlessly. Launch free: ${stats.referral_url}`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
