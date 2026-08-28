import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Building2,
  Package,
  ShoppingBag,
  DollarSign,
  Search,
  ExternalLink,
  Ban,
  CheckCircle,
  TrendingUp,
  Store,
  Crown,
  Sparkles,
  Layers,
  Eye,
  EyeOff,
  Edit3,
  Sliders,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { SubscriptionPlan, PlatformSettings } from '../../types';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    show_affiliate_button: true,
    affiliate_program_enabled: true
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'businesses' | 'plans' | 'governance'>('businesses');
  
  // Plan Edit Modal State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [editPriceNaira, setEditPriceNaira] = useState<number>(0);
  const [editMaxProducts, setEditMaxProducts] = useState<number>(10);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
  const [isTogglingAffiliate, setIsTogglingAffiliate] = useState<boolean>(false);

  const { user, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login', { replace: true, state: { from: '/admin' } });
        return;
      }
      if (!user.is_platform_admin) {
        navigate('/dashboard', { replace: true });
        return;
      }
      loadAdminData();
    }
  }, [user, authLoading, navigate]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      const [bizRes, plansRes, settingsRes] = await Promise.all([
        api.getAdminBusinesses(),
        api.getAdminPlans(),
        api.getAdminPlatformSettings().catch(() => ({ show_affiliate_button: true, affiliate_program_enabled: true }))
      ]);
      setMetrics(bizRes.metrics);
      setBusinesses(bizRes.businesses || []);
      setPlans(plansRes || []);
      setPlatformSettings(settingsRes);
    } catch (err: any) {
      if (err?.message?.includes('session token') || err?.message?.includes('UNAUTHORIZED')) {
        navigate('/login', { replace: true });
        return;
      }
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleBusinessStatus = async (businessId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.updateBusinessStatus(businessId, newStatus);
      setBusinesses(prev =>
        prev.map(b => (b.id === businessId ? { ...b, status: newStatus } : b))
      );
      success(`Business status updated to ${newStatus}`);
    } catch (err: any) {
      error(err.message || 'Failed to update status');
    }
  };

  // Feature 1: Master Affiliate Button Toggle
  const handleToggleAffiliateButton = async () => {
    const newShowAffiliate = !platformSettings.show_affiliate_button;
    setIsTogglingAffiliate(true);
    try {
      const res = await api.updateAdminPlatformSettings({
        show_affiliate_button: newShowAffiliate
      });
      setPlatformSettings(prev => ({ ...prev, show_affiliate_button: newShowAffiliate }));
      success(
        newShowAffiliate
          ? 'Affiliate button is now VISIBLE across the platform.'
          : 'Affiliate button is now HIDDEN everywhere on the platform.'
      );
    } catch (err: any) {
      error(err.message || 'Failed to update affiliate visibility');
    } finally {
      setIsTogglingAffiliate(false);
    }
  };

  // Feature 2: Subscription Plan Status Toggle
  const handleTogglePlanStatus = async (planId: string, currentActive?: boolean) => {
    const newStatus = currentActive === false ? true : false;
    try {
      const updated = await api.updateAdminPlanStatus(planId, newStatus);
      setPlans(prev => prev.map(p => (p.id === planId ? { ...p, is_active: newStatus } : p)));
      success(`Plan '${updated.name}' is now ${newStatus ? 'AVAILABLE' : 'DISABLED'} for merchants.`);
    } catch (err: any) {
      error(err.message || 'Failed to update plan status');
    }
  };

  const handleOpenEditPlan = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setEditPriceNaira((plan.price_monthly || 0) / 100);
    setEditMaxProducts(plan.max_products);
    setEditDescription(plan.description);
    setEditIsActive(plan.is_active !== false);
  };

  const handleSavePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setIsSavingPlan(true);
    try {
      const updated = await api.updateAdminPlan(editingPlan.id, {
        price_monthly: Math.round(Number(editPriceNaira) * 100),
        max_products: Number(editMaxProducts),
        description: editDescription,
        is_active: editIsActive
      });

      setPlans(prev => prev.map(p => (p.id === editingPlan.id ? { ...p, ...updated } : p)));
      success(`Plan '${updated.name}' settings saved successfully!`);
      setEditingPlan(null);
    } catch (err: any) {
      error(err.message || 'Failed to save plan changes');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const filtered = businesses.filter(b =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.store?.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-16 font-sans">
      {/* Admin Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-40 px-4 sm:px-8 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="/Xhipa.png"
            alt="Xhipa Logo"
            className="w-9 h-9 rounded-xl object-contain bg-white shadow-md p-0.5"
          />
          <div>
            <h1 className="font-bold text-sm sm:text-base leading-tight">Xhipa Platform Admin</h1>
            <p className="text-2xs text-purple-300">Multi-tenant Super Admin Portal & Controls</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/affiliates">
            <Button
              variant="outline"
              size="sm"
              className="border-purple-500/50 bg-purple-900/40 text-purple-200 hover:bg-purple-800"
            >
              Affiliate Payouts & Logs
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            onClick={() => {
              navigate('/dashboard');
            }}
          >
            Go to Merchant Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Global Platform Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Stores</span>
              <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.total_businesses || 0}</p>
            <span className="text-2xs text-slate-500 mt-1 block">Active merchant tenants</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Catalogue Items</span>
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.total_products || 0}</p>
            <span className="text-2xs text-slate-500 mt-1 block">Listed across platform</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Orders</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{metrics?.total_orders || 0}</p>
            <span className="text-2xs text-slate-500 mt-1 block">Direct guest orders</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">GMV Processed</span>
              <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(metrics?.total_volume_kobo || 0)}
            </p>
            <span className="text-2xs text-emerald-600 mt-1 block font-medium">All Paystack transactions</span>
          </div>
        </div>

        {/* Feature 1 & 2 Fast Access Control Bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Fast Affiliate Button Visibility Master Switch */}
          <div className="bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 border border-purple-800/50 shadow-md relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-white/10 text-purple-200 border border-white/20">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Platform Governance
                </span>
                <Badge
                  variant={platformSettings.show_affiliate_button ? 'emerald' : 'slate'}
                  size="sm"
                >
                  {platformSettings.show_affiliate_button ? 'Visible' : 'Hidden'}
                </Badge>
              </div>

              <h3 className="text-base font-bold text-white">
                Affiliate Button & Link Visibility
              </h3>
              <p className="text-xs text-purple-200/80 leading-relaxed">
                Controls whether the "Affiliate Program" button appears in the merchant dashboard sidebar, mobile drawer, and public landing page footer.
              </p>
            </div>

            <div className="pt-4 mt-2 flex items-center justify-between border-t border-purple-800/60">
              <span className="text-xs font-medium text-purple-100">
                Current: {platformSettings.show_affiliate_button ? '🟢 Button is visible to all' : '⚪ Button is hidden everywhere'}
              </span>
              <Button
                variant={platformSettings.show_affiliate_button ? 'danger' : 'primary'}
                size="sm"
                isLoading={isTogglingAffiliate}
                leftIcon={platformSettings.show_affiliate_button ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                onClick={handleToggleAffiliateButton}
              >
                {platformSettings.show_affiliate_button ? 'Hide Affiliate Button' : 'Show Affiliate Button'}
              </Button>
            </div>
          </div>

          {/* Subscription Plans Quick Control Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  <Crown className="w-3 h-3 text-blue-600" />
                  Subscription Plans
                </span>
                <span className="text-2xs font-semibold text-slate-500">
                  {plans.filter(p => p.is_active !== false).length} of {plans.length} Plans Active
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Subscription Plan Availability
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Control which tiers (Free, Beginner, WhatsApp Starter, Starter, Business) merchants are allowed to subscribe to.
              </p>
            </div>

            <div className="pt-4 mt-2 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                {plans.map(p => (
                  <span
                    key={p.id}
                    className={`w-2.5 h-2.5 rounded-full ${p.is_active !== false ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'}`}
                    title={`${p.name}: ${p.is_active !== false ? 'Available' : 'Disabled'}`}
                  />
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Sliders className="w-3.5 h-3.5" />}
                onClick={() => setActiveTab('plans')}
              >
                Manage Plans ({plans.length})
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('businesses')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'businesses'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Stores & Tenants ({businesses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plans')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'plans'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span>Subscription Plans Control ({plans.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('governance')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'governance'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Platform Governance & Affiliate</span>
          </button>
        </div>

        {/* TAB 1: Multi-Tenant Business Directory */}
        {activeTab === 'businesses' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tenant Businesses & Stores</h2>
                <p className="text-xs text-slate-500">Monitor all stores registered on the platform</p>
              </div>

              <div className="relative w-full sm:w-72">
                <input
                  type="text"
                  placeholder="Search business, slug, or owner..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/60 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                    <th className="py-3 px-4">Business</th>
                    <th className="py-3 px-4">Storefront Link</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Products</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map(biz => (
                    <tr key={biz.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {biz.name}
                      </td>

                      <td className="py-3 px-4">
                        <a
                          href={`/${biz.store?.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-emerald-600 hover:underline"
                        >
                          <span>/{biz.store?.slug}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {biz.owner?.email || '—'}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="purple" size="sm">
                          {biz.subscription?.plan?.name || 'Starter'}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {biz.productCount || 0}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={biz.status === 'active' ? 'emerald' : 'rose'} size="sm">
                          {biz.status}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant={biz.status === 'active' ? 'danger' : 'primary'}
                          size="sm"
                          onClick={() => handleToggleBusinessStatus(biz.id, biz.status)}
                        >
                          {biz.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: Subscription Plans Governance (Feature 2) */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Subscription Plans Management</h2>
                  <p className="text-xs text-slate-500">
                    Enable, disable, or modify subscription tiers available for merchants to select and subscribe to.
                  </p>
                </div>
                <Badge variant="blue" size="md">
                  {plans.filter(p => p.is_active !== false).length} Active Plans Available
                </Badge>
              </div>

              {/* Plans Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/60 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                      <th className="py-3 px-4">Plan Name</th>
                      <th className="py-3 px-4">Monthly Price</th>
                      <th className="py-3 px-4">Product Quota</th>
                      <th className="py-3 px-4">Checkout Support</th>
                      <th className="py-3 px-4">Merchant Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {plans.map(plan => {
                      const isActive = plan.is_active !== false;
                      const isUnlimited = plan.max_products === -1;

                      return (
                        <tr key={plan.id} className={`transition ${isActive ? 'hover:bg-slate-50/80' : 'bg-slate-50/50 opacity-75'}`}>
                          <td className="py-3.5 px-4">
                            <div>
                              <span className="font-bold text-slate-900 text-sm block">{plan.name}</span>
                              <span className="text-2xs text-slate-400 font-mono">ID: {plan.id}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {plan.price_monthly === 0 ? (
                              <span className="text-emerald-600 font-bold">Free</span>
                            ) : (
                              `${formatCurrency(plan.price_monthly)} / mo`
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant={isUnlimited ? 'purple' : 'slate'} size="sm">
                              {isUnlimited ? 'Unlimited' : `${plan.max_products} Products`}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-xs">
                              {plan.can_checkout ? '💳 Paystack Checkout' : '📱 Catalogue / WhatsApp'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge variant={isActive ? 'emerald' : 'slate'} size="sm">
                              {isActive ? 'Available to Merchants' : 'Disabled / Hidden'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                              onClick={() => handleOpenEditPlan(plan)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant={isActive ? 'danger' : 'primary'}
                              size="sm"
                              onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                            >
                              {isActive ? 'Disable Plan' : 'Enable Plan'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Visual Cards Layout of Plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {plans.map(plan => {
                const isActive = plan.is_active !== false;
                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-3xl p-5 border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'border-slate-200 shadow-2xs hover:shadow-md'
                        : 'border-dashed border-slate-300 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                        <Badge variant={isActive ? 'emerald' : 'slate'} size="sm">
                          {isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>

                      <div className="my-3">
                        <span className="text-xl font-extrabold text-slate-900">
                          {plan.price_monthly === 0 ? 'Free' : formatCurrency(plan.price_monthly)}
                        </span>
                        {plan.price_monthly > 0 && <span className="text-2xs text-slate-400 font-medium">/mo</span>}
                      </div>

                      <p className="text-2xs text-slate-500 line-clamp-2 mb-3">{plan.description}</p>

                      <ul className="text-2xs space-y-1.5 text-slate-600 border-t border-slate-100 pt-3 mb-4">
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{plan.max_products === -1 ? 'Unlimited products' : `${plan.max_products} max products`}</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-blue-600 shrink-0" />
                          <span>{plan.can_checkout ? 'Paystack Online Checkout' : 'WhatsApp Catalogue'}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <Button
                        variant={isActive ? 'danger' : 'primary'}
                        size="sm"
                        className="w-full"
                        onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                      >
                        {isActive ? 'Turn Off Plan' : 'Turn On Plan'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: Platform Governance & Affiliate Toggle (Feature 1) */}
        {activeTab === 'governance' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-8">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">Platform Governance & Feature Visibility</h2>
              <p className="text-xs text-slate-500">
                Configure global platform switches, affiliate promo display, and tenant settings.
              </p>
            </div>

            {/* Feature 1 Master Setting: Affiliate Button Visibility */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Affiliate Button & Navigation Visibility
                    </h3>
                    <Badge variant={platformSettings.show_affiliate_button ? 'emerald' : 'rose'} size="sm">
                      {platformSettings.show_affiliate_button ? 'Enabled / Visible' : 'Disabled / Hidden'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                    When set to <strong>Hidden</strong>, the "Affiliate Program" button is removed completely from the merchant sidebar, mobile navigation drawer, and public landing page footer.
                  </p>
                </div>

                <Button
                  variant={platformSettings.show_affiliate_button ? 'danger' : 'primary'}
                  size="md"
                  isLoading={isTogglingAffiliate}
                  leftIcon={platformSettings.show_affiliate_button ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  onClick={handleToggleAffiliateButton}
                >
                  {platformSettings.show_affiliate_button ? 'Hide Affiliate Buttons' : 'Show Affiliate Buttons'}
                </Button>
              </div>

              <div className="text-2xs text-slate-500 bg-white p-3 rounded-xl border border-slate-200/80">
                <strong>Current State:</strong> {platformSettings.show_affiliate_button ? (
                  <span className="text-emerald-700 font-medium">Affiliate promotional buttons are currently displayed to merchants and guests.</span>
                ) : (
                  <span className="text-rose-700 font-medium">Affiliate promotional buttons are hidden across the entire application interface.</span>
                )}
              </div>
            </div>

            {/* Direct Link to Affiliate Ledger */}
            <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-purple-900">
                  Affiliate Ledger & Payout Management
                </h3>
                <p className="text-xs text-purple-700">
                  Review referrals, process bank payouts, verify commission authenticity, and manage affiliate partners.
                </p>
              </div>

              <Link to="/admin/affiliates">
                <Button variant="primary" size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Open Affiliate Ledger
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Edit Subscription Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingPlan(null)}
              className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Edit Subscription Plan</h3>
              </div>
              <p className="text-xs text-slate-500">
                Updating tier configuration for <strong>{editingPlan.name}</strong> ({editingPlan.id})
              </p>
            </div>

            <form onSubmit={handleSavePlanEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monthly Price (₦ Naira)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editPriceNaira}
                    onChange={e => setEditPriceNaira(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    required
                  />
                </div>
                <span className="text-3xs text-slate-400 mt-1 block">
                  Set to 0 for Free tier. Stored as Kobo on backend.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catalogue Product Limit
                </label>
                <input
                  type="number"
                  min="-1"
                  step="1"
                  value={editMaxProducts}
                  onChange={e => setEditMaxProducts(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
                <span className="text-3xs text-slate-400 mt-1 block">
                  Enter <strong>-1</strong> for Unlimited products capacity.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Plan Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">
                  Available for merchants to subscribe
                </span>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setEditingPlan(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSavingPlan}
                >
                  Save Plan Settings
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
