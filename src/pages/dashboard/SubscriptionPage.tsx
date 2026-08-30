import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Package,
  Crown,
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Tag
} from 'lucide-react';
import { api } from '../../lib/api';
import { SubscriptionPlan, Entitlements } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

export const SubscriptionPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const { success, error } = useToast();

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const reference = queryParams.get('reference') || queryParams.get('trxref');
    if (reference) {
      // Clean query params from URL bar
      window.history.replaceState({}, document.title, window.location.pathname);
      setIsLoading(true);
      api.verifyPayment(reference)
        .then((res: any) => {
          if (res?.success) {
            success('🎉 Subscription successfully upgraded and activated!');
          } else {
            error(res?.message || 'Subscription payment verification failed.');
          }
          loadSubscriptionData();
        })
        .catch((err: any) => {
          console.error('Subscription verification error:', err);
          error(err.message || 'Failed to verify subscription payment.');
          loadSubscriptionData();
        });
    } else {
      loadSubscriptionData();
    }
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      const [subRes, plansRes, prodsRes] = await Promise.all([
        api.getMerchantSubscription(),
        api.getSubscriptionPlans(),
        api.getMerchantProducts()
      ]);

      setCurrentPlan(subRes.plan);
      setEntitlements(subRes.entitlements);
      const activePlans = (plansRes.plans || []).filter((p: any) => p.is_active !== false);
      setPlans(activePlans);
      setProductCount(prodsRes.products?.length || 0);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    setUpgradingPlanId(plan.id);
    try {
      if (plan.price_monthly === 0 || plan.id === 'free') {
        const res = await api.upgradeSubscription(plan.id);
        success(res.message || 'Free tier activated successfully!');
        await loadSubscriptionData();
      } else {
        const callbackUrl = `${window.location.origin}/dashboard/subscription`;
        const res = await api.initializeSubscriptionPayment({
          planId: plan.id,
          callbackUrl
        });

        if (res.authorization_url) {
          window.location.href = res.authorization_url;
        } else {
          throw new Error('No authorization URL received from payment processor.');
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to process subscription upgrade');
    } finally {
      setUpgradingPlanId(null);
    }
  };

  const maxProducts = entitlements?.max_products ?? 10;
  const isUnlimited = maxProducts === -1;
  const usagePercentage = isUnlimited ? 0 : Math.min(100, Math.round((productCount / maxProducts) * 100));

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage your plan capacity, checkout entitlements, and features.
        </p>
      </div>

      {/* Active Subscription Overview Card */}
      <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-blue-600/40">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 text-white border border-white/30 flex items-center gap-1.5 backdrop-blur-xs">
                Active Subscription
              </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              {currentPlan?.name || 'Free Plan'}
            </h2>
            <p className="text-xs text-blue-100 mt-1">
              {currentPlan?.price_monthly === 0 ? 'Free tier' : `${formatCurrency(currentPlan?.price_monthly || 0)} / month`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-left md:text-right">
              <span className="text-2xs text-blue-200 uppercase tracking-wider block">Status</span>
              <span className="text-sm font-bold text-emerald-300">Active</span>
            </div>
          </div>
        </div>

        {/* Product Quota Progress Bar */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-blue-100 flex items-center gap-1.5">
              <Package className="w-4 h-4 text-blue-300" />
              Catalogue Product Limit
            </span>
            <span className="font-bold text-white">
              {isUnlimited ? `${productCount} products (Unlimited)` : `${productCount} / ${maxProducts} products (${usagePercentage}%)`}
            </span>
          </div>

          {!isUnlimited && (
            <div className="w-full h-3 bg-slate-700/60 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercentage >= 90 ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
          )}

          <p className="text-2xs text-blue-200">
            {entitlements?.can_checkout
              ? '✅ Online Paystack checkout & guest payment enabled'
              : 'ℹ️ Catalogue mode active (WhatsApp ordering enabled)'}
          </p>
        </div>
      </div>

      {/* Available Plans Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-900">Change Subscription Plan</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {plans.map(plan => {
            const isCurrent = currentPlan?.id === plan.id;
            const isPlanUnlimited = plan.max_products === -1;

            return (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between border transition ${
                  isCurrent
                    ? 'border-2 border-blue-600 shadow-lg ring-4 ring-blue-600/10'
                    : 'border-slate-200 shadow-2xs hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-slate-900">{plan.name}</h4>
                    {isCurrent && (
                      <Badge variant="blue" size="sm">Current Plan</Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>

                  <div className="my-4">
                    <span className="text-2xl font-black text-slate-900">
                      {plan.price_monthly === 0 ? 'Free' : formatCurrency(plan.price_monthly)}
                    </span>
                    {plan.price_monthly > 0 && <span className="text-xs text-slate-500 font-medium"> / mo</span>}
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600 mb-6 border-t border-slate-100 pt-4">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        {isPlanUnlimited ? (
                          <strong>Unlimited products</strong>
                        ) : (
                          <>
                            <strong>{plan.max_products}</strong> max products
                          </>
                        )}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      {!['free', 'beginner'].includes(plan.id.toLowerCase()) ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-medium text-slate-800">Multiple Product Categories</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          <span className="text-slate-400">No Categories (Single listing)</span>
                        </>
                      )}
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{plan.can_checkout ? 'Paystack Online Checkout' : 'Catalogue & WhatsApp Orders'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{plan.can_remove_branding ? 'No Platform Branding' : 'Standard Branding'}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{plan.custom_domain_allowed ? 'Custom domain supported' : 'Standard store link'}</span>
                    </li>
                  </ul>
                </div>

                <Button
                  variant={isCurrent ? 'outline' : 'primary'}
                  size="md"
                  className="w-full"
                  disabled={isCurrent}
                  isLoading={upgradingPlanId === plan.id}
                  onClick={() => handleUpgrade(plan)}
                >
                  {isCurrent ? 'Current Plan' : `Switch to ${plan.name}`}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
