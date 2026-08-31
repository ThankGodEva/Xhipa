import { merchantRepository } from '../repositories/merchant.repository';
import { productRepository } from '../repositories/product.repository';
import { storyRepository } from '../repositories/story.repository';
import { PublicStorefrontBundle } from '../../src/types';
import { DEMO_STORES_MAP } from '../../src/lib/demoStores';
import { normalizeMediaUrl } from './r2Storage.service';

export class StoreService {
  /**
   * Resolves a public storefront bundle by store/business slug
   */
  async getPublicStorefront(slug: string): Promise<PublicStorefrontBundle | null> {
    const cleanSlug = slug.toLowerCase().trim();

    // 0. Check built-in demo stores
    if (DEMO_STORES_MAP[cleanSlug]) {
      return DEMO_STORES_MAP[cleanSlug];
    }

    // 1. Resolve business by slug
    const business = await merchantRepository.getBusinessBySlug(cleanSlug);
    if (!business || (business.status && business.status === 'suspended')) {
      return null;
    }

    // Normalize logo & banner urls
    if (business.logo_url) {
      business.logo_url = normalizeMediaUrl(business.logo_url);
    }
    if (business.banner_url) {
      business.banner_url = normalizeMediaUrl(business.banner_url);
    }

    // 2. Resolve store & settings safely
    const [storeRes, settingsRes, categoriesRes, productsRes, storiesRes] = await Promise.allSettled([
      merchantRepository.getStoreByBusinessId(business.id),
      merchantRepository.getStoreSettings(business.id),
      productRepository.getCategories(business.id),
      productRepository.getProducts(business.id, { status: 'published' }),
      storyRepository.getStoriesByBusinessId(business.id)
    ]);

    let store = storeRes.status === 'fulfilled' ? storeRes.value : null;
    let settings = settingsRes.status === 'fulfilled' ? settingsRes.value : null;
    const categories = categoriesRes.status === 'fulfilled' ? (categoriesRes.value || []) : [];
    const rawProducts = productsRes.status === 'fulfilled' ? (productsRes.value || []) : [];
    const stories = storiesRes.status === 'fulfilled' ? (storiesRes.value || []) : [];

    // Fallback store record if not yet created in db
    if (!store) {
      store = {
        id: `store_${business.id}`,
        business_id: business.id,
        slug: business.slug || cleanSlug,
        status: 'published',
        published_at: business.created_at || new Date().toISOString(),
        created_at: business.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    // Fallback settings if not yet created in db
    if (!settings) {
      settings = {
        id: `settings_${business.id}`,
        business_id: business.id,
        theme: 'modern',
        primary_color: '#059669',
        show_logo: true,
        show_phone: true,
        show_whatsapp: true,
        show_social_links: true,
        enable_catalogue: true,
        enable_checkout: true,
        delivery_fee_type: 'flat',
        flat_delivery_fee: 0,
        delivery_information: '',
        return_policy: '',
        privacy_policy: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    if (settings.banner_url) {
      settings.banner_url = normalizeMediaUrl(settings.banner_url);
    }

    // Only exclude if explicitly archived or draft
    if (store.status === 'archived' || store.status === 'draft') {
      return null;
    }

    // Normalize product image URLs
    const products = rawProducts.map(p => ({
      ...p,
      images: (p.images || []).map(img => ({
        ...img,
        public_url: normalizeMediaUrl(img.public_url || (img as any).url)
      }))
    }));

    return {
      business,
      store,
      settings,
      categories: categories.filter(c => c && c.is_active),
      products: products || [],
      stories: stories || []
    };
  }
}

export const storeService = new StoreService();
