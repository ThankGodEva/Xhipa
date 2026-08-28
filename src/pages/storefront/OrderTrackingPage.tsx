import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Truck,
  Package,
  MapPin,
  MessageCircle,
  Phone,
  ArrowLeft,
  Share2,
  AlertCircle,
  Copy,
  Check,
  Store as StoreIcon
} from 'lucide-react';
import { api } from '../../lib/api';
import { Order, Business, StoreSettings } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';

export const OrderTrackingPage: React.FC = () => {
  const { storeSlug, orderNumber } = useParams<{ storeSlug?: string; orderNumber: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCopied, setHasCopied] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!orderNumber) return;
    setIsLoading(true);
    api.trackOrder(orderNumber)
      .then(res => {
        setOrder(res.order);
        setBusiness(res.business);
        setSettings(res.settings);
      })
      .catch(err => {
        console.error('Failed to load order:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [orderNumber]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setHasCopied(true);
    success('Tracking link copied to clipboard');
    setTimeout(() => setHasCopied(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Order Not Found</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          We couldn't find an order matching #{orderNumber}.
        </p>
        <Link to={storeSlug ? `/${storeSlug}` : '/'}>
          <Button variant="primary" size="md">
            {storeSlug ? 'Return to Store' : 'Go Home'}
          </Button>
        </Link>
      </div>
    );
  }

  const steps = [
    { key: 'placed', label: 'Order Placed', desc: 'Order received by store', icon: Clock, isDone: true },
    { key: 'confirmed', label: 'Confirmed', desc: 'Prepared by merchant', icon: Package, isDone: order.status !== 'pending' && order.status !== 'cancelled' },
    { key: 'shipped', label: 'In Transit', desc: 'Dispatched for delivery', icon: Truck, isDone: order.status === 'shipped' || order.status === 'completed' },
    { key: 'completed', label: 'Delivered', desc: 'Order fulfilled', icon: CheckCircle2, isDone: order.status === 'completed' },
  ];

  const currentStoreSlug = storeSlug || business?.slug || '';

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <Link
            to={currentStoreSlug ? `/${currentStoreSlug}` : '/'}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{business?.name || 'Back to Store'}</span>
          </Link>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer"
          >
            {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{hasCopied ? 'Link Copied' : 'Share Tracking'}</span>
          </button>
        </div>

        {/* Hero Order Status Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xs font-bold uppercase tracking-wider text-slate-400">Order Reference</span>
                <Badge
                  variant={
                    order.status === 'completed' ? 'emerald' :
                    order.status === 'confirmed' ? 'blue' :
                    order.status === 'shipped' ? 'purple' : 'amber'
                  }
                  size="sm"
                >
                  {order.status.toUpperCase()}
                </Badge>
              </div>
              <h1 className="text-2xl font-black text-slate-900 font-mono">
                {order.order_number}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Placed on {formatDate(order.created_at)}
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
              <span className="text-2xl font-black text-slate-900">{formatCurrency(order.total_amount)}</span>
              <div className="mt-1">
                <Badge variant={order.payment_status === 'paid' ? 'emerald' : 'amber'} size="sm">
                  {order.payment_status === 'paid' ? 'Paid via Paystack' : 'Payment Pending / Transfer'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="py-2">
            <h3 className="text-xs font-bold text-slate-900 mb-4">Fulfillment Progress</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div
                    key={step.key}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      step.isDone
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-5 h-5 ${step.isDone ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-3xs font-bold px-1.5 py-0.5 rounded-md bg-white/10">
                        0{idx + 1}
                      </span>
                    </div>
                    <span className="text-xs font-bold block">{step.label}</span>
                    <span className={`text-3xs ${step.isDone ? 'text-slate-300' : 'text-slate-400'}`}>
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Customer & Delivery Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Customer Details
            </h3>
            <div className="space-y-1 text-xs">
              <p className="font-bold text-slate-900">{order.customer_name}</p>
              <p className="text-slate-600">{order.customer_phone}</p>
              {order.customer_email && <p className="text-slate-600">{order.customer_email}</p>}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider text-slate-400">
              Delivery Address
            </h3>
            <div className="space-y-1 text-xs">
              <p className="text-slate-700 font-medium">
                {order.delivery_address || 'Store Pickup'}
              </p>
              {order.customer_notes && (
                <p className="text-2xs text-slate-500 italic mt-2">
                  Note: "{order.customer_notes}"
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Order Items Breakdown */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
            Items in Order
          </h3>

          <div className="divide-y divide-slate-100">
            {order.items?.map(item => (
              <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900 block">{item.product_name}</span>
                  <span className="text-2xs text-slate-500">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </span>
                </div>
                <span className="font-bold text-slate-900">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.subtotal_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold text-slate-900">{formatCurrency(order.delivery_fee)}</span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
              <span>Total Paid</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Contact Merchant */}
        {business && (
          <div className="p-6 bg-slate-900 rounded-3xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Need help with your order?</h4>
              <p className="text-2xs text-slate-400 mt-0.5">
                Contact {business.name} directly via WhatsApp or phone call.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {business.whatsapp_number && (
                <a
                  href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(`Hi ${business.name}, I'm checking on my order #${order.order_number}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp Merchant</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
