import React, { useState, useEffect } from 'react';
import {
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Landmark,
  FileCheck,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';

export const AdminAffiliatesPage: React.FC = () => {
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'affiliates' | 'referrals' | 'commissions' | 'payouts'>('affiliates');
  const [searchQuery, setSearchQuery] = useState('');

  // Payout Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<any | null>(null);
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);
  const [paymentReference, setPaymentReference] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);

  const { success, error } = useToast();

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [affs, refs, comms, pays] = await Promise.all([
        api.getAdminAffiliates(),
        api.getAdminReferrals(),
        api.getAdminCommissions(),
        api.getAdminPayouts()
      ]);
      setAffiliates(affs);
      setReferrals(refs);
      setCommissions(comms);
      setPayouts(pays);
    } catch (err: any) {
      console.error('Failed to load admin affiliate data:', err);
      error(err.message || 'Could not load affiliate records');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleStatus = async (aff: any) => {
    const nextStatus = aff.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdminAffiliateStatus(aff.id, nextStatus);
      setAffiliates(affiliates.map(a => a.id === aff.id ? { ...a, status: nextStatus } : a));
      success(`Affiliate ${aff.affiliate_code} status updated to ${nextStatus}`);
    } catch (err: any) {
      error(err.message || 'Status update failed');
    }
  };

  const handleFlagFraud = async (referralId: string) => {
    const reason = prompt('Enter reason for fraud flag:');
    if (!reason) return;
    try {
      await api.flagAdminReferralFraud(referralId, reason);
      success('Referral flagged as fraudulent and pending commissions cancelled.');
      loadAdminData();
    } catch (err: any) {
      error(err.message || 'Fraud flag failed');
    }
  };

  const handleCancelCommission = async (commId: string) => {
    const reason = prompt('Enter cancellation reason (e.g. Refunded / Suspicious activity):');
    if (!reason) return;
    try {
      await api.cancelAdminCommission(commId, reason);
      success('Commission cancelled successfully.');
      loadAdminData();
    } catch (err: any) {
      error(err.message || 'Commission cancellation failed');
    }
  };

  const openPayoutModal = (aff: any) => {
    setSelectedAffiliate(aff);
    // Auto-select all eligible commissions for this affiliate
    const eligibleComms = commissions
      .filter(c => c.affiliate_id === aff.id && (c.status === 'eligible' || c.status === 'pending'))
      .map(c => c.id);
    setSelectedCommissionIds(eligibleComms);
    setPaymentReference(`PAYOUT-${Date.now().toString().slice(-6)}`);
    setPayoutNotes('');
    setIsPayoutModalOpen(true);
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAffiliate || !paymentReference || selectedCommissionIds.length === 0) {
      error('Please provide payment reference and select at least one commission.');
      return;
    }

    try {
      setIsProcessingPayout(true);
      await api.processAdminPayout({
        affiliateId: selectedAffiliate.id,
        paymentReference,
        commissionIds: selectedCommissionIds,
        notes: payoutNotes
      });
      success(`Payout for ${selectedAffiliate.affiliate_code} recorded successfully!`);
      setIsPayoutModalOpen(false);
      loadAdminData();
    } catch (err: any) {
      error(err.message || 'Payout processing failed');
    } finally {
      setIsProcessingPayout(false);
    }
  };

  // Aggregated platform affiliate KPIs
  const totalAffiliates = affiliates.length;
  const totalReferrals = referrals.length;
  const totalCommissionLiabilities = commissions
    .filter(c => c.status === 'pending' || c.status === 'eligible')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalDisbursed = payouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Affiliate & Partner Program</h1>
          <p className="text-xs text-slate-500 mt-1">
            Monitor promoter performance, audit referrals, prevent self-referrals, and disburse bank payouts.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadAdminData}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Data
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Registered Promoters</span>
          <div className="text-2xl font-bold text-slate-900">{totalAffiliates}</div>
          <p className="text-2xs text-slate-400">Total active & suspended affiliates</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Attributed Businesses</span>
          <div className="text-2xl font-bold text-slate-900">{totalReferrals}</div>
          <p className="text-2xs text-slate-400">Permanent referral links</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Pending Liabilities</span>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(totalCommissionLiabilities)}</div>
          <p className="text-2xs text-slate-400">Maturing & eligible commissions</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <span className="text-xs font-semibold text-slate-500">Total Disbursed</span>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalDisbursed)}</div>
          <p className="text-2xs text-slate-400">Completed affiliate payouts</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 p-2 border-b border-slate-100 bg-slate-50/70 overflow-x-auto">
          <button
            onClick={() => setActiveTab('affiliates')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'affiliates'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Promoters ({affiliates.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'referrals'
                ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Referrals Audit ({referrals.length})</span>
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
            <span>Commissions ({commissions.length})</span>
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
            <span>Payout Records ({payouts.length})</span>
          </button>
        </div>

        {/* Tab 1: Affiliates List */}
        {activeTab === 'affiliates' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Affiliate Code / Promoter</th>
                    <th className="px-4 py-3 font-semibold">Bank Payout Info</th>
                    <th className="px-4 py-3 font-semibold">Total Clicks</th>
                    <th className="px-4 py-3 font-semibold">Signups</th>
                    <th className="px-4 py-3 font-semibold">Converted</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {affiliates.map(aff => (
                    <tr key={aff.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-blue-600">{aff.affiliate_code}</div>
                        <div className="text-2xs text-slate-400">{aff.user_email || aff.user_id}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        {aff.payout_details?.bank_name ? (
                          <div className="text-2xs">
                            <span className="font-semibold text-slate-800">{aff.payout_details.bank_name}</span>
                            <div className="font-mono text-slate-500">{aff.payout_details.account_number} ({aff.payout_details.account_name})</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-2xs">No bank added</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{aff.clicks_count || 0}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{aff.signups_count || 0}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">{aff.conversions_count || 0}</td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                          aff.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {aff.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-2xs"
                          onClick={() => openPayoutModal(aff)}
                        >
                          Process Payout
                        </Button>
                        <Button
                          variant={aff.status === 'active' ? 'danger' : 'outline'}
                          size="sm"
                          className="text-2xs"
                          onClick={() => handleToggleStatus(aff)}
                        >
                          {aff.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Referrals Audit */}
        {activeTab === 'referrals' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Affiliate Code</th>
                    <th className="px-4 py-3 font-semibold">Referred Business / User</th>
                    <th className="px-4 py-3 font-semibold">Referral Status</th>
                    <th className="px-4 py-3 font-semibold">Fraud Status</th>
                    <th className="px-4 py-3 font-semibold">Attributed Date</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {referrals.map(ref => (
                    <tr key={ref.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{ref.affiliate_code}</td>
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">{ref.business_name}</div>
                        <div className="text-2xs text-slate-400">{ref.referred_user_email}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                          ref.status === 'converted' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ref.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                          ref.fraud_status === 'fraudulent'
                            ? 'bg-red-100 text-red-800'
                            : ref.fraud_status === 'suspicious'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ref.fraud_status} (Score: {ref.fraud_score})
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-2xs">
                        {new Date(ref.attributed_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {ref.fraud_status !== 'fraudulent' && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-2xs"
                            onClick={() => handleFlagFraud(ref.id)}
                          >
                            Flag Fraud
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Commissions Ledger */}
        {activeTab === 'commissions' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Affiliate Code</th>
                    <th className="px-4 py-3 font-semibold">Business</th>
                    <th className="px-4 py-3 font-semibold">Commission</th>
                    <th className="px-4 py-3 font-semibold">Eligible Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commissions.map(comm => (
                    <tr key={comm.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 font-mono font-bold text-blue-600">{comm.affiliate_code}</td>
                      <td className="px-4 py-3.5 font-semibold text-slate-900">{comm.business_name}</td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{formatCurrency(comm.amount)}</td>
                      <td className="px-4 py-3.5 font-mono text-2xs text-slate-500">
                        {new Date(comm.eligible_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-2xs font-semibold ${
                          comm.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : comm.status === 'eligible'
                            ? 'bg-blue-100 text-blue-800'
                            : comm.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {comm.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {comm.status !== 'paid' && comm.status !== 'cancelled' && (
                          <Button
                            variant="danger"
                            size="sm"
                            className="text-2xs"
                            onClick={() => handleCancelCommission(comm.id)}
                          >
                            Cancel / Reverse
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Payouts */}
        {activeTab === 'payouts' && (
          <div className="p-6">
            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-2xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Payment Reference</th>
                    <th className="px-4 py-3 font-semibold">Affiliate Code</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Commissions Count</th>
                    <th className="px-4 py-3 font-semibold">Disbursed Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map(p => (
                    <tr key={p.id}>
                      <td className="px-4 py-3.5 font-mono font-bold text-slate-900">{p.payment_reference}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-blue-600">{p.affiliate_code}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-600">{formatCurrency(p.amount)}</td>
                      <td className="px-4 py-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-700">{p.commission_ids?.length || 0} commissions</td>
                      <td className="px-4 py-3.5 text-slate-500 font-mono text-2xs">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Process Payout Modal */}
      {isPayoutModalOpen && selectedAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Record & Disburse Payout</h3>
              <p className="text-xs text-slate-500 mt-1">
                Disburse cleared commissions to Promoter <strong className="font-mono text-blue-600">{selectedAffiliate.affiliate_code}</strong>.
              </p>
            </div>

            {/* Bank Info Summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="text-2xs font-bold uppercase text-slate-400">Recipient Bank</span>
              <div className="font-semibold text-slate-900">{selectedAffiliate.payout_details?.bank_name || 'Bank not entered'}</div>
              <div className="font-mono text-slate-600">{selectedAffiliate.payout_details?.account_number} — {selectedAffiliate.payout_details?.account_name}</div>
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Payment Reference / Transaction ID *</label>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={e => setPaymentReference(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="e.g. NIP-TXN-98471203"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Commissions to Mark as Paid ({selectedCommissionIds.length} selected)</label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1">
                  {commissions
                    .filter(c => c.affiliate_id === selectedAffiliate.id && c.status !== 'paid' && c.status !== 'cancelled')
                    .map(c => (
                      <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedCommissionIds.includes(c.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedCommissionIds([...selectedCommissionIds, c.id]);
                            } else {
                              setSelectedCommissionIds(selectedCommissionIds.filter(id => id !== c.id));
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1 font-medium">{c.business_name}</span>
                        <span className="font-bold text-slate-900">{formatCurrency(c.amount)}</span>
                        <span className="text-2xs text-slate-400 capitalize">({c.status})</span>
                      </label>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Notes</label>
                <input
                  type="text"
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="e.g. Cleared batch via NIP instant transfer"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setIsPayoutModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  isLoading={isProcessingPayout}
                >
                  Confirm Disbursement
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
