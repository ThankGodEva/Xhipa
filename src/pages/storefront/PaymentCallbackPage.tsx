import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/common/Button';

export const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reference = searchParams.get('reference') || searchParams.get('trxref');
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');
  const [orderData, setOrderData] = useState<any>(null);

  useEffect(() => {
    if (!reference) {
      setStatus('failed');
      setErrorMessage('No payment reference found in query string.');
      return;
    }

    api.verifyPayment(reference)
      .then(async (res) => {
        if (res.success) {
          setStatus('success');
          if (res.orderId) {
            try {
              const orderRes = await api.trackOrder(res.orderId);
              setOrderData(orderRes.order);
            } catch {
              // Fallback
              setOrderData({ id: res.orderId, order_number: reference });
            }
          }
        } else {
          setStatus('failed');
          setErrorMessage(res.message || 'Payment could not be verified.');
        }
      })
      .catch(err => {
        setStatus('failed');
        setErrorMessage(err.message || 'Failed to communicate with payment processor.');
      });
  }, [reference]);

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/80 shadow-lg max-w-md w-full text-center space-y-6">
        {status === 'verifying' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Verifying Payment...</h2>
            <p className="text-xs text-slate-500">
              Please wait while we confirm your transaction with Paystack.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-black text-slate-900">Payment Confirmed!</h2>
            <p className="text-xs text-slate-600">
              Your order has been paid and dispatched to the merchant for processing.
            </p>

            {orderData && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Order Number:</span>
                  <span className="font-bold text-slate-900">{orderData.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-600">₦{(orderData.total_amount / 100).toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link to={orderData ? `/orders/track/${orderData.order_number}` : '/'}>
                <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  View Order Receipt
                </Button>
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Payment Incomplete</h2>
            <p className="text-xs text-rose-600">
              {errorMessage}
            </p>
            <div className="pt-2">
              <Link to="/">
                <Button variant="outline" size="md" className="w-full">
                  Return to Home
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
