import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight } from 'lucide-react';

interface DemoStoreBannerProps {
  storeName: string;
}

export const DemoStoreBanner: React.FC<DemoStoreBannerProps> = ({ storeName }) => {
  return (
    <aside aria-label="Demo store sample notice" className="bg-slate-950 text-white border-b border-slate-800/80 relative z-50">
      <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-2 sm:py-2.5">
        {/* Mobile View (< sm) */}
        <div className="sm:hidden flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-3xs font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wide shrink-0 shadow-2xs">
              <Sparkles className="w-2.5 h-2.5 text-slate-950" />
              Demo
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                to="/register"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-3xs font-bold transition shadow-xs"
              >
                <span>Create Store</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-3xs font-medium transition"
              >
                <span>Exit</span>
              </Link>
            </div>
          </div>
          <p className="text-slate-300 text-3xs leading-relaxed">
            Browsing <strong className="text-white font-semibold">{storeName}</strong> live demo.{' '}
            <span className="text-amber-300/90 font-medium">Checkout is disabled in demo mode.</span>
          </p>
        </div>

        {/* Desktop / Tablet View (>= sm) */}
        <div className="hidden sm:flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-extrabold bg-amber-400 text-slate-950 uppercase tracking-wider shrink-0 shadow-2xs">
              <Sparkles className="w-3 h-3 text-slate-950" />
              Demo
            </span>
            <p className="text-slate-200 text-xs truncate lg:text-clip">
              You are browsing the <strong className="text-white font-semibold">{storeName}</strong> live demo. Explore products, galleries, and test the cart.{' '}
              <span className="text-amber-300 font-medium">Checkout is disabled in demo mode.</span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/register"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-2xs font-bold transition shadow-xs"
            >
              <span>Create Your Store Free</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-2xs font-medium transition"
            >
              <span>Exit Demo</span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
};

