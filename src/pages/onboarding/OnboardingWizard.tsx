import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, ArrowRight, ArrowLeft, CheckCircle2, Sparkles, MessageCircle, CreditCard } from 'lucide-react';
import { Button } from '../../components/common/Button';
import { slugify, isReservedSlug } from '../../lib/utils';
import { api } from '../../lib/api';
import { syncFullMerchantDataToSupabase } from '../../lib/supabaseSync';
import { getAttributedReferralCode, clearAttributedReferralCode } from '../../lib/referral';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const OnboardingWizard: React.FC = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [mode, setMode] = useState<'catalogue' | 'checkout'>('checkout');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();
  const navigate = useNavigate();

  // If user is not email verified, redirect to verify-email
  useEffect(() => {
    if (user && !user.is_email_verified) {
      navigate('/verify-email');
    }
  }, [user, navigate]);

  const handleTopBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleNameChange = (val: string) => {
    setBusinessName(val);
    if (!slug || slug === slugify(businessName)) {
      setSlug(slugify(val));
    }
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

      success('🎉 Your store is now live with the Free plan!');
      navigate('/dashboard/products');
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Storefront Link (Slug) *</label>
                  <div className="flex rounded-xl shadow-2xs">
                    <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-mono">
                      xhipa.com/
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="zuri-bakes"
                      value={slug}
                      onChange={e => setSlug(slugify(e.target.value))}
                      className="flex-1 min-w-0 block w-full px-3.5 py-2.5 rounded-none rounded-r-xl text-sm border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
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

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                rightIcon={<ArrowRight className="w-4 h-4" />}
                onClick={() => {
                  if (!businessName || !slug || !phone) {
                    error('Please enter your business name, store slug, and phone number.');
                    return;
                  }
                  setStep(2);
                }}
              >
                Next: Choose Store Mode
              </Button>
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
