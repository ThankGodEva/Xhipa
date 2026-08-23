import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Eye, Heart } from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';

export interface ProductCardProps {
  product: Product;
  storeSlug: string;
  settings: StoreSettings;
  onWhatsAppOrder?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeSlug,
  settings,
  onWhatsAppOrder
}) => {
  const { addItem } = useCart();
  const { success } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(() => Math.floor(Math.random() * 40) + 12);

  const themeColor = settings.primary_color || '#10B981';
  const mainImage = product.images?.[0]?.public_url || 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
  const isOutOfStock = product.track_inventory && product.stock_quantity <= 0;
  const isLowStock = product.track_inventory && product.stock_quantity > 0 && product.stock_quantity <= 5;

  const handleToggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLiked) {
      setIsLiked(true);
      setLikesCount(prev => prev + 1);
      success(`Saved ${product.name} to favorites`);
    } else {
      setIsLiked(false);
      setLikesCount(prev => prev - 1);
    }
  };

  return (
    <div className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
      {/* Image Container with Social Media Badges */}
      <div className="relative aspect-square overflow-hidden bg-slate-100 block">
        <Link
          to={`/${storeSlug}/product/${product.slug}`}
          className="block w-full h-full"
        >
          <img
            src={mainImage}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600';
            }}
          />
        </Link>

        {/* Top Badges (Sale % / Featured) */}
        <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex flex-col gap-0.5 pointer-events-none">
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="px-1 py-0.5 rounded text-[10px] font-bold bg-rose-600/90 backdrop-blur-xs text-white shadow-xs leading-tight">
              -{Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}%
            </span>
          )}
          {product.featured && (
            <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/90 backdrop-blur-xs text-white shadow-xs leading-tight">
              HOT
            </span>
          )}
        </div>

        {/* Social Heart Like Button */}
        <button
          type="button"
          onClick={handleToggleLike}
          className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/80 hover:bg-white backdrop-blur-md flex items-center justify-center text-slate-700 shadow-xs transition-transform active:scale-125 cursor-pointer"
          title="Save to Wishlist"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition ${
              isLiked ? 'fill-rose-500 text-rose-500' : 'text-slate-600'
            }`}
          />
        </button>

        {/* Stock status overlay if out of stock */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center">
            <span className="px-2.5 py-0.5 sm:px-3.5 sm:py-1 rounded-full text-2xs sm:text-xs font-bold bg-white text-slate-900 shadow-md">
              Sold Out
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between space-y-1.5 sm:space-y-3">
        <div>
          {product.category && (
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block mb-0.5 sm:mb-1 truncate">
              {product.category.name}
            </span>
          )}

          <Link
            to={`/${storeSlug}/product/${product.slug}`}
            className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 hover:text-emerald-700 transition leading-snug"
          >
            {product.name}
          </Link>
        </div>

        <div className="pt-1.5 sm:pt-2 border-t border-slate-100 space-y-1.5 sm:space-y-2.5">
          {/* Price & Stock Notice */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-baseline gap-1 sm:gap-1.5 flex-wrap">
              <span className="text-xs sm:text-base font-extrabold text-slate-900">
                {formatCurrency(product.price)}
              </span>
              {product.compare_at_price && product.compare_at_price > product.price && (
                <span className="text-3xs sm:text-2xs text-slate-400 line-through">
                  {formatCurrency(product.compare_at_price)}
                </span>
              )}
            </div>

            {isLowStock && (
              <span className="text-3xs font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded">
                ⚡ {product.stock_quantity} left
              </span>
            )}
          </div>

          {/* Action CTA Buttons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {settings.enable_checkout ? (
              <button
                type="button"
                onClick={() => addItem(product, 1)}
                disabled={isOutOfStock}
                style={{ backgroundColor: isOutOfStock ? undefined : themeColor }}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-2xs sm:text-xs font-bold text-white hover:brightness-95 active:scale-[0.98] flex items-center justify-center gap-1 sm:gap-1.5 transition shadow-2xs disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer"
              >
                <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                <span className="truncate">{isOutOfStock ? 'Sold out' : 'add to cart'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onWhatsAppOrder?.(product)}
                disabled={isOutOfStock}
                className="flex-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg sm:rounded-xl text-2xs sm:text-xs font-bold bg-white text-slate-900 hover:bg-slate-50 border border-slate-300 flex items-center justify-center gap-1 sm:gap-1.5 transition shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-800" />
                <span className="truncate">Order on WA</span>
              </button>
            )}

            <Link
              to={`/${storeSlug}/product/${product.slug}`}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shrink-0"
              title="View product details"
            >
              <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
