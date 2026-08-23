import React from 'react';
import { Link } from 'react-router-dom';
import { Store, ShieldCheck, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 text-white">
              <img
                src="/Xhipa.png"
                alt="Xhipa Logo"
                className="w-8 h-8 rounded-lg object-contain bg-white p-0.5 shadow-2xs"
              />
              <span className="text-lg font-bold">Xhipa</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Digital storefront infrastructure for small businesses, Instagram sellers, and retailers.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/#features" className="hover:text-white transition">Catalogue Mode</Link></li>
              <li><Link to="/#features" className="hover:text-white transition">Direct Guest Checkout</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition">Pricing Plans</Link></li>
              <li><Link to="/chi-beauty" className="hover:text-white transition">Live Demo Store</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Demo Stores</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/chi-beauty" className="hover:text-white transition">Chi Beauty & Glow (Checkout)</Link></li>
              <li><Link to="/lagos-kicks" className="hover:text-white transition">Lagos Kicks (Catalogue Mode)</Link></li>
              <li><Link to="/admin" className="hover:text-white transition">Platform Admin Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-4">Security & Trust</h4>
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tenant RLS Isolated</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Payments powered by Paystack. Database secured with PostgreSQL Row Level Security (RLS).
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-800 flex items-center justify-center text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Xhipa Inc. Built for commerce everywhere.</p>
        </div>
      </div>
    </footer>
  );
};
