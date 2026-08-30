import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Share2,
  CreditCard,
  MessageCircle,
  ShieldCheck,
  Zap,
  Smartphone,
  ChevronDown,
  Sparkles,
  Layers,
  BarChart3,
  Globe,
  Settings,
  Plus,
  Send,
  Calendar,
  Check,
  TrendingUp,
  ShoppingCart,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { api } from '../../lib/api';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAffiliateBtn, setShowAffiliateBtn] = useState(true);
  const [activePlanIds, setActivePlanIds] = useState<string[]>(['free', 'beginner', 'whatsapp_starter', 'starter', 'business']);

  useEffect(() => {
    api.getPlatformSettings()
      .then(settings => {
        if (settings && typeof settings.show_affiliate_button === 'boolean') {
          setShowAffiliateBtn(settings.show_affiliate_button);
        }
      })
      .catch(() => {});

    api.getSubscriptionPlans()
      .then(res => {
        if (res.plans && res.plans.length > 0) {
          setActivePlanIds(res.plans.map((p: any) => p.id));
        }
      })
      .catch(() => {});
  }, []);

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      description: 'Ideal for hobbyists and early sellers starting out on social media.',
      features: [
        { text: 'Up to 10 products', included: true },
        { text: 'No Categories (Single Catalogue)', included: false },
        { text: 'Catalogue Mode & WhatsApp Ordering', included: true },
        { text: 'Mobile-first digital storefront', included: true },
        { text: 'Standard Order Tracking', included: true },
        { text: 'Platform Branding', included: true }
      ],
      cta: 'Get Started Free',
      popular: false,
    },
    {
      id: 'beginner',
      name: 'Beginner Plan',
      price: 135000, // 1,350 NGN
      description: 'For growing sellers who need more product catalogue capacity.',
      features: [
        { text: 'Up to 30 products', included: true },
        { text: 'No Categories (Single Catalogue)', included: false },
        { text: 'Catalogue Mode & WhatsApp Ordering', included: true },
        { text: 'Mobile-first digital storefront', included: true },
        { text: 'Customer Directory & Order Logs', included: true },
        { text: 'Platform Branding', included: true }
      ],
      cta: 'Start Beginner Plan',
      popular: false,
    },
    {
      id: 'whatsapp_starter',
      name: 'WhatsApp Starter Plan',
      price: 299999, // 2,999.99 NGN
      description: 'For high-volume catalogue sellers who want expanded capacity on WhatsApp.',
      features: [
        { text: 'Up to 100 products', included: true },
        { text: 'Multiple Product Categories & Filter', included: true, highlight: true },
        { text: 'Catalogue Mode & WhatsApp Ordering', included: true },
        { text: 'Mobile-first digital storefront', included: true },
        { text: 'Customer Directory & Order Logs', included: true },
        { text: 'Platform Branding', included: true }
      ],
      cta: 'Start WhatsApp Plan',
      popular: false,
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      price: 500000, // 5,000 NGN
      description: 'For active merchants accepting automated online payments & guest checkout.',
      features: [
        { text: 'Up to 100 products', included: true },
        { text: 'Multiple Product Categories & Filter', included: true, highlight: true },
        { text: 'Online Paystack Checkout & Direct Payments', included: true },
        { text: 'WhatsApp Ordering Option Included', included: true },
        { text: 'Automated Payment Verification', included: true },
        { text: 'Customer Order History & Snapshots', included: true }
      ],
      cta: 'Start with Checkout',
      popular: true,
    },
    {
      id: 'business',
      name: 'Business Plan',
      price: 1500000, // 15,000 NGN
      description: 'For established retailers, mini-dropshippers and multi-product stores.',
      features: [
        { text: 'Unlimited products', included: true },
        { text: 'Unlimited Multiple Categories & Filter', included: true, highlight: true },
        { text: 'Online Paystack Checkout & WhatsApp Mode', included: true },
        { text: 'Remove Platform Branding', included: true },
        { text: 'Custom Domain Support', included: true },
        { text: 'Advanced Sales & Conversion Analytics', included: true },
        { text: 'Priority Merchant Support', included: true }
      ],
      cta: 'Go Unlimited',
      popular: false,
    }
  ];

  const faqs = [
    {
      q: 'How do customers order from my store?',
      a: 'Depending on your chosen mode, customers can either browse your products and click "Order on WhatsApp" (which sends you a ready-made order message with their item choices), or pay directly online via Paystack guest checkout without needing an account.'
    },
    {
      q: 'Do my customers need to download an app or register?',
      a: 'No! Guest checkout is a core principle of Xhipa. Customers open your link in their mobile browser, add items, and checkout in under 60 seconds.'
    },
    {
      q: 'How do I share my store with customers?',
      a: 'Every business receives a clean dedicated URL (e.g. xhipa.com/chi-beauty or /chi-beauty) and an auto-generated QR code. You can paste this in your Instagram bio, WhatsApp status, TikTok profile, or print it on product cards.'
    },
    {
      q: 'What is the difference between Catalogue mode and Online Checkout?',
      a: 'In Catalogue mode, customers browse products and complete the conversation directly with you on WhatsApp. In Online Checkout mode (Starter & Business plans), customers pay securely online with debit card, bank transfer, or USSD via Paystack.'
    },
    {
      q: 'Can I start for free?',
      a: 'Yes! The Free plan allows you to list up to 10 products with WhatsApp ordering forever. You can upgrade to Beginner (30 products for ₦1,350/mo), WhatsApp Starter (100 products for ₦2,999.99/mo), or Starter (with direct checkout) whenever you are ready.'
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-blue-200 selection:text-blue-950 overflow-x-hidden">
      {/* Top Hero Section with Deep Blue Gradient & Atmospheric Illustrations */}
      <section className="relative bg-gradient-to-b from-[#1D4ED8] via-[#2563EB] to-[#1E40AF] text-white pt-6 pb-28 sm:pb-36 overflow-hidden">
        {/* Background Geometric Rings & Circles */}
        <div className="absolute top-10 left-10 w-48 h-48 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute -top-12 -left-12 w-80 h-80 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute top-1/4 right-12 w-24 h-24 rounded-full border border-white/15 pointer-events-none" />
        <div className="absolute top-1/3 left-1/4 w-12 h-12 rounded-full border border-white/20 pointer-events-none" />
        <div className="absolute bottom-24 right-1/4 w-16 h-16 rounded-full border border-white/15 pointer-events-none" />

        {/* Top Navbar */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30 mb-10 sm:mb-14">
          <div className="flex items-center justify-between py-2">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 text-white group">
              <img
                src="/Xhipa.png"
                alt="Xhipa Logo"
                className="w-9 h-9 rounded-xl object-contain bg-white shadow-xs p-0.5 border border-white/20 group-hover:scale-105 transition"
              />
              <span className="text-xl font-bold tracking-tight text-white">
                Xhipa
              </span>
            </Link>

            {/* Desktop Nav links (Preserving all original tabs) */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-white/90">
              <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>

              <Link to="/chi-beauty" className="hover:text-white transition flex items-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Demo Store</span>
              </Link>
            </nav>

            {/* Desktop Auth CTAs */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate(user?.is_platform_admin ? '/admin' : '/dashboard')}
                  className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold rounded-xl bg-white text-blue-900 hover:bg-blue-50 shadow-sm transition cursor-pointer"
                >
                  <span>
                    {user?.is_platform_admin ? 'Admin Dashboard' : 'Merchant Dashboard'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-white/90 hover:text-white px-3 py-1.5 transition"
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    className="text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 px-5 py-2.5 rounded-full shadow-sm hover:shadow-md transition"
                  >
                    Create Store Free
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Trigger */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-white hover:bg-white/10 transition cursor-pointer"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-3 p-4 rounded-2xl bg-blue-900/95 backdrop-blur-md border border-white/20 space-y-3 text-xs font-semibold">
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                How It Works
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Features
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Pricing
              </a>
              <Link
                to="/chi-beauty"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-blue-200 hover:text-white flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Chi Beauty Demo Store</span>
              </Link>
              <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate(user?.is_platform_admin ? '/admin' : '/dashboard');
                    }}
                    className="w-full text-center py-2.5 rounded-full bg-white text-blue-900 font-bold"
                  >
                    {user?.is_platform_admin ? 'Admin Dashboard' : 'Merchant Dashboard'}
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-2 text-white/90 font-medium"
                    >
                      Log in
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full text-center py-2.5 rounded-full bg-white text-blue-900 font-bold"
                    >
                      Create Store Free
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Hero Copy (Preserving all original writeups & buttons) */}
        <div className="max-w-4xl mx-auto px-4 text-center relative z-20 mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-white text-2xs sm:text-xs font-semibold mb-6 shadow-2xs backdrop-blur-md">
            <span>Digital Storefront Infrastructure for Small Businesses</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-5 drop-shadow-xs max-w-3xl mx-auto">
            Your business deserves a <span className="underline decoration-cyan-300 underline-offset-8">place online</span>.
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
            Create your storefront, add your products, and share one simple link with your customers across WhatsApp, Instagram, and TikTok.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-10">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-sm sm:text-base shadow-xl shadow-blue-950/20 hover:scale-105 active:scale-100 transition-all duration-150 cursor-pointer w-full sm:w-auto"
            >
              <span className="text-blue-900 font-extrabold">Create your store</span>
              <ArrowRight className="w-5 h-5 text-blue-900 shrink-0" />
            </button>
            <button
              onClick={() => navigate('/chi-beauty')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/40 backdrop-blur-md font-bold text-sm sm:text-base hover:scale-105 active:scale-100 transition-all duration-150 cursor-pointer w-full sm:w-auto"
            >
              <ShoppingBag className="w-5 h-5 text-cyan-300 shrink-0" />
              <span className="text-white font-bold">Explore demo store</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-2xs sm:text-xs text-blue-100 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              No coding required
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              Paystack online payments
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              Instant WhatsApp orders
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
              Mobile guest checkout
            </span>
          </div>
        </div>

        {/* Dashboard Centerpiece Mockup with Live Demo Store Snapshot */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-20">
          <div className="relative">
            {/* Left Foliage / Botanical Silhouette */}
            <div className="absolute -left-12 -bottom-6 w-36 h-48 opacity-90 hidden lg:block pointer-events-none z-10">
              <svg viewBox="0 0 140 180" fill="none" className="w-full h-full text-cyan-400/40">
                <path d="M20 180C15 120 40 70 90 40C70 90 60 140 20 180Z" fill="currentColor" />
                <path d="M5 180C0 140 15 90 55 65C40 110 30 150 5 180Z" fill="currentColor" opacity="0.6" />
                <path d="M40 180C45 130 80 80 130 50C105 100 85 145 40 180Z" fill="#00D2D3" opacity="0.5" />
              </svg>
            </div>

            {/* Right Foliage / Botanical Silhouette */}
            <div className="absolute -right-12 -bottom-6 w-36 h-48 opacity-90 hidden lg:block pointer-events-none z-10">
              <svg viewBox="0 0 140 180" fill="none" className="w-full h-full text-cyan-400/40">
                <path d="M120 180C125 120 100 70 50 40C70 90 80 140 120 180Z" fill="currentColor" />
                <path d="M135 180C140 140 125 90 85 65C100 110 110 150 135 180Z" fill="currentColor" opacity="0.6" />
                <path d="M100 180C95 130 60 80 10 50C35 100 55 145 100 180Z" fill="#00D2D3" opacity="0.5" />
              </svg>
            </div>

            {/* Dashboard Browser Frame */}
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-7 text-slate-900 border border-white/40 backdrop-blur-md relative z-20">
              {/* Browser Header Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="ml-2 font-mono text-2xs text-slate-400">xhipa.com/chi-beauty</span>
                </div>
                <Link
                  to="/chi-beauty"
                  className="text-2xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <span>Open Live Store</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* 4 Metric Badges Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                {/* Metric 1: Revenue */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                  <p className="text-3xs sm:text-2xs font-semibold text-slate-400 uppercase">Revenue</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">₦150,250</p>
                  <div className="mt-2 h-4 w-full">
                    <svg viewBox="0 0 80 20" className="w-full h-full text-blue-500 overflow-visible" fill="none">
                      <path d="M0 15 Q20 5, 40 12 T80 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Metric 2: Orders (Highlighted Blue Badge) */}
                <div className="p-3 sm:p-4 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
                  <p className="text-3xs sm:text-2xs font-semibold text-blue-100 uppercase">Orders</p>
                  <p className="text-sm sm:text-base font-extrabold text-white mt-0.5">120</p>
                  <div className="mt-2 flex items-end gap-1 h-4">
                    <div className="w-1.5 h-2 bg-white/40 rounded-xs" />
                    <div className="w-1.5 h-3 bg-white/60 rounded-xs" />
                    <div className="w-1.5 h-4 bg-white rounded-xs" />
                    <div className="w-1.5 h-2.5 bg-white/70 rounded-xs" />
                    <div className="w-1.5 h-3.5 bg-white rounded-xs" />
                  </div>
                </div>

                {/* Metric 3: Views */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                  <p className="text-3xs sm:text-2xs font-semibold text-slate-400 uppercase">Store Views</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">1,248</p>
                  <div className="mt-2 h-4 w-full">
                    <svg viewBox="0 0 80 20" className="w-full h-full text-indigo-500 overflow-visible" fill="none">
                      <path d="M0 16 C20 8, 30 14, 50 6 C65 2, 75 8, 80 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Metric 4: Conversion */}
                <div className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70">
                  <p className="text-3xs sm:text-2xs font-semibold text-slate-400 uppercase">Conversion</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">7.50%</p>
                  <div className="mt-2 h-4 w-full">
                    <svg viewBox="0 0 80 20" className="w-full h-full text-emerald-500 overflow-visible" fill="none">
                      <path d="M0 14 L25 10 L45 13 L65 5 L80 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Live Store Products Preview Snapshot */}
              <div className="border border-slate-100 bg-slate-50/40 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">
                      C
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Chi Beauty & Glow</h4>
                      <p className="text-3xs text-slate-500">Natural Organic Skincare • Lagos, Nigeria</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-3xs font-semibold rounded-full border border-emerald-200">
                    Online Checkout Active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&auto=format&fit=crop&q=80"
                      alt="Vitamin C Radiance Serum"
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <h5 className="text-2xs font-bold text-slate-900 truncate">20% Vitamin C Radiance Serum</h5>
                    <p className="text-2xs font-extrabold text-blue-600 mt-0.5">₦8,500</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=400&auto=format&fit=crop&q=80"
                      alt="Golden Marula Body Oil"
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <h5 className="text-2xs font-bold text-slate-900 truncate">Golden Marula Body Oil</h5>
                    <p className="text-2xs font-extrabold text-blue-600 mt-0.5">₦12,000</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-slate-100 bg-white">
                    <img
                      src="https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80"
                      alt="Tea Tree Face Cleanser"
                      className="w-full h-24 object-cover rounded-lg mb-2"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <h5 className="text-2xs font-bold text-slate-900 truncate">Tea Tree Face Cleanser</h5>
                    <p className="text-2xs font-extrabold text-blue-600 mt-0.5">₦6,500</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Organic Curved Wave Divider */}
      <div className="relative -mt-1 w-full overflow-hidden leading-none z-10">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-12 sm:h-20 text-white fill-current">
          <path d="M0,0 C300,90 900,90 1200,0 L1200,120 L0,120 Z"></path>
        </svg>
      </div>

      {/* Section 2: "E-Commerce, Your Way! / Simple 3-Step Setup" */}
      <section id="how-it-works" className="relative py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Centered Floating Shopping Cart Badge */}
          <div className="flex justify-center -mt-24 sm:-mt-28 mb-6 relative z-20">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-white ring-4 ring-blue-50">
              <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
          </div>

          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
              E-Commerce, Your Way!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Start selling in less than five minutes — put the ability to create a fully customizable online storefront right at your fingertips.
            </p>
          </div>

          {/* 3 Step & Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10">
            {/* Step 1: Create Your Business */}
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-cyan-100 to-blue-50 flex items-center justify-center mb-6 relative shadow-inner">
                <div className="w-12 h-12 rounded-full bg-cyan-500 text-white flex items-center justify-center font-extrabold text-base shadow-md">
                  1
                </div>
                <div className="absolute top-1 right-2 w-3 h-3 rounded-full bg-blue-500" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                1. Create Your Business
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs">
                Choose your business name and claim your unique storefront link (e.g. yourstore.ng). We take care of the technical setup.
              </p>
            </div>

            {/* Step 2: Upload Your Products */}
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-50 flex items-center justify-center mb-6 relative shadow-inner">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-extrabold text-base shadow-md">
                  2
                </div>
                <div className="absolute bottom-1 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-3xs font-bold">
                  ✓
                </div>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                2. Upload Your Products
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs">
                Add product photos, set prices in Naira, manage stock counts, and configure instant card/transfer payments or WhatsApp mode.
              </p>
            </div>

            {/* Step 3: Share & Get Orders */}
            <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-100 to-cyan-50 flex items-center justify-center mb-6 relative shadow-inner">
                <div className="w-12 h-12 rounded-full bg-sky-500 text-white flex items-center justify-center font-extrabold text-base shadow-md">
                  3
                </div>
                <div className="absolute top-1 right-2 w-3 h-3 rounded-full bg-indigo-600" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2">
                3. Share & Get Orders
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs">
                Share your link on WhatsApp, Instagram bio, and TikTok. Receive verified payments or formatted order chats instantly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Catalogue vs Checkout Showcase ("Your business is unique...") */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50/80 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">Flexible Storefront Modes</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Sell the way that works best for your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mode 1: Catalogue */}
            <div className="p-8 rounded-3xl border-2 border-blue-100 bg-blue-50/30 flex flex-col justify-between shadow-xs">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-4">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <span>Storefront Mode 1</span>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Catalogue & WhatsApp Ordering</h3>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Ideal when you prefer talking directly with customers, confirming custom orders, or arranging local payment on delivery.
                </p>
                <ul className="space-y-3 text-sm text-slate-700 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Customers browse products and click "Order on WhatsApp"</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Pre-formatted WhatsApp message with items, total, and customer info</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>No transaction fee or online payment gateway required</span>
                  </li>
                </ul>
              </div>
              <Link to="/lagos-kicks" className="text-sm font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1">
                <span>View Catalogue Demo Store (Lagos Kicks)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Mode 2: Online Checkout */}
            <div className="p-8 rounded-3xl border-2 border-slate-900 bg-slate-900 text-white flex flex-col justify-between shadow-xl">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-cyan-400 text-xs font-semibold mb-4">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>Storefront Mode 2</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Automated Online Checkout</h3>
                <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                  Accept payments 24/7 automatically without answering "how much" in customer DMs.
                </p>
                <ul className="space-y-3 text-sm text-slate-300 mb-8">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Frictionless guest checkout (no customer account required)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Instant debit card, bank transfer, and USSD via Paystack</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Server-authoritative price & stock verification</span>
                  </li>
                </ul>
              </div>
              <Link to="/chi-beauty" className="text-sm font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                <span>View Online Checkout Demo Store (Chi Beauty)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Transparent Pricing (All 5 Plans) */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">Transparent Pricing</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Affordable plans designed for Nigerian businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {plans.filter(p => activePlanIds.includes(p.id)).map(plan => (
              <div
                key={plan.id}
                className={`bg-white rounded-3xl p-5 sm:p-6 flex flex-col justify-between transition border ${
                  plan.popular
                    ? 'border-2 border-blue-600 shadow-xl relative ring-4 ring-blue-600/10'
                    : 'border-slate-200 shadow-2xs hover:shadow-md'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-2xs uppercase tracking-widest font-extrabold px-3.5 py-1 rounded-full shadow-md whitespace-nowrap z-10 select-none">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>
                  
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-extrabold text-slate-900">
                      {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                    </span>
                    {plan.price > 0 && <span className="text-xs text-slate-500 font-medium">/month</span>}
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100 text-xs text-slate-600 mb-8">
                    {plan.features.map((feat: any, i: number) => {
                      const isObj = typeof feat === 'object';
                      const text = isObj ? feat.text : feat;
                      const included = isObj ? feat.included : !feat.toLowerCase().startsWith('no ');
                      const highlight = isObj ? feat.highlight : false;

                      return (
                        <div key={i} className={`flex items-start gap-2 ${!included ? 'text-slate-400' : ''}`}>
                          {included ? (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          ) : (
                            <X className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                          )}
                          <span className={highlight ? 'font-semibold text-slate-900' : ''}>{text}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: FAQ Section */}
      <section className="py-20 bg-slate-50/80 border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">Frequently Asked Questions</h2>
            <p className="text-3xl font-bold text-slate-900 tracking-tight">Everything you need to know</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="group p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs open:ring-1 open:ring-blue-500/20">
                <summary className="font-semibold text-sm text-slate-900 cursor-pointer flex items-center justify-between list-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Final CTA Banner */}
      <section className="py-20 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to give your business a permanent home online?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto">
            Set up your storefront today. No coding, no complicated setup, just one link to share with your customers.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white hover:bg-blue-50 text-blue-900 font-extrabold text-sm sm:text-base shadow-xl hover:scale-105 active:scale-100 transition-all cursor-pointer w-full sm:w-auto"
            >
              <span className="text-blue-900 font-extrabold">Create your store now</span>
              <ArrowRight className="w-5 h-5 text-blue-900 shrink-0" />
            </button>
            <button
              onClick={() => navigate('/chi-beauty')}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/40 font-bold text-sm sm:text-base transition cursor-pointer w-full sm:w-auto"
            >
              <span className="text-white font-bold">View demo store</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 7: Deep Blue Ocean Footer */}
      <footer className="relative bg-gradient-to-b from-[#1E40AF] via-[#172554] to-[#0F172A] text-white pt-16 pb-12 overflow-hidden">
        {/* Background Geometric Rings */}
        <div className="absolute top-12 left-8 w-32 h-32 rounded-full border border-white/10 pointer-events-none" />
        <div className="absolute bottom-10 right-12 w-48 h-48 rounded-full border border-white/10 pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Centered Top Floating Cart Badge */}
          <div className="flex justify-center mb-12">
            <div className="w-10 h-10 rounded-full bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShoppingCart className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* 4-Column Footer Link Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 text-xs text-blue-200/80">
            {/* Column 1: Brand & Info */}
            <div className="space-y-4 col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 text-white">
                <img
                  src="/Xhipa.png"
                  alt="Xhipa Logo"
                  className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-xs"
                />
                <span className="text-lg font-bold">Xhipa</span>
              </Link>
              <p className="text-xs text-blue-200/70 leading-relaxed">
                Digital storefront infrastructure for small businesses, Instagram sellers, and retailers.
              </p>
            </div>

            {/* Column 2: Product & Modes */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4 text-xs">Product & Partners</h4>
              <ul className="space-y-2.5">
                {showAffiliateBtn && (
                  <li><Link to="/affiliate" className="hover:text-white text-amber-300 font-semibold transition">Affiliate Program (Earn ₦800)</Link></li>
                )}
                <li><a href="#features" className="hover:text-white transition">Catalogue Mode</a></li>
                <li><a href="#features" className="hover:text-white transition">Direct Guest Checkout</a></li>
                <li><a href="#pricing" className="hover:text-white transition">Pricing Plans</a></li>
                <li><Link to="/chi-beauty" className="hover:text-white transition">Live Demo Store</Link></li>
              </ul>
            </div>

            {/* Column 3: Demo Stores */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4 text-xs">Demo Stores</h4>
              <ul className="space-y-2.5">
                <li><Link to="/chi-beauty" className="hover:text-white transition">Chi Beauty (Checkout)</Link></li>
                <li><Link to="/lagos-kicks" className="hover:text-white transition">Lagos Kicks (Catalogue)</Link></li>
                <li><Link to="/admin" className="hover:text-white transition">Platform Admin Portal</Link></li>
                <li><Link to="/dashboard" className="hover:text-white transition">Merchant Dashboard</Link></li>
              </ul>
            </div>

            {/* Column 4: Security & Trust */}
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider mb-4 text-xs">Security & Trust</h4>
              <div className="flex items-center gap-1.5 text-cyan-300 text-xs font-semibold mb-2">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-Tenant Isolated</span>
              </div>
              <p className="text-3xs text-blue-200/60 leading-relaxed">
                Payments powered by Paystack. Data secured with PostgreSQL Row Level Security (RLS).
              </p>
            </div>
          </div>

          {/* Bottom Divider */}
          <div className="pt-8 border-t border-white/10 flex items-center justify-center text-center text-3xs text-blue-300/70">
            <p>© {new Date().getFullYear()} Xhipa Inc. Built for commerce everywhere.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};


