import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  ShoppingCart,
  Sparkles,
  CheckCircle2,
  Eye,
  Flame,
  ChevronLeft,
  ChevronRight,
  Play,
  Video,
  X
} from 'lucide-react';
import { Product, StoreSettings, Business } from '../../types';
import { formatCurrency, resolveMediaUrl } from '../../lib/utils';
import { TikTokPlayer } from '../common/TikTokPlayer';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

interface SocialFeedCardProps {
  product: Product;
  business: Business;
  settings: StoreSettings;
  storeSlug: string;
  onWhatsAppOrder?: (product: Product) => void;
}

export const SocialFeedCard: React.FC<SocialFeedCardProps> = ({
  product,
  business,
  settings,
  storeSlug,
  onWhatsAppOrder
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => Math.floor(Math.random() * 80) + 32);
  const [isSaved, setIsSaved] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const { addItem } = useCart();
  const { success } = useToast();

  const themeColor = settings.primary_color || '#10B981';
  const images = product.images && product.images.length > 0 ? product.images : [{ public_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800' }];
  const currentImage = images[activeImageIndex]?.public_url || images[0]?.public_url;
  const isOutOfStock = product.track_inventory && product.stock_quantity <= 0;
  const hasTikTokVideo = Boolean(product.tiktok_video_url && product.tiktok_video_url.trim().length > 0);

  const handleDoubleTap = () => {
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleToggleLike = () => {
    if (isLiked) {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    } else {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
    }
  };

  const handleToggleSave = () => {
    setIsSaved(prev => !prev);
    if (!isSaved) {
      success(`Saved ${product.name} to your wishlist`);
    }
  };

  const handleSharePost = async () => {
    const postUrl = `${window.location.origin}/${storeSlug}/product/${product.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on ${business.name}!`,
          url: postUrl
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(postUrl);
      success('Product link copied to clipboard!');
    }
  };

  return (
    <article className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
      {/* Post Top Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-500">
            <img
              src={resolveMediaUrl(business.logo_url) || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100'}
              alt={business.name}
              className="w-9 h-9 rounded-full object-cover border border-white"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {business.name}
              </span>
              {business.is_verified && (
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-600 fill-emerald-50 shrink-0"
                  title="Verified Merchant by Admin"
                />
              )}
            </div>
            <p className="text-3xs text-slate-400">
              {product.category?.name || 'Featured Product'} • 2h ago
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTikTokVideo && (
            <button
              type="button"
              onClick={() => setShowTikTokModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-3xs font-bold bg-black text-white hover:bg-slate-800 transition cursor-pointer shadow-xs"
              title="Watch TikTok Showcase"
            >
              <Play className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
              <span>TikTok Reel</span>
            </button>
          )}

          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="px-2.5 py-1 rounded-full text-3xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
              SAVE {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Main Image with Double Tap Gesture (Reduced to 70% current size as requested) & Multi-image carousel */}
      <div className="px-4 py-3 bg-slate-50/70 flex justify-center items-center border-y border-slate-100 relative">
        <div
          className="relative w-[70%] aspect-4/5 bg-slate-100 rounded-2xl overflow-hidden cursor-pointer select-none group shadow-xs border border-slate-200/60"
          onDoubleClick={handleDoubleTap}
        >
          <img
            src={currentImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800';
            }}
          />

          {/* Multiple Images Carousel Controls */}
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer"
                title="Previous photo"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md cursor-pointer"
                title="Next photo"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Photo Indicator badge */}
              <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-3xs font-bold">
                {activeImageIndex + 1}/{images.length}
              </div>
            </>
          )}

          {/* Floating Heart Animation on Double Tap */}
          {showHeartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
              <Heart className="w-14 h-14 fill-white text-white drop-shadow-2xl opacity-90" />
            </div>
          )}

          {/* Floating Price Pill Tag (Social Media Style) */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-2xs font-extrabold shadow-lg flex items-center gap-1.5 border border-white/20">
            <span>{formatCurrency(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-3xs text-white/60 line-through font-normal">
                {formatCurrency(product.compare_at_price)}
              </span>
            )}
          </div>

          {/* Sold out badge */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
              <span className="px-3 py-1 rounded-full text-2xs font-extrabold bg-white text-slate-900 shadow-xl">
                Sold Out
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Social Engagement Bar */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-700">
            <button
              type="button"
              onClick={handleToggleLike}
              className="flex items-center gap-1.5 hover:text-rose-600 transition cursor-pointer"
            >
              <Heart
                className={`w-5 h-5 transition-transform active:scale-125 ${
                  isLiked ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
              <span className="text-xs font-bold">{likesCount}</span>
            </button>

            {settings.show_whatsapp && business.whatsapp_number && (
              <button
                type="button"
                onClick={() => onWhatsAppOrder?.(product)}
                className="flex items-center gap-1.5 hover:text-emerald-600 transition cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="text-xs font-medium">Inquire</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSharePost}
              className="hover:text-slate-900 transition cursor-pointer"
              title="Share product"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleToggleSave}
            className="text-slate-600 hover:text-slate-900 transition cursor-pointer"
            title="Save item"
          >
            <Bookmark
              className={`w-5 h-5 ${isSaved ? 'fill-slate-900 text-slate-900' : ''}`}
            />
          </button>
        </div>

        {/* Product Caption & Description */}
        <div className="space-y-1 text-xs text-slate-800 leading-relaxed">
          <p>
            <span className="font-extrabold text-slate-900 mr-1.5">{business.name}</span>
            <Link
              to={`/${storeSlug}/product/${product.slug}`}
              className="font-bold hover:text-emerald-700 transition"
            >
              {product.name}
            </Link>
          </p>
          {product.description && (
            <p className="text-slate-600 text-2xs line-clamp-2">{product.description}</p>
          )}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-3xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              #{product.category?.slug || 'skincare'}
            </span>
            <span className="text-3xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              #nigerianbeauty
            </span>
            {hasTikTokVideo && (
              <span className="text-3xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                #tiktokmademebuyit
              </span>
            )}
          </div>
        </div>

        {/* Action Button Strip */}
        <div className="pt-2 flex items-center gap-2">
          {settings.enable_checkout ? (
            <button
              type="button"
              onClick={() => addItem(product, 1)}
              disabled={isOutOfStock}
              style={{ backgroundColor: isOutOfStock ? undefined : themeColor }}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-white hover:brightness-95 active:scale-[0.98] shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:bg-slate-300"
            >
              <ShoppingCart className="w-4 h-4 text-white" />
              <span>{isOutOfStock ? 'Sold Out' : 'add to cart'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onWhatsAppOrder?.(product)}
              disabled={isOutOfStock}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <MessageCircle className="w-4 h-4 text-slate-800" />
              <span>Order on WhatsApp</span>
            </button>
          )}

          <Link
            to={`/${storeSlug}/product/${product.slug}`}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* TikTok Reel Modal */}
      {showTikTokModal && hasTikTokVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl p-4">
            <button
              type="button"
              onClick={() => setShowTikTokModal(false)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
              title="Close video"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mb-3">
              <h3 className="text-sm font-bold text-white">{product.name}</h3>
              <p className="text-2xs text-slate-400">TikTok Product Showcase</p>
            </div>

            <TikTokPlayer url={product.tiktok_video_url} title={product.name} />
          </div>
        </div>
      )}
    </article>
  );
};
