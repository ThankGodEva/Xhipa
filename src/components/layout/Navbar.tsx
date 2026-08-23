import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, ShoppingBag, ArrowRight, Menu, X, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isAuthenticated, user, switchDemoRole } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-600/30">
              <Store className="w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Store<span className="text-emerald-600">front</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/#how-it-works" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              How It Works
            </Link>
            <Link to="/#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Features
            </Link>
            <Link to="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Pricing
            </Link>
            <Link to="/chi-beauty" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition flex items-center gap-1">
              <ShoppingBag className="w-4 h-4" />
              Demo Store
            </Link>
          </nav>

          {/* Action CTAs */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(user?.is_platform_admin ? '/admin' : '/dashboard')}
              >
                {user?.is_platform_admin ? 'Admin Dashboard' : 'Merchant Dashboard'}
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Log in
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/register')}>
                  Create Store Free
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          <Link
            to="/#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            How It Works
          </Link>
          <Link
            to="/pricing"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
          >
            Pricing Plans
          </Link>
          <Link
            to="/chi-beauty"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-emerald-600 hover:bg-emerald-50"
          >
            🛍️ View Live Demo Store
          </Link>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('/dashboard');
                }}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/login');
                  }}
                >
                  Log in
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/register');
                  }}
                >
                  Create Your Store
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
