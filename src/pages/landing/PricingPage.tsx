import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles, ArrowRight } from 'lucide-react';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../lib/utils';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 0,
      description: 'Ideal for hobbyists and early sellers starting out on social media.',
      maxProducts: '10 products',
      categories: false,
      checkout: false,
      whatsapp: true,
      branding: false,
      customDomain: false,
      analytics: false,
      popular: false,
      cta: 'Start Free'
    },
    {
      id: 'beginner',
      name: 'Beginner Plan',
      price: 135000, // 1,350 NGN
      description: 'For growing sellers who need more product catalogue capacity.',
      maxProducts: '30 products',
      categories: false,
      checkout: false,
      whatsapp: true,
      branding: false,
      customDomain: false,
      analytics: false,
      popular: false,
      cta: 'Get Beginner Plan'
    },
    {
      id: 'whatsapp_starter',
      name: 'WhatsApp Starter Plan',
      price: 299999, // 2,999.99 NGN
      description: 'For high-volume catalogue sellers who want expanded capacity on WhatsApp.',
      maxProducts: '100 products',
      categories: true,
      checkout: false,
      whatsapp: true,
      branding: false,
      customDomain: false,
      analytics: false,
      popular: false,
      cta: 'Get WhatsApp Plan'
    },
    {
      id: 'starter',
      name: 'Starter Plan',
      price: 500000, // 5,000 NGN
      description: 'For active merchants accepting automated online payments & guest checkout.',
      maxProducts: '100 products',
      categories: true,
      checkout: true,
      whatsapp: true,
      branding: false,
      customDomain: false,
      analytics: false,
      popular: true,
      cta: 'Get Starter Plan'
    },
    {
      id: 'business',
      name: 'Business Plan',
      price: 1500000, // 15,000 NGN
      description: 'For established retailers, mini-dropshippers and multi-product stores.',
      maxProducts: 'Unlimited',
      categories: true,
      checkout: true,
      whatsapp: true,
      branding: true,
      customDomain: true,
      analytics: true,
      popular: false,
      cta: 'Get Business Plan'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clear, Honest Pricing</span>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Plans built to scale with your sales
          </h1>
          <p className="mt-4 text-base text-slate-600">
            No hidden setup fees. Switch plans or cancel anytime directly from your dashboard.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 mb-16">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-3xl p-6 flex flex-col justify-between border ${
                plan.popular
                  ? 'border-2 border-emerald-600 shadow-xl relative'
                  : 'border-slate-200 shadow-2xs'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-2xs uppercase tracking-widest font-extrabold px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}

              <div>
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1 min-h-[36px]">{plan.description}</p>
                
                <div className="my-6">
                  <span className="text-3xl font-black text-slate-900">
                    {plan.price === 0 ? 'Free' : formatCurrency(plan.price)}
                  </span>
                  {plan.price > 0 && <span className="text-xs text-slate-500"> / month</span>}
                </div>

                <ul className="space-y-3 text-xs text-slate-600 mb-8 border-t border-slate-100 pt-4">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span><strong>{plan.maxProducts}</strong> listing capacity</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.categories ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className={!plan.categories ? 'text-slate-400' : 'font-medium text-slate-800'}>
                      {plan.categories ? 'Multiple Product Categories' : 'No Categories (Single Catalogue)'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.checkout ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span>Online Paystack Checkout</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>WhatsApp Order Generator</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.branding ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span>Remove Platform Branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    {plan.customDomain ? (
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span>Custom Domain Support</span>
                  </li>
                </ul>
              </div>

              <Button
                variant={plan.popular ? 'primary' : 'outline'}
                size="md"
                className="w-full"
                onClick={() => navigate('/register')}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
};
