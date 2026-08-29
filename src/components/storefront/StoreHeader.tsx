import React, { useState, useEffect } from 'react';
import { ShoppingCart, MessageCircle, Phone, Sparkles, CheckCircle2 } from 'lucide-react';
import { Business, StoreSettings } from '../../types';
import { useCart } from '../../context/CartContext';
import { resolveMediaUrl } from '../../lib/utils';

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
  const [imgError, setImgError] = useState(false);
  const resolvedLogo = resolveMediaUrl(business.logo_url);

  // Reset image error state when business logo changes
  useEffect(() => {
    setImgError(false);
  }, [business.logo_url]);

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
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1 pr-2">
          {settings.show_logo && resolvedLogo && !imgError ? (
            <img
              src={resolvedLogo}
              alt={business.name}
              onError={() => setImgError(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-white/50 shadow-xs shrink-0"
            />
          ) : (
            <div
              style={{ color: themeColor }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-white font-bold text-sm sm:text-base shadow-xs shrink-0"
            >
              {business.name.charAt(0)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 min-w-0">
              <h1 className="text-xs sm:text-base font-extrabold text-white leading-snug truncate">
                {business.name}
              </h1>
              <CheckCircle2 className="w-3.5 h-3.5 text-white fill-white/20 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 text-3xs sm:text-2xs text-white/85 font-medium whitespace-nowrap min-w-0 overflow-hidden mt-0.5">
              <span className="inline-flex items-center gap-1 text-white font-semibold shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse shrink-0" />
                Online Store
              </span>
              {business.city && (
                <>
                  <span className="text-white/40 shrink-0">•</span>
                  <span className="text-white/80 truncate">
                    {business.city}
                  </span>
                </>
              )}
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
