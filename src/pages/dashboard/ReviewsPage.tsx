import React, { useState, useEffect } from 'react';
import {
  Star,
  Sparkles,
  CheckCircle2,
  ThumbsUp,
  Search,
  Filter,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Edit,
  Camera,
  ShieldCheck,
  Award,
  Loader2,
  X,
  Upload,
  MessageSquare
} from 'lucide-react';
import { api } from '../../lib/api';
import { StoreReview, ReviewStats, Product } from '../../types';
import { formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { useToast } from '../../context/ToastContext';

export const ReviewsPage: React.FC = () => {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | '5star' | 'featured' | 'pending' | 'verified'>('all');
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<StoreReview | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // New review form
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newProductId, setNewProductId] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [newIsVerified, setNewIsVerified] = useState(true);
  const [newIsFeatured, setNewIsFeatured] = useState(false);
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  const loadReviews = async () => {
    setLoading(true);
    try {
      const [reviewsRes, productsRes] = await Promise.all([
        api.getMerchantReviews(),
        api.getMerchantProducts().catch(() => ({ products: [] }))
      ]);

      setReviews(reviewsRes.reviews || []);
      setStats(reviewsRes.stats || null);
      setProducts(productsRes.products || []);
    } catch (err: any) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (newPhotos.length >= 4) {
      error('Maximum 4 photos allowed.');
      return;
    }

    setIsUploading(true);
    try {
      const res = await api.uploadMedia(files[0], { folder: 'reviews' });
      setNewPhotos(prev => [...prev, res.url]);
      success('Photo attached');
    } catch (err: any) {
      error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleToggleFeatured = async (review: StoreReview) => {
    const newFeatured = !review.is_featured;
    try {
      setReviews(prev =>
        prev.map(r => (r.id === review.id ? { ...r, is_featured: newFeatured } : r))
      );
      await api.updateMerchantReview(review.id, { is_featured: newFeatured });
      success(newFeatured ? 'Review pinned to storefront!' : 'Review unpinned');
    } catch (err: any) {
      error(err.message || 'Failed to update review');
      loadReviews();
    }
  };

  const handleToggleApproval = async (review: StoreReview) => {
    const newApproval = !review.is_approved;
    try {
      setReviews(prev =>
        prev.map(r => (r.id === review.id ? { ...r, is_approved: newApproval } : r))
      );
      await api.updateMerchantReview(review.id, { is_approved: newApproval });
      success(newApproval ? 'Review published to store' : 'Review hidden from store');
    } catch (err: any) {
      error(err.message || 'Failed to update review');
      loadReviews();
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;

    try {
      setReviews(prev => prev.filter(r => r.id !== id));
      await api.deleteMerchantReview(id);
      success('Review deleted');
    } catch (err: any) {
      error(err.message || 'Failed to delete review');
      loadReviews();
    }
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) {
      error('Please enter customer name');
      return;
    }
    if (!newComment.trim()) {
      error('Please enter review comment');
      return;
    }

    let prodName = newProductName;
    if (newProductId) {
      const p = products.find(prod => prod.id === newProductId);
      if (p) prodName = p.name;
    }

    setIsSubmitting(true);
    try {
      const created = await api.createMerchantReview({
        customer_name: newCustomerName.trim(),
        location: newLocation.trim() || undefined,
        product_id: newProductId || undefined,
        product_name: prodName.trim() || undefined,
        rating: newRating,
        comment: newComment.trim(),
        photos: newPhotos,
        is_verified: newIsVerified,
        is_approved: true,
        is_featured: newIsFeatured,
        order_number: newOrderNumber.trim() || undefined
      });

      setReviews(prev => [created, ...prev]);
      success('Testimonial / Review added successfully!');
      setIsAddModalOpen(false);
      
      // Reset form
      setNewCustomerName('');
      setNewLocation('');
      setNewProductId('');
      setNewProductName('');
      setNewRating(5);
      setNewComment('');
      setNewPhotos([]);
      setNewIsVerified(true);
      setNewIsFeatured(false);
      setNewOrderNumber('');
    } catch (err: any) {
      error(err.message || 'Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    const matchesSearch =
      r.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.product_name && r.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.order_number && r.order_number.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === '5star') return r.rating === 5;
    if (selectedFilter === 'featured') return r.is_featured;
    if (selectedFilter === 'pending') return !r.is_approved;
    if (selectedFilter === 'verified') return r.is_verified;
    return true;
  });

  const averageRating = stats?.average_rating || (reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length) : 5.0);
  const verifiedCount = reviews.filter(r => r.is_verified).length;
  const featuredCount = reviews.filter(r => r.is_featured).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <span>Customer Reviews & Testimonials</span>
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-400" />
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage storefront reviews, approve ratings, and import WhatsApp/Instagram customer feedback.
          </p>
        </div>

        <Button
          variant="primary"
          size="md"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Testimonial / Review</span>
        </Button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Average Rating</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex items-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
          </div>
          <p className="text-3xs text-slate-400">Calculated across all reviews</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Total Reviews</span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">
            {reviews.length}
          </div>
          <p className="text-3xs text-slate-400">{reviews.filter(r => r.is_approved).length} active on store</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Verified Buyers</span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">
            {verifiedCount}
          </div>
          <p className="text-3xs text-slate-400">
            {reviews.length > 0 ? `${Math.round((verifiedCount / reviews.length) * 100)}% verification rate` : '0%'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
          <span className="text-xs font-semibold text-slate-500">Featured on Top</span>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">
            {featuredCount}
          </div>
          <p className="text-3xs text-slate-400">Pinned showcase reviews</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer, text, or product..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({reviews.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('5star')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedFilter === '5star'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>5 Stars</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('featured')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedFilter === 'featured'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>⭐ Pinned</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('verified')}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedFilter === 'verified'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verified</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
              selectedFilter === 'pending'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Hidden / Drafts
          </button>
        </div>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Star className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No reviews found</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Try clearing your search query.'
              : 'Add your first customer testimonial or quote from WhatsApp!'}
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-2"
          >
            Add Testimonial
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredReviews.map(rev => (
            <div
              key={rev.id}
              className={`bg-white rounded-3xl p-6 border transition space-y-4 flex flex-col justify-between ${
                rev.is_featured
                  ? 'border-amber-300 ring-2 ring-amber-100 shadow-xs'
                  : rev.is_approved
                  ? 'border-slate-200/80 shadow-2xs'
                  : 'border-slate-200 bg-slate-50/60 opacity-85'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {rev.customer_avatar ? (
                      <img
                        src={rev.customer_avatar}
                        alt={rev.customer_name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                        {rev.customer_name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900">{rev.customer_name}</span>
                        {rev.is_verified && (
                          <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        )}
                        {rev.is_featured && (
                          <span className="inline-flex items-center gap-0.5 text-3xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200">
                            ⭐ Pinned
                          </span>
                        )}
                      </div>
                      <p className="text-3xs text-slate-400">
                        {rev.location && `${rev.location} • `}
                        {formatDate(rev.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${
                          s <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-200 fill-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Product & Order tags */}
                <div className="flex flex-wrap gap-2">
                  {rev.product_name && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-3xs font-semibold">
                      Product: {rev.product_name}
                    </span>
                  )}
                  {rev.order_number && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-3xs font-mono font-semibold">
                      #{rev.order_number}
                    </span>
                  )}
                  <span className="inline-block px-2 py-0.5 rounded-md bg-slate-50 text-slate-500 text-3xs">
                    Source: {rev.source === 'merchant_manual' ? 'Manual Testimonial' : 'Direct Customer'}
                  </span>
                </div>

                {/* Review Text */}
                <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  "{rev.comment}"
                </p>

                {/* Photos */}
                {rev.photos && rev.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {rev.photos.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhoto(p)}
                        className="relative group rounded-xl overflow-hidden cursor-pointer"
                      >
                        <img
                          src={p}
                          alt="Customer review photo"
                          className="w-16 h-16 rounded-xl object-cover border border-slate-100 shadow-2xs group-hover:scale-105 transition"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Actions for Merchant */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  {/* Toggle Featured */}
                  <button
                    type="button"
                    onClick={() => handleToggleFeatured(rev)}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-2xs font-semibold ${
                      rev.is_featured
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={rev.is_featured ? 'Unpin from top' : 'Pin to top of storefront'}
                  >
                    <Star className={`w-3.5 h-3.5 ${rev.is_featured ? 'fill-amber-500 text-amber-500' : ''}`} />
                    <span>{rev.is_featured ? 'Pinned' : 'Pin'}</span>
                  </button>

                  {/* Toggle Approved */}
                  <button
                    type="button"
                    onClick={() => handleToggleApproval(rev)}
                    className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-2xs font-semibold ${
                      rev.is_approved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                    title={rev.is_approved ? 'Hide from store' : 'Publish to store'}
                  >
                    {rev.is_approved ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span>{rev.is_approved ? 'Visible' : 'Hidden'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteReview(rev.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                  title="Delete review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Review / Testimonial Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="flex min-h-full items-start sm:items-center justify-center p-3.5 sm:p-6 text-center">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-auto my-4 sm:my-8 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Add Customer Testimonial</span>
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Import feedback from WhatsApp, Instagram, or in-person clients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddReview} className="space-y-4 pt-4">
              {/* Rating selection */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Rating</label>
                <div className="flex items-center justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setNewRating(s)}
                      className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          s <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newCustomerName}
                    onChange={e => setNewCustomerName(e.target.value)}
                    placeholder="e.g. Zainab Aliyu"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={e => setNewLocation(e.target.value)}
                    placeholder="e.g. Abuja, FCT"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Purchased (Optional)
                </label>
                <select
                  value={newProductId}
                  onChange={e => {
                    setNewProductId(e.target.value);
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) setNewProductName(p.name);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
                >
                  <option value="">General Store Testimonial</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Testimonial Quote */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Quote / Review <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Paste WhatsApp message or customer feedback..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden resize-none"
                  required
                />
              </div>

              {/* Photo Proof */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Attach Screenshots / Photos
                </label>
                <div className="flex flex-wrap items-center gap-2.5">
                  {newPhotos.map((p, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={p} alt="Proof" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewPhotos(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {newPhotos.length < 4 && (
                    <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 transition text-slate-400 hover:text-slate-600">
                      {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <>
                          <Camera className="w-4 h-4" />
                          <span className="text-3xs font-medium">Add</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Badges and toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsVerified}
                    onChange={e => setNewIsVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900"
                  />
                  <span className="font-semibold text-slate-700">Display "Verified Buyer" badge</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsFeatured}
                    onChange={e => setNewIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded text-slate-900"
                  />
                  <span className="font-semibold text-slate-700">Pin to top of storefront (Featured)</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                >
                  Save Testimonial
                </Button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-transparent rounded-2xl overflow-hidden">
            <img
              src={selectedPhoto}
              alt="Photo preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
