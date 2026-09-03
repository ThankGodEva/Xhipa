import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  Truck,
  MapPin,
  CreditCard,
  MessageCircle,
  CheckCircle2,
  Lock,
  ShoppingCart,
  AlertCircle,
  Store as StoreIcon,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PublicStorefrontData } from '../../types';
import { formatCurrency, formatWhatsAppOrderMessage } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { DemoStoreBanner } from '../../components/storefront/DemoStoreBanner';
import { isDemoStoreSlug } from '../../lib/demoStores';
import { isCustomDomainHost } from '../../lib/hostname';

export const StorefrontCheckoutPage: React.FC = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const { items, subtotalInKobo, clearCart } = useCart();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  const [storeData, setStoreData] = useState<PublicStorefrontData | null>(null);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDemo = isDemoStoreSlug(storeSlug);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryType, setDeliveryType] = useState<'flat' | 'pickup'>('flat');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'whatsapp'>('paystack');

  useEffect(() => {
    setIsLoadingStore(true);

    const loadCheckoutStore = async () => {
      try {
        if (storeSlug) {
          const res = await api.getPublicStore(storeSlug);
          setStoreData(res);
          if (!res.settings.enable_checkout && res.settings.show_whatsapp) {
            setPaymentMethod('whatsapp');
          }
        } else if (isCustomDomainHost()) {
          const res = await api.resolveStorefrontByHost();
          if (res.resolved && res.storefront) {
            const sf = {
              business: res.storefront.business,
              store: res.storefront.store,
              settings: res.storefront.settings,
              categories: res.storefront.categories,
              products: res.storefront.products,
              stories: res.storefront.stories
            };
            setStoreData(sf);
            if (!sf.settings.enable_checkout && sf.settings.show_whatsapp) {
              setPaymentMethod('whatsapp');
            }
          }
        }
      } catch (err) {
        console.error('Failed to load store for checkout:', err);
      } finally {
        setIsLoadingStore(false);
      }
    };

    loadCheckoutStore();
  }, [storeSlug]);

  if (isLoadingStore) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <StoreIcon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Store Not Found</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          The requested store link is unavailable.
        </p>
        <Link to="/">
          <Button variant="primary" size="md">
            Go to Xhipa Home
          </Button>
        </Link>
      </div>
    );
  }

  const { business, settings } = storeData;
  const themeColor = settings.primary_color || '#10B981';

  // Calculate delivery fee
  const deliveryFeeInKobo = deliveryType === 'pickup'
    ? 0
    : (settings.delivery_fee_type === 'flat' ? (settings.flat_delivery_fee || 0) : 0);

  const grandTotalInKobo = subtotalInKobo + deliveryFeeInKobo;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isDemo) {
      info('Sample Store Mode: Checkout and payment submissions are disabled on sample stores. Create your own free store to accept real customer orders!');
      return;
    }

    if (items.length === 0) {
      error('Your cart is empty. Please add products to check out.');
      return;
    }

    if (!customerName.trim()) {
      error('Please enter your full name.');
      return;
    }

    if (!customerPhone.trim()) {
      error('Please enter your phone number.');
      return;
    }

    if (deliveryType === 'flat' && !deliveryAddress.trim()) {
      error('Please enter your delivery address.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order server-side with authoritative item and price validation
      const checkoutResult = await api.checkout({
        storeSlug: storeSlug!,
        items: items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity
        })),
        customer: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim() || undefined,
          deliveryAddress: deliveryType === 'pickup' ? 'Store Pickup / Local Collect' : deliveryAddress.trim(),
          notes: deliveryNotes.trim() || undefined
        },
        deliveryType,
        orderSource: paymentMethod === 'whatsapp' ? 'whatsapp' : 'direct_checkout'
      });

      const { order, paymentRequired } = checkoutResult;

      // 2. Branch depending on payment method
      if (paymentMethod === 'paystack' && paymentRequired) {
        // Initialize Paystack transaction
        const callbackUrl = `${window.location.origin}/payment/callback`;
        const emailToUse = customerEmail.trim() || `${customerPhone.replace(/[^\d]/g, '')}@guest.store.ng`;

        const initRes = await api.initializePayment({
          orderId: order.id,
          email: emailToUse,
          amountInKobo: order.total,
          callbackUrl
        });

        // Clear local cart
        clearCart();

        // Redirect directly to Paystack authorization checkout URL
        window.location.href = initRes.authorization_url;
      } else {
        // WhatsApp flow or direct completion
        clearCart();

        if (paymentMethod === 'whatsapp' && business.whatsapp_number) {
          const formattedMessage = formatWhatsAppOrderMessage({
            businessName: business.name,
            customerName: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerAddress: deliveryAddress.trim(),
            items: items.map(i => ({
              productName: i.product.name,
              quantity: i.quantity,
              unitPriceInKobo: i.product.price,
              subtotalInKobo: i.product.price * i.quantity
            })),
            subtotalInKobo,
            deliveryFeeInKobo,
            totalInKobo: grandTotalInKobo,
            orderNumber: order.order_number,
            notes: deliveryNotes.trim()
          });

          const cleanWhatsApp = business.whatsapp_number.replace(/[^\d]/g, '');
          const waUrl = `https://wa.me/${cleanWhatsApp}?text=${encodeURIComponent(formattedMessage)}`;
          
          // Open WhatsApp in new tab and navigate to tracking page
          window.open(waUrl, '_blank');
          navigate(`/store/${storeSlug}/track/${order.order_number}`);
        } else {
          success('Order placed successfully!');
          navigate(`/store/${storeSlug}/track/${order.order_number}`);
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to place order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Sample Demo Store Banner */}
      {isDemo && <DemoStoreBanner storeName={business.name} />}

      <StoreHeader business={business} settings={settings} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to={`/${storeSlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        {/* Demo Mode Notice */}
        {isDemo && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-800 shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-slate-900">Sample Store Guest Checkout Preview</p>
                <p className="text-2xs text-amber-800">
                  This page demonstrates the fast guest checkout flow on Xhipa. Order submission and live payments are unclickable on sample stores.
                </p>
              </div>
            </div>
            <Link
              to="/register"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xs transition shadow-xs shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Free Store</span>
            </Link>
          </div>
        )}

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200/80 shadow-2xs max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-4">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Your cart is empty</h2>
            <p className="text-xs text-slate-500 mb-6">
              You don&apos;t have any products in your cart yet.
            </p>
            <Link to={`/${storeSlug}`}>
              <Button variant="primary" size="md">
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Customer & Delivery Details Form */}
            <div className="lg:col-span-7 space-y-6">
              <form id="checkout-form" onSubmit={handleSubmitOrder} className="space-y-6">
                {/* 1. Contact Info */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      1
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Customer Information</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chioma Adebayo"
                        value={customerName}
                        onChange={e => setCustomerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Phone Number <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="e.g. 0812 345 6789"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Email (Optional receipt)
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. chioma@gmail.com"
                          value={customerEmail}
                          onChange={e => setCustomerEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Delivery Method & Address */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      2
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Delivery Method</h3>
                  </div>

                  {/* Delivery Selection */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('flat')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        deliveryType === 'flat'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Truck className="w-4 h-4" />
                        <span className="text-xs font-bold">
                          {settings.flat_delivery_fee ? formatCurrency(settings.flat_delivery_fee) : 'Standard'}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Doorstep Delivery</p>
                        <p className={`text-3xs ${deliveryType === 'flat' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Express courier dispatch
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition cursor-pointer ${
                        deliveryType === 'pickup'
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <MapPin className="w-4 h-4" />
                        <span className="text-xs font-bold">FREE</span>
                      </div>
                      <div>
                        <p className="text-xs font-bold">Store Pickup</p>
                        <p className={`text-3xs ${deliveryType === 'pickup' ? 'text-slate-300' : 'text-slate-500'}`}>
                          Collect from our physical store
                        </p>
                      </div>
                    </button>
                  </div>

                  {/* Address Field if Doorstep Delivery */}
                  {deliveryType === 'flat' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Delivery Street Address <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="House / Street / Apartment / City / State"
                          value={deliveryAddress}
                          onChange={e => setDeliveryAddress(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                          Special Instructions / Landmark (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Ring bell or leave with security"
                          value={deliveryNotes}
                          onChange={e => setDeliveryNotes(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pickup Note */}
                  {deliveryType === 'pickup' && (
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                      <p className="font-bold text-slate-900 mb-0.5">Pickup Location:</p>
                      <p>{business.address || `${business.city || 'Lagos'}, ${business.country}`}</p>
                      <p className="text-2xs text-slate-500 mt-1">
                        We will notify you by phone or WhatsApp when your order is packed and ready.
                      </p>
                    </div>
                  )}
                </div>

                {/* 3. Payment Method */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                      3
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Payment Option</h3>
                  </div>

                  <div className="space-y-3">
                    {/* Paystack Online Payment */}
                    {settings.enable_checkout && (
                      <label
                        className={`flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer ${
                          paymentMethod === 'paystack'
                            ? 'border-slate-900 bg-slate-50/80 ring-1 ring-slate-900'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="paystack"
                          checked={paymentMethod === 'paystack'}
                          onChange={() => setPaymentMethod('paystack')}
                          className="mt-0.5 text-slate-900 focus:ring-slate-900"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Instant Card, Transfer, USSD (Paystack)
                            </span>
                            <CreditCard className="w-4 h-4 text-emerald-600" />
                          </div>
                          <p className="text-3xs text-slate-500 mt-0.5">
                            Pay safely via Bank Transfer, Debit Card, or USSD code.
                          </p>
                        </div>
                      </label>
                    )}

                    {/* Direct WhatsApp Ordering */}
                    {settings.show_whatsapp && (
                      <label
                        className={`flex items-start gap-3 p-4 rounded-2xl border transition cursor-pointer ${
                          paymentMethod === 'whatsapp'
                            ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="whatsapp"
                          checked={paymentMethod === 'whatsapp'}
                          onChange={() => setPaymentMethod('whatsapp')}
                          className="mt-0.5 text-emerald-600 focus:ring-emerald-600"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              Order & Chat via WhatsApp
                            </span>
                            <MessageCircle className="w-4 h-4 text-emerald-600" />
                          </div>
                          <p className="text-3xs text-slate-500 mt-0.5">
                            Connect with our store directly on WhatsApp to confirm order and transfer details.
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </form>
            </div>

            {/* Right: Order Summary Sticky Card */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs sticky top-6 space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
                  <span className="text-xs font-semibold text-slate-500">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-3 max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {items.map(item => {
                    const img = item.product.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200';
                    return (
                      <div key={item.product.id} className="pt-3 first:pt-0 flex items-center gap-3">
                        <img
                          src={img}
                          alt={item.product.name}
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-semibold text-slate-900 truncate">
                            {item.product.name}
                          </h4>
                          <span className="text-2xs text-slate-500">
                            Qty: {item.quantity} × {formatCurrency(item.product.price)}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 shrink-0">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Calculation Breakdown */}
                <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(subtotalInKobo)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-semibold text-slate-900">
                      {deliveryFeeInKobo === 0 ? 'FREE' : formatCurrency(deliveryFeeInKobo)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-slate-900">
                    <span className="text-sm">Grand Total</span>
                    <span className="text-xl font-black">{formatCurrency(grandTotalInKobo)}</span>
                  </div>
                </div>

                {/* CTA Submit Button (or Disabled Sample Button if isDemo) */}
                {isDemo ? (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      disabled={true}
                      aria-disabled="true"
                      className="w-full py-3.5 px-4 rounded-2xl text-xs font-bold text-slate-400 bg-slate-200 border border-slate-300 flex items-center justify-center gap-2 cursor-not-allowed opacity-75 shadow-none select-none"
                      title="Checkout is disabled for this sample store preview"
                      onClick={() => info('Sample Mode: Live checkout is disabled on demo stores.')}
                    >
                      <Lock className="w-4 h-4 text-slate-400" />
                      <span>Checkout Disabled (Sample Store Only)</span>
                    </button>
                    <Link
                      to="/register"
                      className="w-full py-3 px-4 rounded-2xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create Your Store Free</span>
                    </Link>
                  </div>
                ) : (
                  <Button
                    form="checkout-form"
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                    isLoading={isSubmitting}
                    style={{ backgroundColor: themeColor }}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    {paymentMethod === 'paystack'
                      ? `Pay ${formatCurrency(grandTotalInKobo)} via Paystack`
                      : 'Complete WhatsApp Order'}
                  </Button>
                )}

                {/* Trust Badges */}
                <div className="flex items-center justify-center gap-1.5 text-2xs text-slate-400 pt-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-Bit SSL Encrypted • Direct Merchant Fulfillment</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

