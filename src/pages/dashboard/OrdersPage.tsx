import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  MessageCircle,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck
} from 'lucide-react';
import { api } from '../../lib/api';
import { Order, OrderStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getMerchantOrders();
      setOrders(res.orders || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      const res = await api.updateOrderStatus(selectedOrder.id, status);
      setOrders(prev => prev.map(o => (o.id === selectedOrder.id ? res.order : o)));
      setSelectedOrder(res.order);
      success(`Order status updated to ${status}`);
    } catch (err: any) {
      error(err.message || 'Failed to update order status');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statuses: { label: string; value: string; count: number }[] = [
    { label: 'All Orders', value: 'all', count: orders.length },
    { label: 'Pending', value: 'pending', count: orders.filter(o => o.status === 'pending').length },
    { label: 'Confirmed', value: 'confirmed', count: orders.filter(o => o.status === 'confirmed').length },
    { label: 'Shipped', value: 'shipped', count: orders.filter(o => o.status === 'shipped').length },
    { label: 'Completed', value: 'completed', count: orders.filter(o => o.status === 'completed').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders & Fulfillment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer orders, delivery status, and payment records.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {statuses.map(tab => (
          <button
            key={tab.value}
            onClick={() => setSelectedStatus(tab.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
              selectedStatus === tab.value
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`px-1.5 py-0.2 rounded-full text-2xs ${selectedStatus === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by order number, customer name, phone, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No orders found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'Try matching another customer name or order number.' : 'Orders placed on your storefront will show up here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                      {order.order_number}
                    </td>

                    <td className="py-3 px-4">
                      <div>
                        <span className="font-semibold text-slate-900 block">{order.customer_name}</span>
                        <span className="text-2xs text-slate-400">{order.customer_phone}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-500">
                      {formatDate(order.created_at)}
                    </td>

                    <td className="py-3 px-4 font-bold text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant={order.payment_status === 'paid' ? 'emerald' : 'amber'} size="sm">
                        {order.payment_status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          order.status === 'completed' ? 'emerald' :
                          order.status === 'confirmed' ? 'blue' :
                          order.status === 'shipped' ? 'purple' : 'slate'
                        }
                        size="sm"
                      >
                        {order.status}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedOrder(order)}
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <Modal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          title={`Order ${selectedOrder.order_number}`}
          description={`Placed on ${formatDate(selectedOrder.created_at)}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Status & Update Bar */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                  Current Fulfillment Status
                </span>
                <Badge
                  variant={
                    selectedOrder.status === 'completed' ? 'emerald' :
                    selectedOrder.status === 'confirmed' ? 'blue' :
                    selectedOrder.status === 'shipped' ? 'purple' : 'amber'
                  }
                  size="md"
                >
                  {selectedOrder.status.toUpperCase()}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Update to:</span>
                <select
                  value={selectedOrder.status}
                  onChange={e => handleUpdateStatus(e.target.value as OrderStatus)}
                  disabled={isUpdating}
                  className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2">
                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                  Customer Information
                </span>
                <p className="text-slate-900 font-medium">{selectedOrder.customer_name}</p>
                <p className="text-slate-500">{selectedOrder.customer_email}</p>
                <p className="text-slate-500">{selectedOrder.customer_phone}</p>
                {selectedOrder.customer_phone && (
                  <div className="pt-2">
                    <a
                      href={`https://wa.me/${selectedOrder.customer_phone.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-2xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp Customer</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl border border-slate-200/80 bg-white space-y-2">
                <span className="font-bold text-slate-900 block border-b border-slate-100 pb-1">
                  Delivery Address
                </span>
                <p className="text-slate-700">{selectedOrder.delivery_address || 'Pickup / Store fulfillment'}</p>
                {selectedOrder.customer_notes && (
                  <div className="pt-2">
                    <span className="text-2xs font-semibold text-slate-400 block">Customer Notes:</span>
                    <p className="text-2xs text-slate-600 italic">{selectedOrder.customer_notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Order Items Table */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2">Ordered Items</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
                {selectedOrder.items?.map(item => (
                  <div key={item.id} className="p-3 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-900 block">{item.product_name}</span>
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
            </div>

            {/* Total Calculation */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedOrder.subtotal_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Fee</span>
                <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                <span>Total Paid / Due</span>
                <span>{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="md" onClick={() => setSelectedOrder(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
