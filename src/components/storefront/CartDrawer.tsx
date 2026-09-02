import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingCart, ArrowRight, ShieldCheck, Lock, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../common/Button';
import { StoreSettings } from '../../types';
import { isDemoStoreSlug } from '../../lib/demoStores';
import { useToast } from '../../context/ToastContext';

export interface CartDrawerProps {
  storeSlug: string;
  settings: StoreSettings;
  isDemo?: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ storeSlug, settings, isDemo }) => {
  const { items, removeItem, updateQuantity, isCartOpen, setIsCartOpen, subtotalInKobo } = useCart();
  const { info } = useToast();
  const navigate = useNavigate();
  const themeColor = settings.primary_color || '#10B981';
  const isDemoMode = isDemo ?? isDemoStoreSlug(storeSlug);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    if (isDemoMode) {
      info('Sample Store Mode: Checkout and live payments are unclickable for this demo. Create your own free store to accept real orders!');
      return;
    }
    setIsCartOpen(false);
    navigate(`/${storeSlug}/checkout`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 w-full justify-end">
        <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-900" />
              <h2 className="text-base font-bold text-slate-900">Your Cart</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-slate-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <ShoppingCart className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Browse the products and add items to your cart to test the live cart experience.
                </p>
                <Button variant="outline" size="sm" onClick={() => setIsCartOpen(false)}>
                  Continue Shopping
                </Button>
              </div>
            ) : (
              items.map(item => {
                const img = item.product.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200';
                return (
                  <div key={item.product.id} className="py-4 flex gap-3.5">
                    <img
                      src={img}
                      alt={item.product.name}
                      className="w-18 h-18 rounded-xl object-cover bg-slate-100 border border-slate-200/80 shrink-0"
                    />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">
                          {item.product.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.product.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 transition"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>

                        {/* Quantity Controls */}
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-semibold text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-slate-900">{formatCurrency(subtotalInKobo)}</span>
                </div>
                <div className="flex justify-between text-2xs text-slate-500">
                  <span>Delivery Fee</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Estimated Total</span>
                <span className="text-base font-extrabold text-slate-900">{formatCurrency(subtotalInKobo)}</span>
              </div>

              {/* Demo Mode Notice & Disabled Checkout Button */}
              {isDemoMode ? (
                <div className="space-y-3">
                  <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-amber-900 text-2xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Sample Store (Checkout Disabled)</span>
                    </div>
                    <p className="text-amber-800 leading-snug">
                      This is an interactive demo for perusing features. Live checkout and payment processing are disabled for this sample store.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={true}
                    aria-disabled="true"
                    className="w-full py-3 px-4 rounded-xl text-xs font-bold text-slate-400 bg-slate-200 border border-slate-300 flex items-center justify-center gap-2 cursor-not-allowed opacity-75 shadow-none select-none"
                    title="Checkout is unclickable for this demo sample store"
                    onClick={handleCheckout}
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Checkout Disabled (Sample Only)</span>
                  </button>

                  <Link
                    to="/register"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Create Your Own Store Free</span>
                  </Link>
                </div>
              ) : (
                <>
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    onClick={handleCheckout}
                    style={{ backgroundColor: themeColor }}
                  >
                    Proceed to Checkout
                  </Button>

                  <div className="flex items-center justify-center gap-1.5 text-2xs text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Guest checkout • Secure payment via Paystack</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
