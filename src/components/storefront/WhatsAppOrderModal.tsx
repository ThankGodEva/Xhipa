import React, { useState } from 'react';
import { MessageCircle, Plus, Minus, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { Product, Business } from '../../types';
import { formatCurrency, generateWhatsAppOrderUrl } from '../../lib/utils';

export interface WhatsAppOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  business: Business;
  storeSlug: string;
}

export const WhatsAppOrderModal: React.FC<WhatsAppOrderModalProps> = ({
  isOpen,
  onClose,
  product,
  business,
  storeSlug
}) => {
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  if (!product) return null;

  const totalInKobo = product.price * quantity;
  const storeUrl = `${window.location.origin}/${storeSlug}/product/${product.slug}`;

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    const url = generateWhatsAppOrderUrl({
      phone: business.whatsapp_number || business.phone,
      businessName: business.name,
      items: [{ name: product.name, quantity, unitPriceInKobo: product.price }],
      totalInKobo,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      storeUrl
    });
    window.open(url, '_blank');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Order on WhatsApp"
      description={`Chat directly with ${business.name} to confirm stock and payment.`}
      maxWidth="md"
    >
      <form onSubmit={handleSendWhatsApp} className="space-y-4">
        {/* Product Snapshot */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
          <img
            src={product.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150'}
            alt={product.name}
            className="w-14 h-14 rounded-lg object-cover bg-white border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 truncate">{product.name}</h4>
            <p className="text-xs font-bold text-slate-900 mt-0.5">{formatCurrency(product.price)} each</p>
          </div>

          {/* Quantity selector */}
          <div className="flex items-center border border-slate-200 rounded-lg bg-white">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="p-1 text-slate-600 hover:bg-slate-50 transition"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2.5 text-xs font-semibold text-slate-900">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 text-slate-600 hover:bg-slate-50 transition"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Optional Customer Details */}
        <div className="space-y-3 pt-1">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">
            Optional details (auto-included in message)
          </p>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Your Full Name</label>
            <input
              type="text"
              placeholder="e.g. Tunde Balogun"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 08012345678"
              value={customerPhone}
              onChange={e => setCustomerPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Delivery Address</label>
            <textarea
              rows={2}
              placeholder="e.g. 15 Admiralty Way, Lekki Phase 1, Lagos"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Summary & Submit */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-2xs text-slate-400 block">Total</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalInKobo)}</span>
          </div>
          <Button
            type="submit"
            variant="whatsapp"
            size="md"
            leftIcon={<MessageCircle className="w-4 h-4 fill-white" />}
          >
            Continue on WhatsApp
          </Button>
        </div>
      </form>
    </Modal>
  );
};
