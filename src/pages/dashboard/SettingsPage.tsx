import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Store,
  Palette,
  Truck,
  CreditCard,
  MessageCircle,
  Save,
  Check,
  Globe,
  ShieldCheck,
  Sparkles,
  Sliders,
  Loader2,
  CheckCircle2,
  Upload,
  Cloud,
  Image as ImageIcon,
  Database
} from 'lucide-react';
import { api } from '../../lib/api';
import { Business, Product, StoreSettings } from '../../types';
import { toKobo, toNaira, resolveMediaUrl, optimizeImageForUpload } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import { StoreStoriesManager } from '../../components/dashboard/StoreStoriesManager';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'stories'>('general');
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSlug, setStoreSlug] = useState('');
  const [subscription, setSubscription] = useState<any>(null);

  // Form states
  const [businessName, setBusinessName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoImageError, setLogoImageError] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [bannerUrl, setBannerUrl] = useState('');
  const [bannerImageError, setBannerImageError] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const bannerFileInputRef = useRef<HTMLInputElement | null>(null);

  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [primaryColor, setPrimaryColor] = useState('#10B981');
  const [colorSaveStatus, setColorSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const debounceTimerRef = useRef<any>(null);

  const [enableCheckout, setEnableCheckout] = useState(true);
  const [enableCatalogue, setEnableCatalogue] = useState(true);
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [deliveryFeeNaira, setDeliveryFeeNaira] = useState('2000');
  const [deliveryInfo, setDeliveryInfo] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadSettings();
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const [bizRes, subRes, prodRes] = await Promise.all([
        api.getMerchantBusiness(),
        api.getMerchantSubscription(),
        api.getMerchantProducts().catch(() => [])
      ]);

      const b = bizRes.business;
      const s = bizRes.settings;
      setBusiness(b);
      setSettings(s);
      setProducts(prodRes || []);
      setStoreSlug(bizRes.store?.slug || '');
      setSubscription(subRes);

      if (b) {
        setBusinessName(b.name || '');
        setLogoUrl(b.logo_url || '');
        setLogoImageError(false);
        setBannerUrl(b.banner_url || s?.banner_url || '');
        setBannerImageError(false);
        setDescription(b.description || '');
        setPhone(b.phone || '');
        setWhatsapp(b.whatsapp_number || '');
        setAddress(b.address || '');
        setCity(b.city || '');
        setState(b.state || '');
      }

      if (s) {
        setPrimaryColor(s.primary_color || '#10B981');
        if (s.banner_url && !b?.banner_url) {
          setBannerUrl(s.banner_url);
        }
        setEnableCheckout(s.enable_checkout);
        setEnableCatalogue(s.enable_catalogue);
        setShowWhatsapp(s.show_whatsapp);
        setDeliveryFeeNaira(toNaira(s.flat_delivery_fee || 0).toString());
        setDeliveryInfo(s.delivery_information || '');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleLogoUpload = async (files: FileList | null) => {
    const rawFile = files?.[0];
    if (!rawFile) return;
    setIsUploadingLogo(true);
    setLogoImageError(false);
    try {
      const file = await optimizeImageForUpload(rawFile, 1200, 0.9);
      const res = await api.uploadMedia(file, { folder: 'branding' });
      setLogoUrl(res.url);

      // Immediately save to business profile so merchant doesn't lose it
      await api.updateMerchantBusiness({
        name: businessName,
        logo_url: res.url,
        banner_url: bannerUrl,
        description,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state
      });

      success('Store logo uploaded and saved successfully');
    } catch (err: any) {
      error(err.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleRemoveLogo = async () => {
    setLogoUrl('');
    setLogoImageError(false);
    try {
      await api.updateMerchantBusiness({
        name: businessName,
        logo_url: '',
        banner_url: bannerUrl,
        description,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state
      });
      success('Store logo removed');
    } catch (err: any) {
      error(err.message || 'Failed to remove logo');
    }
  };

  const handleBannerUpload = async (files: FileList | null) => {
    const rawFile = files?.[0];
    if (!rawFile) return;
    setIsUploadingBanner(true);
    setBannerImageError(false);
    try {
      const file = await optimizeImageForUpload(rawFile, 1920, 0.88);
      const res = await api.uploadMedia(file, { folder: 'branding' });
      setBannerUrl(res.url);

      // Save to business profile
      await api.updateMerchantBusiness({
        name: businessName,
        logo_url: logoUrl,
        banner_url: res.url,
        description,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state
      });

      // Best effort update to store settings banner
      try {
        await api.updateStoreSettings({
          banner_url: res.url
        });
      } catch (storeErr) {
        console.warn('Store settings banner sync deferred to form save:', storeErr);
      }

      success('Storefront banner uploaded and saved successfully');
    } catch (err: any) {
      error(err.message || 'Failed to upload banner');
    } finally {
      setIsUploadingBanner(false);
      if (bannerFileInputRef.current) bannerFileInputRef.current.value = '';
    }
  };

  const handleRemoveBanner = async () => {
    setBannerUrl('');
    setBannerImageError(false);
    try {
      await api.updateMerchantBusiness({
        name: businessName,
        logo_url: logoUrl,
        banner_url: '',
        description,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state
      });
      try {
        await api.updateStoreSettings({
          banner_url: ''
        });
      } catch {}
      success('Storefront banner removed');
    } catch (err: any) {
      error(err.message || 'Failed to remove banner');
    }
  };

  const persistColorToDatabase = async (colorToSave: string) => {
    setColorSaveStatus('saving');
    try {
      let formattedColor = colorToSave.trim();
      if (!formattedColor.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(formattedColor)) {
        formattedColor = `#${formattedColor}`;
      }
      await api.updateStoreSettings({
        primary_color: formattedColor
      });
      setColorSaveStatus('saved');
      setTimeout(() => {
        setColorSaveStatus('idle');
      }, 2500);
    } catch (err) {
      console.error('Failed to auto-save color:', err);
      setColorSaveStatus('idle');
    }
  };

  const handlePresetSelect = (hex: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setPrimaryColor(hex);
    persistColorToDatabase(hex);
  };

  const handleColorPickerChange = (hex: string) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setPrimaryColor(hex);
    persistColorToDatabase(hex);
  };

  const handleHexInputChange = (text: string) => {
    let formatted = text;
    if (formatted && !formatted.startsWith('#')) {
      formatted = `#${formatted}`;
    }
    setPrimaryColor(formatted);

    // Validate hex format (3 or 6 hex digits after #)
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(formatted)) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        persistColorToDatabase(formatted);
      }, 350);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateMerchantBusiness({
        name: businessName,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        description,
        phone,
        whatsapp_number: whatsapp,
        address,
        city,
        state
      });

      await api.updateStoreSettings({
        primary_color: primaryColor,
        banner_url: bannerUrl,
        enable_checkout: enableCheckout,
        enable_catalogue: enableCatalogue,
        show_whatsapp: showWhatsapp,
        flat_delivery_fee: toKobo(Number(deliveryFeeNaira) || 0),
        delivery_information: deliveryInfo
      });

      success('Store settings updated successfully');
      loadSettings();
    } catch (err: any) {
      error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const colorPresets = [
    { label: 'Emerald Green', hex: '#10B981' },
    { label: 'Royal Blue', hex: '#2563EB' },
    { label: 'Deep Indigo', hex: '#4F46E5' },
    { label: 'Warm Rose', hex: '#E11D48' },
    { label: 'Amber Orange', hex: '#D97706' },
    { label: 'Dark Slate', hex: '#0F172A' },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Store Settings & Branding</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your storefront appearance, 5 story highlights, delivery rates, and checkout options.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'general'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          General & Delivery Settings
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'stories'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-600" />
          Storefront Stories (5 Highlights)
          <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-700 text-2xs font-bold">
            Live
          </span>
        </button>
      </div>

      {activeTab === 'stories' ? (
        <StoreStoriesManager products={products} />
      ) : (
        <form onSubmit={handleSave} className="space-y-8">
          {/* Quick Callout to Storefront Stories */}
          <div className="bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200/80 rounded-2xl p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-tr from-purple-500 via-pink-500 to-amber-400 rounded-xl text-white shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Customise Your 5 Storefront Stories</h4>
                <p className="text-2xs text-slate-600">
                  Update your Reviews, Packaging, Top Drops, How To Use, and FAQs highlights anytime.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('stories')}
              className="bg-white border-purple-300 text-purple-700 hover:bg-purple-50 shrink-0"
            >
              Edit Stories
            </Button>
          </div>

          {/* Storefront Mode & Features */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Storefront Selling Mode</h3>
                <p className="text-xs text-slate-500">Choose how your customers place orders on your link</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                enableCheckout ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={enableCheckout}
                  onChange={e => setEnableCheckout(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Enable Paystack Online Checkout</span>
                  <span className="text-2xs text-slate-500 leading-relaxed block mt-0.5">
                    Customers can add items to their cart and pay via Debit Card, Bank Transfer, or USSD.
                  </span>
                </div>
              </label>

              <label className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                showWhatsapp ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200'
              }`}>
                <input
                  type="checkbox"
                  checked={showWhatsapp}
                  onChange={e => setShowWhatsapp(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Enable Direct WhatsApp Ordering</span>
                  <span className="text-2xs text-slate-500 leading-relaxed block mt-0.5">
                    Display "Order on WhatsApp" button for customers who want to chat with you directly.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Store Appearance & Theme Color */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Brand Color & Theme</h3>
                  <p className="text-xs text-slate-500">Customize the primary accent color across your entire storefront</p>
                </div>
              </div>

              {/* Live Saving Status Indicator */}
              <div className="flex items-center gap-2">
                {colorSaveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-2xs font-semibold animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                    <span>Saving to store...</span>
                  </span>
                )}
                {colorSaveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-2xs font-bold border border-emerald-200 animate-fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Saved instantly!</span>
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                {colorPresets.map(preset => {
                  const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      type="button"
                      key={preset.hex}
                      onClick={() => handlePresetSelect(preset.hex)}
                      className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border text-xs font-semibold transition cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm bg-slate-50 scale-[1.02]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full shadow-xs shrink-0" style={{ backgroundColor: preset.hex }} />
                      <span className="text-slate-800">{preset.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-900 ml-0.5" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-700">Custom Hex Code:</label>
                  <div className="flex items-center gap-2">
                    <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
                      <input
                        type="color"
                        value={primaryColor.startsWith('#') && primaryColor.length === 7 ? primaryColor : '#10B981'}
                        onChange={e => handleColorPickerChange(e.target.value)}
                        className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer border-0 p-0"
                        title="Pick custom color"
                      />
                    </div>
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={e => handleHexInputChange(e.target.value)}
                      placeholder="#10B981"
                      maxLength={7}
                      className="w-28 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Live Preview Button */}
                <div className="flex items-center gap-2">
                  <span className="text-2xs text-slate-400 font-medium">Store Button Preview:</span>
                  <div
                    style={{ backgroundColor: primaryColor }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-2xs flex items-center gap-1.5 transition-all"
                  >
                    <span>Add to Cart</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Business Details & Brand Assets */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Business Profile & Brand Assets</h3>
                  <p className="text-xs text-slate-500">Contact information, store details and brand assets</p>
                </div>
              </div>

              <div>
                {business?.is_verified ? (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                    title="Your store has been verified by the platform admin"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                    <span>Verified Merchant</span>
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200"
                    title="Platform admin verification required for verified tick"
                  >
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    <span>Standard Store • Unverified</span>
                  </span>
                )}
              </div>
            </div>

            {/* Store Logo Upload */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl border-2 border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {resolveMediaUrl(logoUrl) && !logoImageError ? (
                    <img
                      src={resolveMediaUrl(logoUrl)}
                      alt="Store logo"
                      className="w-full h-full object-cover"
                      onError={() => setLogoImageError(true)}
                      onLoad={() => setLogoImageError(false)}
                    />
                  ) : (
                    <Store className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Store Logo</h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Upload your high-resolution brand logo (PNG, JPG, SVG)
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={logoFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={e => handleLogoUpload(e.target.files)}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingLogo}
                  onClick={() => logoFileInputRef.current?.click()}
                  className="bg-white text-xs gap-1.5"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                </Button>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-2xs font-semibold text-slate-400 hover:text-red-600 transition cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Storefront Banner Upload */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-20 h-12 rounded-xl border-2 border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center shadow-xs">
                  {resolveMediaUrl(bannerUrl) && !bannerImageError ? (
                    <img
                      src={resolveMediaUrl(bannerUrl)}
                      alt="Storefront banner"
                      className="w-full h-full object-cover"
                      onError={() => setBannerImageError(true)}
                      onLoad={() => setBannerImageError(false)}
                    />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Storefront Cover Banner</h4>
                  <p className="text-2xs text-slate-500 mt-0.5">
                    Recommended: 1400×400px (JPG, PNG, WebP). Displayed on your public storefront.
                  </p>
                </div>
              </div>

              <input
                type="file"
                ref={bannerFileInputRef}
                accept="image/*"
                className="hidden"
                onChange={e => handleBannerUpload(e.target.files)}
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingBanner}
                  onClick={() => bannerFileInputRef.current?.click()}
                  className="bg-white text-xs gap-1.5"
                >
                  {isUploadingBanner ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  <span>{isUploadingBanner ? 'Uploading...' : 'Upload Banner'}</span>
                </Button>
                {bannerUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="text-2xs font-semibold text-slate-400 hover:text-red-600 transition cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Name</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Public Store Slug</label>
                <input
                  type="text"
                  disabled
                  value={storeSlug}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-mono cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">WhatsApp Number</label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Business Tagline / Bio</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Store Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. 14 Admiralty Way, Lekki Phase 1, Lagos"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery & Shipping Settings */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-2xs space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delivery & Logistics</h3>
                <p className="text-xs text-slate-500">Configure checkout delivery fee and customer notes</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Flat Delivery Fee in Naira (₦)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm text-slate-400 font-bold">₦</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={deliveryFeeNaira}
                    onChange={e => setDeliveryFeeNaira(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
                <span className="text-2xs text-slate-400 mt-1 block">Added automatically at guest checkout (set 0 for Free Delivery).</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Delivery Timeframe & Information</label>
                <input
                  type="text"
                  placeholder="e.g. Same-day Lagos delivery, 2-3 days nationwide"
                  value={deliveryInfo}
                  onChange={e => setDeliveryInfo(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSaving}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save All Settings
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
