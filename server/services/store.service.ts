import { db } from '../data/store';
import { PublicStorefrontBundle } from '../../src/types';

export class StoreService {
  /**
   * Resolves a public storefront bundle by slug
   */
  getPublicStorefront(slug: string): PublicStorefrontBundle | null {
    const cleanSlug = slug.toLowerCase().trim();
    
    // Find store
    const store = Array.from(db.stores.values()).find(s => s.slug === cleanSlug && s.status === 'published');
    if (!store) {
      return null;
    }

    // Find business
    const business = db.businesses.get(store.business_id);
    if (!business || business.status !== 'active') {
      return null;
    }

    // Find settings
    const settings = db.storeSettings.get(business.id);
    if (!settings) {
      return null;
    }

    // Find published categories
    const categories = Array.from(db.categories.values())
      .filter(c => c.business_id === business.id && c.is_active)
      .sort((a, b) => a.sort_order - b.sort_order);

    // Find published products
    const products = Array.from(db.products.values())
      .filter(p => p.business_id === business.id && p.status === 'published')
      .map(p => ({
        ...p,
        category: categories.find(c => c.id === p.category_id)
      }));

    // Find storefront stories
    const stories = db.getStoriesForBusiness(business.id);

    return {
      business,
      store,
      settings,
      categories,
      products,
      stories
    };
  }
}

export const storeService = new StoreService();
