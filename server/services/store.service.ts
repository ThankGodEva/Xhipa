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
    if (!business || business.status !== 'active') {
      return null;
    }

    // Normalize logo & banner urls
    if (business.logo_url) {
      business.logo_url = normalizeMediaUrl(business.logo_url);
    }
    if (business.banner_url) {
      business.banner_url = normalizeMediaUrl(business.banner_url);
    }

    // 2. Resolve store & settings
    const [store, settings, categories, products, stories] = await Promise.all([
      merchantRepository.getStoreByBusinessId(business.id),
      merchantRepository.getStoreSettings(business.id),
      productRepository.getCategories(business.id),
      productRepository.getProducts(business.id, { status: 'published' }),
      storyRepository.getStoriesByBusinessId(business.id)
    ]);

    if (!store || !settings) {
      return null;
    }

    if (settings.banner_url) {
      settings.banner_url = normalizeMediaUrl(settings.banner_url);
    }

    // Only allow active published store
    if (store.status !== 'published') {
      return null;
    }

    return {
      business,
      store,
      settings,
      categories: categories.filter(c => c.is_active),
      products,
      stories
    };
  }
}

export const storeService = new StoreService();
