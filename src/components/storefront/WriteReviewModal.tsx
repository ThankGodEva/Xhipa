import React, { useState } from 'react';
import {
  X,
  Star,
  Camera,
  CheckCircle2,
  ShieldCheck,
  Upload,
  Loader2,
  Trash2,
  Sparkles
} from 'lucide-react';
import { api } from '../../lib/api';
import { Business, Product, StoreReview } from '../../types';
import { Button } from '../common/Button';
import { useToast } from '../../context/ToastContext';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  products?: Product[];
  preselectedProduct?: Product;
  prefilledOrderNumber?: string;
  onReviewSubmitted?: (review: StoreReview) => void;
}

export const WriteReviewModal: React.FC<WriteReviewModalProps> = ({
  isOpen,
  onClose,
  business,
  products = [],
  preselectedProduct,
  prefilledOrderNumber = '',
  onReviewSubmitted
}) => {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [location, setLocation] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(preselectedProduct?.id || '');
  const [customProductName, setCustomProductName] = useState<string>(preselectedProduct?.name || '');
  const [orderNumber, setOrderNumber] = useState(prefilledOrderNumber);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { success, error } = useToast();

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 4) {
      error('You can upload up to 4 photos per review.');
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const file = files[0];
      const res = await api.uploadMedia(file, { folder: 'reviews' });
      setPhotos(prev => [...prev, res.url]);
      success('Photo attached');
    } catch (err: any) {
      error(err.message || 'Failed to upload photo');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      error('Please enter your name');
      return;
    }

    if (!comment.trim()) {
      error('Please enter your review feedback');
      return;
    }

    let prodName = customProductName;
    if (selectedProductId) {
      const p = products.find(prod => prod.id === selectedProductId);
      if (p) prodName = p.name;
    }

    setIsSubmitting(true);
    try {
      const newReview = await api.submitStoreReview(business.slug, {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim() || undefined,
        location: location.trim() || undefined,
        product_id: selectedProductId || undefined,
        product_name: prodName || undefined,
        rating,
        comment: comment.trim(),
        photos,
        order_number: orderNumber.trim() || undefined,
        source: orderNumber.trim() ? 'order_tracking' : 'storefront'
      });

      success('Thank you! Your review has been posted successfully.');
      if (onReviewSubmitted) {
        onReviewSubmitted(newReview);
      }
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="flex min-h-full items-start sm:items-center justify-center p-3.5 sm:p-6 text-center">
        <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-auto my-4 sm:my-8 text-left">
          {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Write a Review</span>
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Share your experience with {business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Review Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Star Rating Selector */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-center space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Overall Rating</label>
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map(star => {
                const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer focus:outline-hidden"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        isFilled
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300 fill-transparent'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-2xs font-semibold text-slate-500">
              {rating === 5 && '🌟 Excellent / Loved it!'}
              {rating === 4 && '👍 Very Good / Satisfied'}
              {rating === 3 && '👌 Average'}
              {rating === 2 && '👎 Below expectations'}
              {rating === 1 && '⚠️ Poor experience'}
            </p>
          </div>

          {/* Name & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                placeholder="e.g. Chioma Okafor"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City / Location (Optional)
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Ikeja, Lagos"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Product Select (if available) */}
          {products.length > 0 ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Product Purchased (Optional)
              </label>
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value);
                  const p = products.find(prod => prod.id === e.target.value);
                  if (p) setCustomProductName(p.name);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden bg-white"
              >
                <option value="">General Store Review / Store Experience</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Item or Service (Optional)
              </label>
              <input
                type="text"
                value={customProductName}
                onChange={e => setCustomProductName(e.target.value)}
                placeholder="e.g. Organic Body Scrub"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              />
            </div>
          )}

          {/* Order Number for Automatic Verification */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                Order Number (Optional)
              </label>
              <span className="text-3xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Unlocks "Verified Order" badge
              </span>
            </div>
            <input
              type="text"
              value={orderNumber}
              onChange={e => setOrderNumber(e.target.value)}
              placeholder="e.g. ORD-123456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono uppercase"
            />
          </div>

          {/* Review Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Your Review <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What did you like about the product, delivery speed, or customer service?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden resize-none"
              required
            />
          </div>

          {/* Photo Attachments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Add Photos (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {photos.map((p, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={p} alt="Review upload" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {photos.length < 4 && (
                <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-50 transition text-slate-400 hover:text-slate-600">
                  {isUploadingPhoto ? (
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
                    disabled={isUploadingPhoto}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
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
              Post Review
            </Button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};
