import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  ExternalLink,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Clock,
  CheckCircle,
  Share2,
  QrCode,
  ShieldCheck,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ShareButton } from '../../components/common/ShareButton';
import { QRModal } from '../../components/common/QRModal';
import { useAuth } from '../../context/AuthContext';

export const DashboardOverview: React.FC = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [storeData, setStoreData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [diagnosticsResult, setDiagnosticsResult] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const runDiagnostics = async () => {
    setRunningDiagnostics(true);
    try {
      const data = await api.getDiagnostics();
      setDiagnosticsResult(data);
    } catch (err: any) {
      setDiagnosticsResult({ error: err.message || 'Failed to reach API endpoint' });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);
    setErrorDetails(null);
    try {
      const [bizRes, subRes] = await Promise.all([
        api.getMerchantBusiness(),
        api.getMerchantSubscription()
      ]);
      setMetrics(bizRes.metrics);
      setRecentOrders(bizRes.recentOrders || []);
      setStoreData({ business: bizRes.business, store: bizRes.store });
      setSubscription(subRes);
    } catch (e: any) {
      if (e?.message?.includes('session token') || e?.message?.includes('UNAUTHORIZED')) {
        navigate('/login', { replace: true });
        return;
      }
      console.error('Failed to load dashboard overview:', e);
      setLoadError(e?.message || 'Failed to load dashboard data from API.');
      setErrorDetails(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Top Banner Skeleton */}
        <div className="bg-gradient-to-r from-blue-600/80 to-indigo-700/80 rounded-3xl p-6 sm:p-8 h-44 flex flex-col justify-center space-y-3">
          <div className="h-4 bg-white/20 rounded w-24"></div>
          <div className="h-8 bg-white/30 rounded-xl w-64"></div>
          <div className="h-4 bg-white/20 rounded w-48"></div>
        </div>

        {/* Metrics Row Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
              <div className="flex justify-between items-center">
                <div className="h-3 bg-slate-200 rounded w-16"></div>
                <div className="w-8 h-8 bg-slate-100 rounded-xl"></div>
              </div>
              <div className="h-7 bg-slate-200 rounded w-28"></div>
              <div className="h-3 bg-slate-100 rounded w-20"></div>
            </div>
          ))}
        </div>

        {/* Recent Orders Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="h-5 bg-slate-200 rounded w-40"></div>
            <div className="h-32 bg-slate-50 rounded-2xl"></div>
          </div>
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
            <div className="h-5 bg-slate-200 rounded w-32"></div>
            <div className="h-32 bg-slate-50 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  const storeSlug = storeData?.store?.slug || '';
  const storeName = storeData?.business?.name || (user?.full_name ? `${user.full_name}'s Store` : 'My Store');
  const storeUrl = storeSlug ? `${window.location.origin}/${storeSlug}` : `${window.location.origin}`;

  const currentProducts = metrics?.total_products || 0;
  const maxProducts = subscription?.entitlements?.max_products ?? 10;
  const isUnlimited = maxProducts === -1;
  const isNearProductLimit = !isUnlimited && currentProducts >= maxProducts;

  return (
    <div className="space-y-8">
      {/* Real-time Error Alert & Investigation Diagnostics */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-900">Failed to load live store data</h3>
                <p className="text-xs text-red-700 mt-1 font-mono">{loadError}</p>
                {errorDetails?.details && (
                  <p className="text-xs text-red-600 mt-0.5 font-mono">{JSON.stringify(errorDetails.details)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-white border-red-200 text-red-700 hover:bg-red-50 text-xs"
                onClick={loadData}
              >
                Retry
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={runDiagnostics}
                isLoading={runningDiagnostics}
              >
                Run Diagnostics
              </Button>
            </div>
          </div>

          {diagnosticsResult && (
            <div className="mt-3 p-3 bg-slate-900 rounded-xl text-slate-200 text-xs font-mono overflow-x-auto space-y-2">
              <div className="text-emerald-400 font-bold">API & Database Diagnostics:</div>
              <pre>{JSON.stringify(diagnosticsResult, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {/* Top Banner / Store Link Card */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-100">Plan: <strong className="text-white">{subscription?.plan?.name || 'Starter'}</strong></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {storeName}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-1.5 font-mono">
            <span>{storeUrl}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto relative z-10">
          <ShareButton
            storeUrl={storeUrl}
            storeName={storeName}
            variant="white"
          />
          <Button
            variant="white"
            size="md"
            rightIcon={<ExternalLink className="w-4 h-4" />}
            onClick={() => window.open(storeUrl, '_blank')}
          >
            Visit Public Store
          </Button>
        </div>
      </div>

      {/* Plan Entitlement Warning if close to product capacity */}
      {isNearProductLimit && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs text-amber-900">
              <span className="font-bold">Product limit notice:</span> You have used {currentProducts} of {maxProducts} products on your {subscription?.plan?.name || 'current'} plan.
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-900 bg-white"
            onClick={() => navigate('/dashboard/subscription')}
          >
            Upgrade Plan
          </Button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Sales</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics?.total_sales_kobo || 0)}
          </p>
          <span className="text-2xs text-emerald-600 font-medium flex items-center gap-1 mt-2">
            <TrendingUp className="w-3 h-3" />
            Verified via Paystack
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Orders</span>
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.total_orders || 0}</p>
          <span className="text-2xs text-slate-500 mt-2 block">
            {metrics?.pending_orders || 0} pending fulfillment
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Products</span>
            <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.total_products || 0}</p>
          <span className="text-2xs text-slate-500 mt-2 block">
            {isUnlimited ? 'Unlimited slots available' : `${Math.max(0, maxProducts - currentProducts)} slots available`}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Customers</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.total_customers || 0}</p>
          <span className="text-2xs text-slate-500 mt-2 block">Guest checkout records</span>
        </div>
      </div>

      {/* Quick Actions & Recent Orders Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders List (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Store Orders</h3>
              <p className="text-xs text-slate-500">Live incoming customer orders from your storefront</p>
            </div>
            <Link to="/dashboard/orders" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              <span>View all orders</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No orders received yet. Share your store link with customers to start receiving orders!
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.slice(0, 5).map(order => (
                <div key={order.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{order.order_number}</span>
                      <Badge
                        variant={
                          order.status === 'completed' ? 'emerald' :
                          order.status === 'confirmed' ? 'blue' :
                          order.status === 'shipped' ? 'purple' : 'amber'
                        }
                        size="sm"
                      >
                        {order.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">
                      {order.customer_name} • {order.items?.length || 1} items
                    </p>
                    <span className="text-2xs text-slate-400">{formatDate(order.created_at)}</span>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(order.total_amount)}</p>
                    <Badge variant={order.payment_status === 'paid' ? 'emerald' : 'amber'} size="sm">
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tools & Shortcuts (1 Col) */}
        <div className="space-y-6">
          {/* Action shortcuts */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Merchant Shortcuts</h3>
            <Button
              variant="primary"
              size="md"
              className="w-full justify-start"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => navigate('/dashboard/products')}
            >
              Add New Product
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full justify-start"
              leftIcon={<QrCode className="w-4 h-4" />}
              onClick={() => setShowQR(true)}
            >
              Download Store QR Code
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full justify-start border-purple-200 text-purple-700 hover:bg-purple-50"
              leftIcon={<Sparkles className="w-4 h-4 text-purple-500" />}
              onClick={() => navigate('/dashboard/settings')}
            >
              Update 5 Storefront Stories
            </Button>
            <Button
              variant="outline"
              size="md"
              className="w-full justify-start"
              leftIcon={<ExternalLink className="w-4 h-4" />}
              onClick={() => navigate('/dashboard/settings')}
            >
              Customize Theme & Delivery
            </Button>
          </div>

          {/* Tips for Store Growth */}
          <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200/80 text-blue-900 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">💡 Pro Selling Tip</span>
            <p className="text-xs leading-relaxed text-blue-800">
              Add your store link <strong>{storeUrl}</strong> to your Instagram bio and WhatsApp auto-responder so customers can self-serve anytime.
            </p>
          </div>
        </div>
      </div>

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={storeUrl}
        storeName={storeName}
      />
    </div>
  );
};
