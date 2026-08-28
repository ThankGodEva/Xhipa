import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldAlert, Store } from 'lucide-react';

interface DemoStoreBannerProps {
  storeName: string;
}

export const DemoStoreBanner: React.FC<DemoStoreBannerProps> = ({ storeName }) => {
  return (
    <aside aria-label="Demo store sample notice" className="bg-slate-900 text-white border-b border-slate-800 relative z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider shrink-0">
            <Sparkles className="w-3 h-3 text-slate-950" />
            Sample Store Preview
          </span>
          <p className="text-slate-200 text-2xs sm:text-xs">
            You are browsing the <strong className="text-white font-semibold">{storeName}</strong> live demo. Explore products, galleries, and test the cart. <span className="text-amber-300 font-medium">Checkout buttons are unclickable for this sample preview.</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/register"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-2xs font-bold transition shadow-xs"
          >
            <span>Create Your Store Free</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-medium transition"
          >
            <span>Exit Demo</span>
          </Link>
        </div>
      </div>
    </aside>
  );
};
