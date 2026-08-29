import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Search,
  ShoppingCart,
  Grid,
  LayoutGrid,
  Layers,
  MessageSquare,
  Info,
  Store as StoreIcon,
  Sparkles,
  Truck,
  ShieldCheck,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  HelpCircle,
  Share2
} from 'lucide-react';
import { api } from '../../lib/api';
import { PublicStorefrontData, Product } from '../../types';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { SocialStoreHero } from '../../components/storefront/SocialStoreHero';
import { SocialStoryHighlights } from '../../components/storefront/SocialStoryHighlights';
import { StoryViewerModal, StoryHighlightGroup } from '../../components/storefront/StoryViewerModal';
import { CategoryFilter } from '../../components/storefront/CategoryFilter';
import { ProductCard } from '../../components/storefront/ProductCard';
import { SocialFeedCard } from '../../components/storefront/SocialFeedCard';
import { SocialReviewsTab } from '../../components/storefront/SocialReviewsTab';
import { CartDrawer } from '../../components/storefront/CartDrawer';
import { WhatsAppOrderModal } from '../../components/storefront/WhatsAppOrderModal';
import { DemoStoreBanner } from '../../components/storefront/DemoStoreBanner';
import { isDemoStoreSlug } from '../../lib/demoStores';
import { Button } from '../../components/common/Button';
import { resolveMediaUrl } from '../../lib/utils';

type StoreViewTab = 'grid' | 'feed' | 'reviews' | 'about';

