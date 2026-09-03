import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShoppingCart,
  MessageCircle,
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  Check,
  Share2,
  Heart,
  Sparkles,
  CheckCircle2,
  Video,
  Play,
  Image as ImageIcon,
  Star,
  PlusCircle,
  ThumbsUp
} from 'lucide-react';
import { api } from '../../lib/api';
import { Product, Business, StoreSettings, StoreReview, ReviewStats } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { CartDrawer } from '../../components/storefront/CartDrawer';
import { WhatsAppOrderModal } from '../../components/storefront/WhatsAppOrderModal';
import { WriteReviewModal } from '../../components/storefront/WriteReviewModal';
import { DemoStoreBanner } from '../../components/storefront/DemoStoreBanner';
import { isDemoStoreSlug } from '../../lib/demoStores';
import { isCustomDomainHost } from '../../lib/hostname';
import { TikTokPlayer } from '../../components/common/TikTokPlayer';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export const StorefrontProductDetail: React.FC = () => {
  const { storeSlug, productSlug } = useParams<{ storeSlug: string; productSlug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isWriteReviewOpen, setIsWriteReviewOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeMediaTab, setActiveMediaTab] = useState<'photos' | 'video'>('photos');
  const [isLoading, setIsLoading] = useState(true);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => Math.floor(Math.random() * 50) + 24);
  const [votedMap, setVotedMap] = useState<Record<string, boolean>>({});

  const isDemo = isDemoStoreSlug(storeSlug);

  const { addItem } = useCart();
  const { success } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!productSlug) return;
    setIsLoading(true);

    const loadProduct = async () => {
      try {
        let currentStoreSlug = storeSlug;

        if (!currentStoreSlug && isCustomDomainHost()) {
          const hostRes = await api.resolveStorefrontByHost();
          if (hostRes.resolved && hostRes.business) {
            currentStoreSlug = hostRes.business.slug;
            setBusiness(hostRes.business);
            setSettings(hostRes.settings || null);
            const foundProd = hostRes.products?.find(p => p.slug === productSlug || p.id === productSlug);
            if (foundProd) {
              setProduct(foundProd);
            }
          }
        }

        if (currentStoreSlug) {
          const res = await api.getPublicProduct(currentStoreSlug, productSlug);
          setProduct(res.product);
          setBusiness(res.business);
          setSettings(res.settings);

          // Fetch reviews
          api.getStoreReviews(currentStoreSlug, res.product.id)
            .then(revData => {
              setReviews(revData.reviews || []);
              setReviewStats(revData.stats || null);
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Failed to load product:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [storeSlug, productSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product || !business || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-xl font-bold text-slate-900 mb-2">Product Not Found</h1>
        <Link to={`/${storeSlug}`}>
          <Button variant="primary" size="md">
            Return to Store
          </Button>
        </Link>
      </div>
    );
  }

  const themeColor = settings.primary_color || '#10B981';
  const images = product.images?.length ? product.images : [{ public_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600' }];
  const currentImg = images[activeImageIndex]?.public_url || images[0]?.public_url;
  const isOutOfStock = product.track_inventory && product.stock_quantity <= 0;
  const hasTikTokVideo = Boolean(product.tiktok_video_url && product.tiktok_video_url.trim().length > 0);
  const isVideoMode = hasTikTokVideo && activeMediaTab === 'video';

  const handleAddToCart = () => {
    addItem(product, quantity);
    success(`Added ${quantity} × ${product.name} to cart`);
  };

  const handleShare = async () => {
    const postUrl = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} from ${business.name}!`,
          url: postUrl
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(postUrl);
      success('Link copied to clipboard!');
    }
  };

  const handleToggleLike = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      success('Added to your wishlist!');
    } else {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Sample Demo Store Banner */}
      {isDemo && <DemoStoreBanner storeName={business.name} />}

      <StoreHeader business={business} settings={settings} />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Navigation & Action Header */}
        <div className="flex items-center justify-between">
          <Link
            to={`/${storeSlug}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Store</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:text-rose-600 transition shadow-2xs cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              title="Share product"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Product Details Grid */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden p-6 sm:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Gallery Images & Video Showcase */}
            <div className="space-y-4">
              {/* Media Mode Tabs (strictly when a TikTok video is uploaded) */}
              {hasTikTokVideo && (
                <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('photos')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      !isVideoMode
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Photos ({images.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMediaTab('video')}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      isVideoMode
                        ? 'bg-black text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                    <span>Watch TikTok Video</span>
                  </button>
                </div>
              )}

              {/* Photos View or TikTok Video View */}
              {!isVideoMode ? (
                <>
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs">
                    <img
                      src={currentImg}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
                      }}
                    />

                    {product.compare_at_price && product.compare_at_price > product.price && (
                      <span className="absolute top-4 left-4 px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-md">
                        SAVE {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Row */}
                  <div className="flex gap-3 overflow-x-auto pb-1 items-center">
                    {images.map((img: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition cursor-pointer shrink-0 ${
                          activeImageIndex === idx ? 'border-emerald-600 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img
                          src={img.public_url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={e => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
                          }}
                        />
                      </button>
                    ))}

                    {/* Quick switch button to TikTok video (only if video uploaded) */}
                    {hasTikTokVideo && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('video')}
                        className="w-16 h-16 rounded-2xl bg-black border-2 border-slate-800 text-white flex flex-col items-center justify-center shrink-0 hover:border-rose-500 transition cursor-pointer group"
                        title="Watch TikTok Video Reel"
                      >
                        <Play className="w-5 h-5 fill-rose-500 text-rose-500 group-hover:scale-110 transition" />
                        <span className="text-3xs font-bold mt-1 text-slate-300">TikTok</span>
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* TikTok Video View */
                <div className="space-y-3">
                  <div className="p-4 bg-slate-950 rounded-3xl border border-slate-800 flex justify-center">
                    <TikTokPlayer
                      url={product.tiktok_video_url!}
                      title={`${product.name} Video Showcase`}
                      className="w-full"
                    />
                  </div>
                  <p className="text-center text-xs text-slate-500">
                    Product showcase powered by TikTok
                  </p>
                </div>
              )}
            </div>

            {/* Product Meta & Actions */}
            <div className="flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  {product.category && (
                    <span className="text-2xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 inline-block">
                      {product.category.name}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {product.name}
                </h1>

                {/* Rating Badge */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100/80">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-slate-900">
                      {reviewStats?.average_rating ? reviewStats.average_rating.toFixed(1) : '5.0'}
                    </span>
                    <span className="text-2xs text-slate-500 font-medium">
                      ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWriteReviewOpen(true)}
                    className="text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline cursor-pointer"
                  >
                    Write a Review
                  </button>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 pt-1">
                  <span className="text-3xl font-black text-slate-900">
                    {formatCurrency(product.price)}
                  </span>
                  {product.compare_at_price && product.compare_at_price > product.price && (
                    <span className="text-base text-slate-400 line-through font-normal">
                      {formatCurrency(product.compare_at_price)}
                    </span>
                  )}
                </div>

                {/* Stock notice */}
                <div className="pt-1">
                  {isOutOfStock ? (
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                      Currently Sold Out
                    </span>
                  ) : product.track_inventory && product.stock_quantity <= 5 ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                      ⚡ Only {product.stock_quantity} left in stock
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      In Stock & Express Dispatch Ready
                    </span>
                  )}
                </div>

                {/* Description */}
                {product.description && (
                  <div className="pt-4 border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {product.description}
                  </div>
                )}
              </div>

              {/* Quantity & CTA Buttons */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-700">Quantity:</span>
                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="p-2.5 text-slate-600 hover:bg-slate-200 transition disabled:opacity-40 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="px-4 text-sm font-bold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(quantity + 1)}
                      disabled={isOutOfStock}
                      className="p-2.5 text-slate-600 hover:bg-slate-200 transition disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {settings.enable_checkout && (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={handleAddToCart}
                      style={{ backgroundColor: isOutOfStock ? undefined : (settings.primary_color || '#10B981') }}
                      className="flex-1 py-3 px-6 rounded-2xl text-sm sm:text-base font-bold text-white hover:brightness-95 active:scale-[0.98] flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ShoppingCart className="w-5 h-5 text-white" />
                      <span>{isOutOfStock ? 'Sold Out' : 'add to cart'}</span>
                    </button>
                  )}

                  {settings.show_whatsapp && (
                    <button
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setShowWhatsAppModal(true)}
                      className="flex-1 py-3 px-6 rounded-2xl text-sm sm:text-base font-bold bg-white text-slate-900 hover:bg-slate-50 border-2 border-slate-300 flex items-center justify-center gap-2 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <MessageCircle className="w-5 h-5 text-slate-800" />
                      <span>Order on WhatsApp</span>
                    </button>
                  )}
                </div>

                {/* Trust and Delivery snippet */}
                <div className="pt-4 flex flex-wrap items-center gap-4 text-2xs text-slate-500 border-t border-slate-100">
                  <span className="flex items-center gap-1 font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    100% Genuine Direct from Merchant
                  </span>
                  {settings.delivery_information && (
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5 text-slate-400" />
                      {settings.delivery_information}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Reviews Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Customer Reviews</span>
                  <span className="text-xs font-semibold text-slate-400">
                    ({reviews.length})
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  {reviewStats?.average_rating
                    ? `Rated ${reviewStats.average_rating.toFixed(1)} out of 5 stars`
                    : '100% verified shopper experiences'}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsWriteReviewOpen(true)}
              className="gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Write a Review</span>
            </Button>
          </div>

          {reviews.length === 0 ? (
            <div className="py-8 text-center text-slate-500 space-y-2">
              <p className="text-xs">No reviews for this product yet.</p>
              <p className="text-2xs text-slate-400">Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map(rev => {
                const hasVoted = Boolean(votedMap[rev.id]);
                return (
                  <div
                    key={rev.id}
                    className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {rev.customer_avatar ? (
                            <img
                              src={rev.customer_avatar}
                              alt={rev.customer_name}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                              {rev.customer_name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900">{rev.customer_name}</span>
                              {rev.is_verified && (
                                <span className="inline-flex items-center gap-0.5 text-3xs font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded-full">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-3xs text-slate-400">
                              {rev.location && `${rev.location} • `}
                              {formatDate(rev.created_at)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 bg-white px-2 py-0.5 rounded-lg border border-amber-100">
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

                      <p className="text-xs text-slate-700 leading-relaxed">
                        "{rev.comment}"
                      </p>

                      {rev.photos && rev.photos.length > 0 && (
                        <div className="flex gap-2 pt-1">
                          {rev.photos.map((p, idx) => (
                            <img
                              key={idx}
                              src={p}
                              alt="Review upload"
                              className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-3xs text-slate-400">
                      <span>Verified Buyer</span>
                      <button
                        type="button"
                        onClick={async () => {
                          if (votedMap[rev.id]) return;
                          setVotedMap(prev => ({ ...prev, [rev.id]: true }));
                          setReviews(prev =>
                            prev.map(r => (r.id === rev.id ? { ...r, helpful_votes: (r.helpful_votes || 0) + 1 } : r))
                          );
                          try {
                            await api.voteReviewHelpful(storeSlug!, rev.id);
                          } catch {}
                        }}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md transition cursor-pointer ${
                          hasVoted ? 'text-emerald-700 font-bold bg-emerald-50' : 'text-slate-500 hover:bg-slate-200/50'
                        }`}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        <span>Helpful ({rev.helpful_votes || 0})</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CartDrawer storeSlug={storeSlug!} settings={settings} isDemo={isDemo} />

      <WhatsAppOrderModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        product={product}
        business={business}
        storeSlug={storeSlug!}
        isDemo={isDemo}
      />

      <WriteReviewModal
        isOpen={isWriteReviewOpen}
        onClose={() => setIsWriteReviewOpen(false)}
        business={business}
        preselectedProduct={product}
        onReviewSubmitted={newRev => {
          setReviews(prev => [newRev, ...prev]);
        }}
      />
    </div>
  );
};

