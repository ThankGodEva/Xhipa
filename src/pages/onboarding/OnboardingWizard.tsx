import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  MessageCircle,
  CreditCard
} from 'lucide-react';
import { Button } from '../../components/common/Button';
import { slugify, isReservedSlug } from '../../lib/utils';
import { api } from '../../lib/api';
import { syncFullMerchantDataToSupabase } from '../../lib/supabaseSync';
import { getAttributedReferralCode, clearAttributedReferralCode } from '../../lib/referral';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export const OnboardingWizard: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugFeedback, setSlugFeedback] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mode, setMode] = useState<'catalogue' | 'checkout'>('checkout');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleTopBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/register');
      }
    }
  };

  const handleNameChange = (val: string) => {
    setBusinessName(val);
    if (!slug || slug === slugify(businessName)) {
      setSlug(slugify(val));
    }
  };

  // Real-time database check for storefront link availability
  useEffect(() => {
    const cleanSlug = slug.trim().toLowerCase();

    if (!cleanSlug) {
      setSlugStatus('idle');
      setSlugFeedback('');
      return;
    }

    if (cleanSlug.length < 2) {
      setSlugStatus('invalid');
      setSlugFeedback('Storefront link must be at least 2 characters.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
      setSlugStatus('invalid');
      setSlugFeedback('Storefront link can only contain lowercase letters, numbers, and hyphens.');
      return;
    }

    if (isReservedSlug(cleanSlug)) {
      setSlugStatus('taken');
      setSlugFeedback(`The link "${cleanSlug}" is reserved by the system. Please pick another storefront link.`);
      return;
    }

    setSlugStatus('checking');
    setSlugFeedback('Checking database...');

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const result = await api.checkSlugAvailability(cleanSlug);
        if (!isMounted) return;

        if (result.available) {
          setSlugStatus('available');
          setSlugFeedback(`xhipa.com/${cleanSlug} is available!`);
        } else {
          setSlugStatus('taken');
          setSlugFeedback(result.reason || `Storefront link "xhipa.com/${cleanSlug}" already exists. Please choose a different link.`);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setSlugStatus('taken');
        setSlugFeedback('Storefront link already exists or is unavailable. Please try a different name.');
      }
    }, 280);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [slug]);

  const isSlugAvailable = slugStatus === 'available';
  const isCheckingSlug = slugStatus === 'checking';
  const isFormValid = Boolean(businessName.trim() && slug.trim() && phone.trim() && isSlugAvailable && !isCheckingSlug);

  const handleNextStep = () => {
    if (!businessName.trim() || !slug.trim() || !phone.trim()) {
      error('Please enter your business name, storefront link, and phone number.');
      return;
    }

    if (isCheckingSlug) {
      error('Please wait while we search the database for link availability...');
      return;
    }

    if (slugStatus === 'taken' || slugStatus === 'invalid' || !isSlugAvailable) {
      error(slugFeedback || 'This storefront link already exists. Please choose a different link.');
      return;
    }

    setStep(2);
  };

  const handleFinish = async () => {
    if (!businessName || !slug || !phone) {
      error('Please complete all required fields.');
      return;
    }

    if (isReservedSlug(slug)) {
      error(`The link "${slug}" is reserved for system use. Please choose another store link.`);
      return;
    }

    if (!isSlugAvailable) {
      error('Please pick an available storefront link before publishing.');
      return;
    }

    setIsLoading(true);
    try {
      const activeReferralCode = getAttributedReferralCode();

      // 1. Submit all collected onboarding details to backend (including referral attribution)
      await api.onboardMerchant({
        businessName,
        slug,
        phone,
        whatsapp: whatsapp || phone,
        mode,
        referralCode: activeReferralCode || undefined
      });

      // 2. Also sync all collected details to Supabase if configured
      if (user) {
        await syncFullMerchantDataToSupabase({
          userId: user.id,
          fullName: user.full_name,
          email: user.email,
          businessName,
          slug,
          phone,
          whatsapp: whatsapp || phone,
          mode
        });
      }

      // Clear attribution token now that relationship is authoritatively stored
      clearAttributedReferralCode();

      if (user?.is_email_verified) {
        success('🎉 Your store is live with the Free plan!');
        navigate('/dashboard/products');
      } else {
        success('🎉 Store details saved! Please verify your email to activate your account.');
        navigate('/verify-email');
      }
    } catch (err: any) {
      error(err.message || 'Setup error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto w-full">
        {/* Back Navigation & Progress Bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleTopBack}
            id="btn-wizard-back"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-slate-800 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </button>
          <span className="text-xs font-semibold text-slate-500">Step {step} of 2</span>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            <Store className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-900">Store Setup Wizard</span>
        </div>

        <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tell us about your business</h2>
                <p className="text-xs text-slate-500 mt-1">This will be shown on your public storefront.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business / Store Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zuri Gourmet Bakes"
                    value={businessName}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Storefront Link (Slug) *</label>
                    {isCheckingSlug && (
                      <span className="inline-flex items-center gap-1 text-2xs text-blue-600 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                        Searching database...
                      </span>
                    )}
                  </div>

                  <div
                    className={`flex rounded-xl transition-all duration-150 border ${
                      slugStatus === 'available'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                        : slugStatus === 'taken' || slugStatus === 'invalid'
                        ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10'
                        : slugStatus === 'checking'
                        ? 'border-blue-400 ring-2 ring-blue-500/15'
                        : 'border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'
                    }`}
                  >
                    <span
                      className={`inline-flex items-center px-3.5 rounded-l-xl text-xs font-mono border-r transition-colors ${
                        slugStatus === 'available'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-semibold'
                          : slugStatus === 'taken' || slugStatus === 'invalid'
                          ? 'border-rose-500 bg-rose-50 text-rose-800 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      xhipa.com/
                    </span>
                    <div className="relative flex-1 flex items-center">
                      <input
                        type="text"
                        required
                        placeholder="zuri-bakes"
                        value={slug}
                        onChange={e => setSlug(slugify(e.target.value))}
                        className={`block w-full px-3.5 py-2.5 rounded-r-xl text-sm focus:outline-none font-mono bg-transparent ${
                          slugStatus === 'available'
                            ? 'text-emerald-950 font-medium'
                            : slugStatus === 'taken' || slugStatus === 'invalid'
                            ? 'text-rose-950 font-medium'
                            : 'text-slate-900'
                        }`}
                      />
                      <div className="absolute right-3 pointer-events-none">
                        {slugStatus === 'checking' && (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        )}
                        {slugStatus === 'available' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                        {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                          <XCircle className="w-4 h-4 text-rose-600" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Real-time Validation Status Notifications */}
                  {slugStatus === 'available' && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>
                        Storefront link is available: <strong className="font-mono text-emerald-800 font-semibold">xhipa.com/{slug}</strong>
                      </span>
                    </div>
                  )}

                  {(slugStatus === 'taken' || slugStatus === 'invalid') && (
                    <div className="flex items-start gap-2 mt-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-bold text-rose-900">
                          {slugStatus === 'taken' ? 'Link Already Exists' : 'Invalid Storefront Link'}
                        </p>
                        <p className="text-rose-700 leading-snug">{slugFeedback}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="08012345678"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                  <input
                    type="tel"
                    placeholder="08012345678 (defaults to phone if left empty)"
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!isFormValid}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  onClick={handleNextStep}
                >
                  {isCheckingSlug ? 'Verifying Store Link...' : 'Next: Choose Store Mode'}
                </Button>
                {!isSlugAvailable && slug.trim().length > 0 && !isCheckingSlug && (
                  <p className="text-2xs text-center text-rose-600 mt-2 font-medium">
                    {slugStatus === 'taken'
                      ? '⚠️ Next button disabled: This storefront link already exists in the database.'
                      : '⚠️ Next button disabled: Please provide a valid, unique storefront link.'}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Choose how customers buy</h2>
                <p className="text-xs text-slate-500 mt-1">You can change this anytime from Store Settings.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div
                  onClick={() => setMode('checkout')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                    mode === 'checkout'
                      ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-3 bg-blue-600 text-white rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Direct Online Checkout (Recommended)</h4>
                      {mode === 'checkout' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Customers add items to cart and pay securely via Paystack debit cards, transfers, and USSD.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setMode('catalogue')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start gap-4 ${
                    mode === 'catalogue'
                      ? 'border-blue-600 bg-blue-50/40 ring-4 ring-blue-600/10'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="p-3 bg-slate-900 text-white rounded-xl">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">Catalogue & WhatsApp Orders</h4>
                      {mode === 'catalogue' && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Customers view your catalog and click "Order on WhatsApp" to finalize orders directly with you.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  isLoading={isLoading}
                  onClick={handleFinish}
                >
                  Publish My Store & Add Products
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
