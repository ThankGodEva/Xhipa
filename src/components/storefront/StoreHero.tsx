import React from 'react';
import { Truck, ShieldCheck, MapPin, Share2 } from 'lucide-react';
import { Business, StoreSettings } from '../../types';
import { ShareButton } from '../common/ShareButton';

export interface StoreHeroProps {
  business: Business;
  settings: StoreSettings;
  storeSlug: string;
}

export const StoreHero: React.FC<StoreHeroProps> = ({ business, settings, storeSlug }) => {
  const storeUrl = `${window.location.origin}/${storeSlug}`;

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          {business.description && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {business.description}
            </p>
          )}

          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500 font-medium">
            {business.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {business.address}
              </span>
            )}
            {settings.delivery_information && (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/50">
                <Truck className="w-3.5 h-3.5" />
                Nationwide Delivery
              </span>
            )}
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Direct from Merchant
            </span>
          </div>
        </div>

        {/* Share Store Action */}
        <div className="shrink-0 flex items-center gap-2">
          <ShareButton
            storeUrl={storeUrl}
            storeName={business.name}
            variant="outline"
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
