import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  MapPin,
  Truck,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  Phone,
  Clock,
  BadgeCheck,
  ShoppingCart
} from 'lucide-react';
import { Business, StoreSettings } from '../../types';
import { ShareButton } from '../common/ShareButton';
import { useCart } from '../../context/CartContext';
import { resolveMediaUrl } from '../../lib/utils';

interface SocialStoreHeroProps {
  business: Business;
  settings: StoreSettings;
  storeSlug: string;
  hasStories?: boolean;
  onOpenStory?: () => void;
}

export const SocialStoreHero: React.FC<SocialStoreHeroProps> = ({
  business,
  settings,
  storeSlug,
  hasStories = false,
  onOpenStory
}) => {
  const { totalItems, setIsCartOpen } = useCart();
  const themeColor = settings.primary_color || '#10B981';
  const storeUrl = `${window.location.origin}/${storeSlug}`;
  const [logoError, setLogoError] = useState(false);
  const [bannerError, setBannerError] = useState(false);
  const resolvedLogo = resolveMediaUrl(business.logo_url);
  const resolvedBanner = resolveMediaUrl(business.banner_url || settings.banner_url);

  // Reset error states when branding media changes
  useEffect(() => {
    setLogoError(false);
  }, [business.logo_url]);

  useEffect(() => {
    setBannerError(false);
  }, [business.banner_url, settings.banner_url]);

  // High-aesthetic cover banner image fallback
  const defaultBannerImage =
    'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1400&auto=format&fit=crop&q=80';

  const bannerSource = !bannerError && resolvedBanner ? resolvedBanner : defaultBannerImage;

  return (
    <div className="bg-white border-b border-slate-100">
      {/* Top Visual Store Banner */}
      <div className="relative w-full h-44 sm:h-56 md:h-64 bg-slate-900 overflow-hidden">
        <img
          src={bannerSource}
          alt={`${business.name} Banner`}
          onError={() => setBannerError(true)}
          className="w-full h-full object-cover opacity-75 filter brightness-95"
        />
        {/* Soft gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20 pointer-events-none" />

        {/* Banner Announcement Tag */}
        {business.category && (
          <div className="absolute top-4 right-4 z-10 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-semibold shadow-sm">
            <span>{business.category}</span>
          </div>
        )}

        {/* Delivery / Announcement Badge at Bottom Right of Banner */}
        <div className="absolute bottom-4 right-4 sm:right-6 z-10 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-blue-900/85 backdrop-blur-md border border-blue-400/40 text-blue-100 text-2xs sm:text-xs font-bold flex items-center gap-1.5 shadow-sm">
            <Truck className="w-3.5 h-3.5 text-blue-300" />
            <span>Fast Nationwide Delivery</span>
          </div>
        </div>
      </div>

      {/* Main Profile Info Section */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8">
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-14 sm:-mt-16 md:-mt-20 mb-4 z-10">
          {/* Avatar (with Story Ring only when stories exist) */}
          <div className="flex items-end gap-4 sm:gap-6">
            {hasStories && onOpenStory ? (
              <button
                type="button"
                onClick={onOpenStory}
                className="relative p-1.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-blue-500 shadow-xl group focus:outline-none cursor-pointer shrink-0 transition-transform active:scale-95 ring-4 ring-white"
                title="Tap to view store story"
              >
                <div className="p-0.5 bg-white rounded-full">
                  {resolvedLogo && !logoError ? (
                    <img
                      src={resolvedLogo}
                      alt={business.name}
                      onError={() => setLogoError(true)}
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover group-hover:opacity-95 transition"
                    />
                  ) : (
                    <div
                      className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl"
                      style={{ backgroundColor: themeColor }}
                    >
                      {business.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="absolute bottom-0 right-2 px-2 py-0.5 rounded-full text-3xs font-extrabold bg-blue-600 text-white ring-2 ring-white uppercase tracking-wider shadow-sm">
                  Story
                </span>
              </button>
            ) : (
              <div className="relative p-1 bg-white rounded-full shadow-xl ring-4 ring-white shrink-0">
                {resolvedLogo && !logoError ? (
                  <img
                    src={resolvedLogo}
                    alt={business.name}
                    onError={() => setLogoError(true)}
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center text-white font-extrabold text-2xl md:text-3xl"
                    style={{ backgroundColor: themeColor }}
                  >
                    {business.name.charAt(0)}
                  </div>
                )}
              </div>
            )}

            {/* Profile Header on mobile */}
            <div className="md:hidden pb-1 min-w-0 mt-3 sm:mt-0 pt-2 sm:pt-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-xl font-extrabold text-slate-900 leading-tight truncate">
                  {business.name}
                </h1>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 fill-emerald-50" />
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center flex-wrap gap-2 pt-2 md:pt-0 max-w-full">
            {settings.show_whatsapp && business.whatsapp_number && (
              <a
                href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                  `Hello ${business.name}, I am browsing your store and would love some help!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm cursor-pointer shrink-0"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-100"></span>
                </span>
                <span className="hidden xs:inline">Chat on WhatsApp</span>
                <span className="xs:hidden">WhatsApp</span>
              </a>
            )}

            {settings.enable_checkout && (
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="relative inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-2xs cursor-pointer shrink-0"
                title="Open Shopping Cart"
              >
                <ShoppingCart className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="hidden sm:inline">Cart</span>
                {totalItems > 0 && (
                  <span
                    style={{ backgroundColor: themeColor }}
                    className="px-1.5 py-0.2 rounded-full text-3xs font-extrabold text-white shadow-xs"
                  >
                    {totalItems}
                  </span>
                )}
              </button>
            )}

            <ShareButton
              storeUrl={storeUrl}
              storeName={business.name}
              variant="outline"
              size="md"
              compactOnMobile={true}
            />
          </div>
        </div>

        {/* Bio & Details Area */}
        <div className="space-y-3">
          {/* Desktop Title */}
          <div className="hidden md:block">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {business.name}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-blue-200/60">
                <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
              </span>
            </div>
          </div>

          {/* Description / Bio */}
          {business.description && (
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-normal max-w-3xl">
              {business.description}
            </p>
          )}

          {/* Trust & Location Information Chips */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-2xs sm:text-xs text-slate-600 font-medium">
            {business.address && (
              <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{business.address}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>100% Authentic Quality</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
