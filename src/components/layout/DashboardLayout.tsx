import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  CreditCard,
  ExternalLink,
  QrCode,
  LogOut,
  Store,
  Menu,
  X,
  ShieldCheck,
  Crown,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { QRModal } from '../common/QRModal';
import { Badge } from '../common/Badge';

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [storeData, setStoreData] = useState<{ storeSlug: string; businessName: string; planName: string } | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAffiliateBtn, setShowAffiliateBtn] = useState<boolean>(true);

  // Guard: User must be authenticated and email must be verified
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/login', { replace: true, state: { from: location.pathname } });
        return;
      }
      if (!user.is_email_verified) {
        navigate('/verify-email', { replace: true });
        return;
      }
    }
  }, [user, isLoading, navigate, location.pathname]);

  useEffect(() => {
    // Fetch platform governance settings (e.g. affiliate button visibility)
    api.getPlatformSettings()
      .then(settings => {
        if (settings && typeof settings.show_affiliate_button === 'boolean') {
          setShowAffiliateBtn(settings.show_affiliate_button);
        }
      })
      .catch(() => {});

    if (user && user.is_email_verified) {
      api.getMerchantBusiness()
        .then(({ business, store }) => {
          setStoreData({
            storeSlug: store?.slug || '',
            businessName: business?.name || (user.full_name ? `${user.full_name}'s Store` : 'My Store'),
            planName: 'Starter'
          });
        })
        .catch(() => {
          setStoreData({
            storeSlug: '',
            businessName: user.full_name ? `${user.full_name}'s Store` : 'My Store',
            planName: 'Starter'
          });
        });
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
        <p className="text-sm text-slate-500 font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  if (!user || !user.is_email_verified) {
    return null;
  }

  const allNavItems = [
    { label: 'Overview', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Products', path: '/dashboard/products', icon: <Package className="w-5 h-5" /> },
    { label: 'Orders', path: '/dashboard/orders', icon: <ShoppingBag className="w-5 h-5" /> },
    { label: 'Customers', path: '/dashboard/customers', icon: <Users className="w-5 h-5" /> },
    ...(showAffiliateBtn ? [{ label: 'Affiliate Program', path: '/affiliate', icon: <Sparkles className="w-5 h-5 text-amber-500" /> }] : []),
    { label: 'Store Settings', path: '/dashboard/settings', icon: <Settings className="w-5 h-5" /> },
    { label: 'Subscription', path: '/dashboard/subscription', icon: <CreditCard className="w-5 h-5" /> },
  ];

  const navItems = allNavItems;

  const currentStoreSlug = storeData?.storeSlug || '';
  const currentBusinessName = storeData?.businessName || (user?.full_name ? `${user.full_name}'s Store` : 'My Store');
  const storeUrl = currentStoreSlug ? `${window.location.origin}/${currentStoreSlug}` : `${window.location.origin}`;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Brand / Logo */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src="/Xhipa.png"
              alt="Xhipa Logo"
              className="w-8 h-8 rounded-xl object-contain bg-white shadow-2xs border border-slate-200/80 p-0.5"
            />
            <span className="font-bold text-slate-900 tracking-tight">Xhipa</span>
          </Link>
          <Badge variant="blue" size="sm">Merchant</Badge>
        </div>

        {/* Business Selector / Store Status Card */}
        <div className="p-4 mx-3 my-3 bg-slate-50 rounded-xl border border-slate-200/80">
          <p className="text-sm font-semibold text-slate-900 truncate">{currentBusinessName}</p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={currentStoreSlug ? `/${currentStoreSlug}` : '#'}
              target={currentStoreSlug ? '_blank' : undefined}
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <span>View Store</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            {currentStoreSlug && (
              <button
                onClick={() => setShowQR(true)}
                className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                title="Store QR code"
              >
                <QrCode className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 space-y-1 py-2">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {user?.is_platform_admin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 transition mt-4"
            >
              <ShieldCheck className="w-5 h-5 text-purple-600" />
              <span>Admin Portal</span>
            </Link>
          )}
        </nav>

        {/* User Footer (Identity switchers removed) */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700 text-xs shrink-0">
                {user?.full_name?.charAt(0) || 'M'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.full_name || 'Merchant'}</p>
                <p className="text-2xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={() => logout().then(() => navigate('/login'))}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <img
            src="/Xhipa.png"
            alt="Xhipa Logo"
            className="w-7 h-7 rounded-lg object-contain bg-white shadow-2xs border border-slate-200/80 p-0.5"
          />
          <span className="font-bold text-slate-900 text-sm">Xhipa</span>
        </Link>
        <div className="flex items-center gap-2">
          {currentStoreSlug && (
            <a
              href={`/${currentStoreSlug}`}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 bg-slate-100 rounded-lg text-slate-700 text-xs font-medium flex items-center gap-1"
            >
              <span>Live Store</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map(item => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-2xs font-medium transition ${
                isActive ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span className="mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* QR Code Modal */}
      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        url={storeUrl}
        storeName={storeData?.businessName || 'My Store'}
      />
    </div>
  );
};