export const StorefrontHome: React.FC = () => {
  const { storeSlug } = useParams<{ storeSlug: string }>();
  const [data, setData] = useState<PublicStorefrontData | null>(null);
  const [activeTab, setActiveTab] = useState<StoreViewTab>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Story highlight modal state
  const [activeStoryGroup, setActiveStoryGroup] = useState<StoryHighlightGroup | null>(null);

  // WhatsApp Order popup state for individual product
  const [whatsAppProduct, setWhatsAppProduct] = useState<Product | null>(null);

  // Show nav header only when scrolling past the banner and profile
  const [showNavHeader, setShowNavHeader] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const isDemo = isDemoStoreSlug(storeSlug);

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const rect = heroRef.current.getBoundingClientRect();
        setShowNavHeader(rect.bottom <= 60);
      } else {
        setShowNavHeader(window.scrollY > 380);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!storeSlug) return;
    setIsLoading(true);
    setErrorState(null);

    api.getPublicStore(storeSlug)
      .then(res => {
        setData(res);
      })
      .catch(err => {
        setErrorState(err.message || 'Store not found or unavailable');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [storeSlug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Loading social storefront...</p>
        </div>
      </div>
    );
  }

  if (errorState || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
          <StoreIcon className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">Store Not Found</h1>
        <p className="text-xs text-slate-500 max-w-sm mb-6">
          The store link <strong>/{storeSlug}</strong> may have been changed, unpublished, or does not exist.
        </p>
        <Link to="/">
          <Button variant="primary" size="md">
            Go to Xhipa Homepage
          </Button>
        </Link>
      </div>
    );
  }

  const { business, store, settings, categories, products, entitlements } = data;
  const themeColor = settings.primary_color || '#10B981';

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const hasCustomStories = Array.isArray(data.stories) && data.stories.length > 0;
  const hasStories = isDemo || hasCustomStories;

  const handleOpenMainStory = hasStories
    ? () => {
        if (hasCustomStories && data.stories && data.stories.length > 0) {
          setActiveStoryGroup(data.stories[0]);
          return;
        }
        setActiveStoryGroup({
          id: 'welcome',
          title: 'Welcome',
          coverImage: resolveMediaUrl(business.logo_url) || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
          slides: [
            {
              id: 'slide-1',
              title: `Welcome to ${business.name} ✨`,
              subtitle: business.description || 'Discover handmade organic skincare, cold-pressed oils and pure beauty formulas.',
              image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
              tag: 'Official Story',
              product: products[0]
            },
            {
              id: 'slide-2',
              title: 'Direct Dispatch Across Nigeria 🚚',
              subtitle: 'Orders shipped fast with tamper-proof packaging and order tracking.',
              image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
              tag: 'Fast Shipping'
            }
          ]
        });
      }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col">
      {/* Sample Demo Store Banner */}
      {isDemo && <DemoStoreBanner storeName={business.name} />}

      {/* Floating Navigation Header (Appears only when scrolled past banner & profile) */}
      <StoreHeader
        business={business}
        settings={settings}
        isFloating
        visible={showNavHeader}
      />

      {/* Social Profile Header & Banner */}
      <div ref={heroRef}>
        <SocialStoreHero
          business={business}
          settings={settings}
          storeSlug={store.slug}
          hasStories={hasStories}
          onOpenStory={handleOpenMainStory}
        />
      </div>

      {/* Instagram-style Stories & Highlights Carousel */}
      <SocialStoryHighlights
        business={business}
        products={products}
        stories={data.stories}
        isDemo={isDemo}
        onOpenStory={group => setActiveStoryGroup(group)}
      />

      {/* Social Media Tab Navigation Bar */}
      <div
        className={`sticky ${
          showNavHeader ? 'top-16' : 'top-0'
        } z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs transition-all duration-200`}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-around sm:justify-center sm:gap-12">
            <button
              type="button"
              onClick={() => setActiveTab('grid')}
              style={activeTab === 'grid' ? { borderBottomColor: themeColor, color: themeColor } : {}}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'grid'
                  ? 'font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Shop</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              style={activeTab === 'feed' ? { borderBottomColor: themeColor, color: themeColor } : {}}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'feed'
                  ? 'font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Feed</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              style={activeTab === 'reviews' ? { borderBottomColor: themeColor, color: themeColor } : {}}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'reviews'
                  ? 'font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Reviews</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('about')}
              style={activeTab === 'about' ? { borderBottomColor: themeColor, color: themeColor } : {}}
              className={`py-3.5 px-3 sm:px-5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'about'
                  ? 'font-extrabold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              <Info className="w-4 h-4" />
              <span>About</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* VIEW 1: SHOP GRID */}
        {activeTab === 'grid' && (
          <div className="space-y-6">
            {/* Search & Category Filter Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search products in store..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white rounded-2xl border border-slate-200 shadow-2xs focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>

              <div className="text-2xs font-semibold text-slate-500 self-center">
                Showing <strong className="text-slate-900">{filteredProducts.length}</strong> items
              </div>
            </div>

            {/* Category Filter Chips */}
            <CategoryFilter
              categories={categories}
              selectedCategoryId={selectedCategory}
              onSelectCategory={setSelectedCategory}
              primaryColor={themeColor}
            />

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
                <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-900 mb-1">No products found</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {searchQuery ? 'Try clearing your search query.' : 'This store has no active products listed in this category.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    storeSlug={store.slug}
                    settings={settings}
                    onWhatsAppOrder={p => setWhatsAppProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SOCIAL FEED VIEW */}
        {activeTab === 'feed' && (
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-1 pb-2">
              <span className="inline-flex items-center gap-1 text-2xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                <Sparkles className="w-3 h-3" />
                Social Shopping Feed
              </span>
              <p className="text-xs text-slate-500">
                Double tap any post to heart ❤️ or click to buy instantly
              </p>
            </div>

            {products.map(product => (
              <SocialFeedCard
                key={product.id}
                product={product}
                business={business}
                settings={settings}
                storeSlug={store.slug}
                onWhatsAppOrder={p => setWhatsAppProduct(p)}
              />
            ))}
          </div>
        )}

        {/* VIEW 3: REVIEWS & UGC */}
        {activeTab === 'reviews' && (
          <SocialReviewsTab business={business} products={products} />
        )}

        {/* VIEW 4: ABOUT & FAQS */}
        {activeTab === 'about' && (
          <div className="space-y-6 max-w-3xl mx-auto">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xs space-y-6">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 mb-2">
                  About {business.name}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {business.description || 'Welcome to our online store! We are dedicated to bringing you the highest quality products with reliable shipping.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Nationwide Shipping</h4>
                    <p className="text-3xs text-slate-500 mt-0.5">
                      {settings.delivery_information || 'We deliver nationwide across Nigeria with express dispatch.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Authenticity Guarantee</h4>
                    <p className="text-3xs text-slate-500 mt-0.5">
                      100% genuine formulation direct from our verified workshop.
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Contact Options */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h4 className="text-xs font-bold text-slate-900">Direct Contact & Support</h4>
                <div className="flex flex-wrap gap-3">
                  {business.whatsapp_number && (
                    <a
                      href={`https://wa.me/${business.whatsapp_number.replace(/[^\d]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition border border-emerald-200"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp: {business.whatsapp_number}</span>
                    </a>
                  )}

                  {business.phone && (
                    <a
                      href={`tel:${business.phone}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Call: {business.phone}</span>
                    </a>
                  )}

                  {business.email && (
                    <a
                      href={`mailto:${business.email}`}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{business.email}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Store Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 px-4 text-center space-y-3">
        <p className="text-xs font-semibold text-slate-900">{business.name}</p>
        <p className="text-2xs text-slate-500">
          {business.phone} {business.address && `• ${business.address}`}
        </p>

        {/* Platform Branding */}
        {!entitlements?.can_remove_branding && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-2xs text-slate-400">
            <span>Powered by</span>
            <Link to="/" className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1">
              <img src="/Xhipa.png" alt="Xhipa" className="w-3.5 h-3.5 rounded object-contain" />
              <span>Xhipa</span>
            </Link>
          </div>
        )}
      </footer>

      {/* Slide-out Cart Drawer for Guest Checkout */}
      <CartDrawer storeSlug={store.slug} settings={settings} isDemo={isDemo} />

      {/* WhatsApp Modal */}
      <WhatsAppOrderModal
        isOpen={Boolean(whatsAppProduct)}
        onClose={() => setWhatsAppProduct(null)}
        product={whatsAppProduct}
        business={business}
        storeSlug={store.slug}
        isDemo={isDemo}
      />

      {/* Fullscreen Interactive Story Viewer */}
      <StoryViewerModal
        isOpen={Boolean(activeStoryGroup)}
        onClose={() => setActiveStoryGroup(null)}
        highlightGroup={activeStoryGroup}
        business={business}
        settings={settings}
        storeSlug={store.slug}
        isDemo={isDemo}
        onWhatsAppOrder={p => setWhatsAppProduct(p)}
      />
    </div>
  );
};

