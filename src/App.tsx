import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ToastProvider } from './context/ToastContext';

// Layout
import { DashboardLayout } from './components/layout/DashboardLayout';

// Public & Landing
import { LandingPage } from './pages/landing/LandingPage';
import { PricingPage } from './pages/landing/PricingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyEmailPage } from './pages/auth/VerifyEmailPage';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';

// Merchant Dashboard
import { DashboardOverview } from './pages/dashboard/DashboardOverview';
import { ProductsPage } from './pages/dashboard/ProductsPage';
import { OrdersPage } from './pages/dashboard/OrdersPage';
import { CustomersPage } from './pages/dashboard/CustomersPage';
import { SettingsPage } from './pages/dashboard/SettingsPage';
import { SubscriptionPage } from './pages/dashboard/SubscriptionPage';
import { AffiliateDashboardPage } from './pages/affiliate/AffiliateDashboardPage';

// Admin
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAffiliatesPage } from './pages/admin/AdminAffiliatesPage';

// Storefront (Public Customer facing)
import { StorefrontHome } from './pages/storefront/StorefrontHome';
import { StorefrontProductDetail } from './pages/storefront/StorefrontProductDetail';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
              {/* Marketing & Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/onboarding" element={<OnboardingWizard />} />

              {/* Merchant Dashboard Protected Area */}
              <Route
                path="/dashboard"
                element={
                  <DashboardLayout>
                    <DashboardOverview />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/products"
                element={
                  <DashboardLayout>
                    <ProductsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/orders"
                element={
                  <DashboardLayout>
                    <OrdersPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/customers"
                element={
                  <DashboardLayout>
                    <CustomersPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/settings"
                element={
                  <DashboardLayout>
                    <SettingsPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/subscription"
                element={
                  <DashboardLayout>
                    <SubscriptionPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/dashboard/affiliate"
                element={
                  <DashboardLayout>
                    <AffiliateDashboardPage />
                  </DashboardLayout>
                }
              />
              <Route
                path="/affiliate"
                element={
                  <DashboardLayout>
                    <AffiliateDashboardPage />
                  </DashboardLayout>
                }
              />

              {/* Platform Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/affiliates" element={<AdminAffiliatesPage />} />

              {/* Storefront Routes (Dual pattern: /store/:storeSlug and /:storeSlug) */}
              <Route path="/store/:storeSlug" element={<StorefrontHome />} />
              <Route path="/store/:storeSlug/product/:productSlug" element={<StorefrontProductDetail />} />
              <Route path="/:storeSlug" element={<StorefrontHome />} />
              <Route path="/:storeSlug/product/:productSlug" element={<StorefrontProductDetail />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
