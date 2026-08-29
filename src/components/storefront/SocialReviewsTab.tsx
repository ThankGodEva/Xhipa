import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ThumbsUp,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Camera,
  Filter,
  PlusCircle,
  Clock,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import { Business, Product, StoreReview, ReviewStats } from '../../types';
import { api } from '../../lib/api';
import { WriteReviewModal } from './WriteReviewModal';
import { Button } from '../common/Button';
import { formatDate } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

interface SocialReviewsTabProps {
  business: Business;
  products?: Product[];
}

export const SocialReviewsTab: React.FC<SocialReviewsTabProps> = ({ business, products = [] }) => {
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'photos' | '5star' | 'verified'>('all');
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { success } = useToast();

  const fetchReviews = async () => {
    try {
      setIsLoading(true);
      const res = await api.getStoreReviews(business.slug);
      setReviews(res.reviews || []);
      setStats(res.stats || null);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (business.slug) {
      fetchReviews();
    }
  }, [business.slug]);

  const handleToggleHelpful = async (revId: string) => {
    if (votedMap[revId]) return;

    // Optimistic update
    setVotedMap(prev => ({ ...prev, [revId]: true }));
    setReviews(prev =>
      prev.map(r => (r.id === revId ? { ...r, helpful_votes: (r.helpful_votes || 0) + 1 } : r))
    );

    try {
      await api.voteReviewHelpful(business.slug, revId);
    } catch (err) {
      console.warn('Vote failed:', err);
    }
  };

  const handleReviewSubmitted = (newReview: StoreReview) => {
    setReviews(prev => [newReview, ...prev]);
    if (stats) {
      setStats({
        ...stats,
        total_reviews: stats.total_reviews + 1,
        verified_reviews_count: stats.verified_reviews_count + (newReview.is_verified ? 1 : 0)
      });
    }
  };

  // Filter reviews
  const filteredReviews = reviews.filter(r => {
    if (filter === 'photos') return r.photos && r.photos.length > 0;
    if (filter === '5star') return r.rating === 5;
    if (filter === 'verified') return r.is_verified;
    return true;
  });

  const averageRating = stats?.average_rating || 5.0;
  const totalCount = stats?.total_reviews ?? reviews.length;

  return (
    <div className="space-y-6">
      {/* Top Review Highlights & Rating Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center justify-center text-amber-600 shrink-0">
              <span className="text-xl font-extrabold leading-none">{averageRating.toFixed(1)}</span>
              <div className="flex items-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>Verified Customer Reviews</span>
                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Based on {totalCount} {totalCount === 1 ? 'review' : 'reviews'} from authentic buyers
              </p>
              <div className="flex items-center gap-3 mt-2 text-2xs font-semibold">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Genuine Experiences
                </span>
                {stats?.verified_reviews_count ? (
                  <span className="text-slate-500">
                    {stats.verified_reviews_count} Verified Orders
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {business.whatsapp_number && (
              <a
                href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                  `Hi ${business.name}, I want to share feedback on my recent order!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition shadow-2xs"
              >
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>WhatsApp Feedback</span>
              </a>
            )}

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsWriteModalOpen(true)}
              className="gap-2 shadow-xs"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Write a Review</span>
            </Button>
          </div>
        </div>

        {/* Rating Breakdown & Filter Bars */}
        <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Reviews ({reviews.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('photos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === 'photos'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>With Photos</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('5star')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === '5star'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>5 Stars Only</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter('verified')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                filter === 'verified'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Verified Buyers</span>
            </button>
          </div>

          <div className="text-2xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Updated in real-time</span>
          </div>
        </div>
      </div>

      {/* Reviews Grid */}
      {isLoading ? (
        <div className="py-16 text-center">
          <div className="w-8 h-8 border-3 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Star className="w-7 h-7" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No reviews found for this filter</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Be the first to share your thoughts and photos with the community!
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsWriteModalOpen(true)}
            className="mt-2"
          >
            Leave First Review
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredReviews.map(rev => {
            const hasVoted = Boolean(votedMap[rev.id]);
            return (
              <div
                key={rev.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs hover:shadow-xs transition space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* User Header */}
                  <div className="flex items-center justify-between">
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
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">{rev.customer_name}</span>
                          {rev.is_verified && (
                            <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-3xs text-slate-400">
                          {rev.location && <span>{rev.location} • </span>}
                          <span>{formatDate(rev.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-0.5 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100/60">
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

                  {/* Purchased product tag if any */}
                  {rev.product_name && (
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-3xs font-semibold">
                      Purchased: {rev.product_name}
                    </span>
                  )}

                  {/* Review Text */}
                  <p className="text-xs text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                    "{rev.comment}"
                  </p>

                  {/* Photos if any */}
                  {rev.photos && rev.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {rev.photos.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(p)}
                          className="relative group rounded-xl overflow-hidden cursor-pointer focus:outline-hidden"
                        >
                          <img
                            src={p}
                            alt="Customer review photo"
                            className="w-20 h-20 rounded-xl object-cover border border-slate-100 shadow-2xs group-hover:scale-105 transition"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Helpful Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
                  <span className="text-3xs">
                    {rev.source === 'order_tracking'
                      ? 'Verified via Order Tracking'
                      : rev.source === 'merchant_manual'
                      ? 'Direct Customer Testimonial'
                      : 'Verified Storefront Buyer'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleHelpful(rev.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition cursor-pointer text-xs ${
                      hasVoted
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${hasVoted ? 'fill-emerald-600' : ''}`} />
                    <span>{rev.helpful_votes || 0}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-3xl max-h-[85vh] bg-transparent rounded-2xl overflow-hidden">
            <img
              src={selectedPhoto}
              alt="Customer photo preview"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Write Review Modal */}
      <WriteReviewModal
        isOpen={isWriteModalOpen}
        onClose={() => setIsWriteModalOpen(false)}
        business={business}
        products={products}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
};
