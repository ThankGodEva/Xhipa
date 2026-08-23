import React, { useState, useEffect } from 'react';
import { Users, Search, ShoppingBag, MessageCircle, Phone, Mail } from 'lucide-react';
import { api } from '../../lib/api';
import { Customer } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.getMerchantCustomers();
      setCustomers(res.customers || []);
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Directory</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Automatic customer records captured from guest checkout and orders.
        </p>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by customer name, phone number, or email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No customers found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Customers who checkout on your store will be automatically saved here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4">Customer Name</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">City / State</th>
                  <th className="py-3 px-4">Orders Placed</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4 text-right">Reach Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filtered.map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {cust.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-slate-900">{cust.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 space-y-0.5">
                      <span className="block text-slate-900">{cust.phone || '—'}</span>
                      <span className="block text-2xs text-slate-400">{cust.email || '—'}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-600">
                      {cust.city ? `${cust.city}, ${cust.state || 'NG'}` : '—'}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {cust.total_orders} orders
                    </td>

                    <td className="py-3 px-4 font-bold text-emerald-700">
                      {formatCurrency(cust.total_spend)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {cust.phone ? (
                        <a
                          href={`https://wa.me/${cust.phone.replace(/[^\d]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <span className="text-slate-300 text-2xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
