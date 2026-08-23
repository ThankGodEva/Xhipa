import React from 'react';
import { ShoppingCart, MessageCircle, Phone, Sparkles, CheckCircle2 } from 'lucide-react';
import { Business, StoreSettings } from '../../types';
import { useCart } from '../../context/CartContext';

export interface StoreHeaderProps {
  business: Business;
  settings: StoreSettings;
  visible?: boolean;
  isFloating?: boolean;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  business,
  settings,
  visible = true,
  isFloating = false
}) => {
  const { totalItems, setIsCartOpen } = useCart();
  const themeColor = settings.primary_color || '#10B981';

  return (
    <header
      style={{ backgroundColor: themeColor }}
      className={`${
        isFloating
          ? 'fixed top-0 left-0 right-0 z-50 border-b border-black/10 shadow-md transition-all duration-300 transform ' +
            (visible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none')
          : 'sticky top-0 z-40 border-b border-black/10 shadow-xs'
      }`}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          {settings.show_logo && business.logo_url ? (
            <img
              src={business.logo_url}
              alt={business.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/50 shadow-xs"
            />
          ) : (
            <div
              style={{ color: themeColor }}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-white font-bold text-base shadow-xs"
            >
              {business.name.charAt(0)}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-sm sm:text-base font-extrabold text-white leading-tight truncate max-w-[170px] sm:max-w-xs">
                {business.name}
              </h1>
              <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20 shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-3xs sm:text-2xs text-white/80 font-medium">
              <span className="flex items-center gap-1 text-white font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Online Store
              </span>
              {business.city && <span className="text-white/80">• {business.city}, {business.state || 'NG'}</span>}
            </div>
          </div>
        </div>

        {/* Actions (WhatsApp & Cart) */}
        <div className="flex items-center gap-2">
          {settings.show_whatsapp && business.whatsapp_number && (
            <a
              href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                `Hello ${business.name}, I am visiting your store and would like to make an inquiry!`
              )}`}
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold text-slate-900 bg-white hover:bg-slate-50 transition border border-white/80 shadow-2xs"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
              <span>WhatsApp Chat</span>
            </a>
          )}

          {settings.enable_checkout && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2.5 rounded-xl bg-black/20 hover:bg-black/30 text-white transition shadow-sm cursor-pointer border border-white/20"
              aria-label="Open Shopping Cart"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              {totalItems > 0 && (
                <span
                  style={{ color: themeColor }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-2xs font-extrabold flex items-center justify-center bg-white ring-2 ring-black/10 animate-scale shadow-sm"
                >
                  {totalItems}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
