import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MessageCircle, ShoppingCart, Heart, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { Business, StoreSettings, Product } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../context/CartContext';

export interface StorySlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  tag?: string;
  product?: Product;
  likesCount?: number;
}

export interface StoryHighlightGroup {
  id: string;
  title: string;
  coverImage: string;
  unread?: boolean;
  slides: StorySlide[];
}

interface StoryViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightGroup: StoryHighlightGroup | null;
  business: Business;
  settings: StoreSettings;
  storeSlug: string;
  onWhatsAppOrder?: (product: Product) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  isOpen,
  onClose,
  highlightGroup,
  business,
  settings,
  storeSlug,
  onWhatsAppOrder
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);
  const { addItem } = useCart();

  useEffect(() => {
    if (isOpen) {
      setCurrentSlideIndex(0);
      setIsLiked(false);
      setLikeCount(Math.floor(Math.random() * 40) + 15);
    }
  }, [isOpen, highlightGroup?.id]);

  useEffect(() => {
    if (!isOpen || !highlightGroup || isPaused) return;

    const timer = setTimeout(() => {
      if (currentSlideIndex < highlightGroup.slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1);
        setIsLiked(false);
      } else {
        onClose();
      }
    }, 4500);

    return () => clearTimeout(timer);
  }, [isOpen, highlightGroup, currentSlideIndex, isPaused, onClose]);

  if (!isOpen || !highlightGroup) return null;

  const currentSlide = highlightGroup.slides[currentSlideIndex] || highlightGroup.slides[0];
  const themeColor = settings.primary_color || '#10B981';

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlideIndex < highlightGroup.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
      setIsLiked(false);
    } else {
      onClose();
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
      setIsLiked(false);
    }
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      setIsLiked(true);
      setLikeCount(prev => prev + 1);
    } else {
      setIsLiked(false);
      setLikeCount(prev => prev - 1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md h-full sm:h-[88vh] sm:max-h-[750px] bg-slate-950 sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
        onClick={e => e.stopPropagation()}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Background Slide Image */}
        <img
          src={currentSlide.image}
          alt={currentSlide.title}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

        {/* Top Header & Progress Bars */}
        <div className="relative z-10 p-4 space-y-3">
          {/* Progress Bars */}
          <div className="flex gap-1.5 w-full">
            {highlightGroup.slides.map((_, idx) => (
              <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-white transition-all duration-linear ${
                    idx < currentSlideIndex
                      ? 'w-full'
                      : idx === currentSlideIndex
                      ? isPaused
                        ? 'w-1/2'
                        : 'w-full duration-[4500ms]'
                      : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Profile Row */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-amber-400 via-rose-500 to-emerald-500">
                <img
                  src={business.logo_url || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=100'}
                  alt={business.name}
                  className="w-full h-full rounded-full object-cover border border-black/40"
                />
              </div>
              <div>
                <p className="text-xs font-bold leading-none">{business.name}</p>
                <p className="text-2xs text-white/70 mt-0.5">{highlightGroup.title} • Story</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60 flex items-center justify-center backdrop-blur-sm transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Center Tap Navigation Zones */}
        <div className="absolute inset-y-16 inset-x-0 flex z-10">
          <div className="w-1/3 h-full cursor-pointer" onClick={handlePrev} />
          <div className="w-2/3 h-full cursor-pointer" onClick={handleNext} />
        </div>

        {/* Bottom Details & Sticky CTA */}
        <div className="relative z-20 p-4 sm:p-5 space-y-3">
          {/* Caption / Tag */}
          <div className="space-y-1">
            {currentSlide.tag && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-500/90 text-white shadow-sm backdrop-blur-xs">
                <Sparkles className="w-3 h-3" />
                {currentSlide.tag}
              </span>
            )}
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
              {currentSlide.title}
            </h3>
            {currentSlide.subtitle && (
              <p className="text-xs text-white/90 drop-shadow-sm line-clamp-2">
                {currentSlide.subtitle}
              </p>
            )}
          </div>

          {/* Product Quick-Tag Floating Card if slide has attached product */}
          {currentSlide.product && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-white/40 flex items-center justify-between gap-3 animate-slide-up">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={currentSlide.product.images?.[0]?.public_url || currentSlide.image}
                  alt={currentSlide.product.name}
                  className="w-11 h-11 rounded-xl object-cover border border-slate-100 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentSlide.product.name}
                  </p>
                  <p className="text-xs font-extrabold text-emerald-700">
                    {formatCurrency(currentSlide.product.price)}
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-1.5">
                {settings.enable_checkout ? (
                  <button
                    type="button"
                    onClick={() => {
                      addItem(currentSlide.product!, 1);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-95 transition flex items-center gap-1"
                    style={{ backgroundColor: themeColor }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onWhatsAppOrder?.(currentSlide.product!);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Order</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Social Reactions Bar */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleLike}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-semibold transition cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 transition ${
                    isLiked ? 'fill-rose-500 text-rose-500 scale-110' : 'text-white'
                  }`}
                />
                <span>{likeCount}</span>
              </button>
            </div>

            {business.whatsapp_number && (
              <a
                href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}?text=${encodeURIComponent(
                  `Hi ${business.name}, I saw your story "${currentSlide.title}" and would like to inquire!`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
              >
                <MessageCircle className="w-3.5 h-3.5 fill-white" />
                <span>Message Store</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
