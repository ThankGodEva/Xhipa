import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Package,
  Edit2,
  Trash2,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Tag
} from 'lucide-react';
import { api } from '../../lib/api';
import { Product, Category } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ProductFormModal } from './ProductFormModal';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [storeSlug, setStoreSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { success, error } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [prodsRes, catsRes, subRes, bizRes] = await Promise.all([
        api.getMerchantProducts(),
        api.getMerchantCategories(),
        api.getMerchantSubscription(),
        api.getMerchantBusiness()
      ]);
      setProducts(prodsRes.products || []);
      setCategories(catsRes.categories || []);
      setSubscription(subRes);
      setStoreSlug(bizRes.store?.slug || '');
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrUpdate = async (productData: any) => {
    if (editingProduct) {
      const res = await api.updateProduct(editingProduct.id, productData);
      setProducts(prev => prev.map(p => (p.id === editingProduct.id ? res.product : p)));
      success('Product updated successfully');
    } else {
      const res = await api.createProduct(productData);
      setProducts(prev => [res.product, ...prev]);
      success('Product created successfully');
    }
    loadProducts();
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProductId) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(deletingProductId);
      setProducts(prev => prev.filter(p => p.id !== deletingProductId));
      success('Product deleted');
      setDeletingProductId(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const maxProducts = subscription?.entitlements?.max_products ?? 10;
  const isUnlimited = maxProducts === -1;
  const isAtProductLimit = !isUnlimited && products.length >= maxProducts;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products & Catalogue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your store items, pricing, inventory, and visibility.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setEditingProduct(null);
              setIsFormOpen(true);
            }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* Plan Product Entitlement Notice */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-900">
              Product Capacity: <span className="font-bold text-emerald-700">{isUnlimited ? `${products.length} (Unlimited)` : `${products.length} / ${maxProducts} products`}</span> used
            </div>
            <p className="text-2xs text-slate-500">
              Current plan: <strong>{subscription?.plan?.name || 'Free Plan'}</strong>
            </p>
          </div>
        </div>

        {isAtProductLimit && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/dashboard/subscription')}
          >
            Upgrade Plan for More Slots
          </Button>
        )}
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Product Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-900 mb-1">No products found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              {searchQuery ? 'Try changing your search terms.' : 'Start adding products to your store catalogue.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => {
                setEditingProduct(null);
                setIsFormOpen(true);
              }}
            >
              Add First Product
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-2xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price (NGN)</th>
                  <th className="py-3 px-4">Stock</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredProducts.map(product => {
                  const img = product.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150';
                  const isOutOfStock = product.track_inventory && product.stock_quantity <= 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={img}
                            alt={product.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate max-w-xs">
                              {product.name}
                            </span>
                            <span className="text-2xs text-slate-400 font-mono">
                              /{product.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {product.category?.name || '—'}
                      </td>

                      <td className="py-3 px-4 font-bold text-slate-900">
                        {formatCurrency(product.price)}
                        {product.compare_at_price && product.compare_at_price > product.price && (
                          <span className="block text-2xs text-slate-400 line-through font-normal">
                            {formatCurrency(product.compare_at_price)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {product.track_inventory ? (
                          <span className={`font-medium ${isOutOfStock ? 'text-rose-600' : 'text-slate-700'}`}>
                            {product.stock_quantity} units
                          </span>
                        ) : (
                          <span className="text-slate-400">Unlimited</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {product.status === 'draft' ? (
                          <Badge variant="slate" size="sm">Draft (Hidden)</Badge>
                        ) : isOutOfStock ? (
                          <Badge variant="rose" size="sm">Out of Stock</Badge>
                        ) : product.featured ? (
                          <Badge variant="amber" size="sm">⭐ Featured</Badge>
                        ) : (
                          <Badge variant="emerald" size="sm">Live in Feed</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/${storeSlug}/product/${product.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                            title="View in storefront"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => {
                              setEditingProduct(product);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingProductId(product.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleCreateOrUpdate}
        product={editingProduct}
        categories={categories}
        isAtProductLimit={isAtProductLimit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingProductId)}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message="Are you sure you want to remove this product from your storefront? This action cannot be undone."
        confirmText="Delete Product"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
