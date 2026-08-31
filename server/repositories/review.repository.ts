import { getRequiredSupabase, isSupabaseConfigured } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { StoreReview, ReviewStats } from '../../src/types';
import { normalizeMediaUrl } from '../services/r2Storage.service';

const inMemoryReviews: StoreReview[] = [];

function readAllFallbackReviews(): StoreReview[] {
  return [...inMemoryReviews];
}

function writeAllFallbackReviews(reviews: StoreReview[]): void {
  inMemoryReviews.length = 0;
  inMemoryReviews.push(...reviews);
}

// Initial seed reviews for new stores / demo stores
const DEFAULT_SEED_REVIEWS: Omit<StoreReview, 'id' | 'business_id' | 'created_at'>[] = [
  {
    customer_name: 'Amara Nwosu',
    location: 'Lekki Phase 1, Lagos',
    customer_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120',
    product_name: '20% Vitamin C Radiance Serum',
    rating: 5,
    is_verified: true,
    is_approved: true,
    is_featured: true,
    comment: 'Literally the best serum I have used! My acne spots are almost invisible after 2 weeks of consistent use. The texture is lightweight and absorbs immediately without making my face oily.',
    helpful_votes: 19,
    source: 'order_tracking',
    photos: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400'
    ]
  },
  {
    customer_name: 'Blessing Adebayo',
    location: 'Maitama, Abuja',
    customer_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120',
    product_name: 'Organic Golden Marula Glow Body Oil',
    rating: 5,
    is_verified: true,
    is_approved: true,
    is_featured: true,
    comment: 'Delivery to Abuja took only 2 days! The packaging is top tier with bubble wrap and cute thank-you notes. The glow oil smells heavenly and keeps my skin hydrated all day long.',
    helpful_votes: 27,
    source: 'storefront',
    photos: [
      'https://images.unsplash.com/photo-1608248597359-07f2a74c3e7b?w=400'
    ]
  },
  {
    customer_name: 'Chinedu Eze',
    location: 'Ikeja GRA, Lagos',
    customer_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120',
    product_name: 'Clarifying Tea Tree & Green Tea Face Cleanser',
    rating: 5,
    is_verified: true,
    is_approved: true,
    is_featured: false,
    comment: 'My girlfriend recommended this cleanser to me for beard breakout issues. It cleared my irritation within 4 days. Very mild and does not sting at all.',
    helpful_votes: 14,
    source: 'merchant_manual',
    photos: []
  }
];

export class ReviewRepository {
  /**
   * Seed default reviews if none exist for a business in fallback store
   */
  private ensureSeedReviews(businessId: string): StoreReview[] {
    const all = readAllFallbackReviews();
    const existing = all.filter(r => r.business_id === businessId);
    if (existing.length > 0) return existing;

    const now = new Date();
    const seeded: StoreReview[] = DEFAULT_SEED_REVIEWS.map((seed, idx) => ({
      ...seed,
      id: `rev-${businessId.slice(0, 8)}-${idx + 1}`,
      business_id: businessId,
      created_at: new Date(now.getTime() - (idx + 1) * 3 * 24 * 60 * 60 * 1000).toISOString()
    }));

    all.push(...seeded);
    writeAllFallbackReviews(all);
    return seeded;
  }

  /**
   * Get approved reviews for a public storefront
   */
  async getApprovedReviews(businessId: string, productId?: string): Promise<StoreReview[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        let query = supabase
          .from('store_reviews')
          .select('*')
          .eq('business_id', businessId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (productId) {
          query = query.eq('product_id', productId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          return data.map(this.mapDatabaseRow);
        }
      } catch (err) {
        console.warn('Supabase getApprovedReviews error, falling back to local storage:', err);
      }
    }

    // Fallback store
    const list = this.ensureSeedReviews(businessId);
    return list
      .filter(r => r.is_approved && (!productId || r.product_id === productId))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Get all reviews for a merchant dashboard (approved + pending + flagged)
   */
  async getAllMerchantReviews(businessId: string): Promise<StoreReview[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        const { data, error } = await supabase
          .from('store_reviews')
          .select('*')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(this.mapDatabaseRow);
        }
      } catch (err) {
        console.warn('Supabase getAllMerchantReviews error, falling back to local storage:', err);
      }
    }

    // Fallback store
    return this.ensureSeedReviews(businessId).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Create a new review
   */
  async createReview(payload: {
    business_id: string;
    product_id?: string;
    product_name?: string;
    customer_name: string;
    customer_email?: string;
    customer_avatar?: string;
    location?: string;
    rating: number;
    comment: string;
    photos?: string[];
    is_verified?: boolean;
    is_approved?: boolean;
    is_featured?: boolean;
    source?: 'storefront' | 'order_tracking' | 'merchant_manual';
    order_number?: string;
  }): Promise<StoreReview> {
    const photos = (payload.photos || []).map(normalizeMediaUrl);
    const newId = `rev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const newReview: StoreReview = {
      id: newId,
      business_id: payload.business_id,
      product_id: payload.product_id || undefined,
      product_name: payload.product_name || undefined,
      customer_name: payload.customer_name.trim(),
      customer_email: payload.customer_email?.trim() || undefined,
      customer_avatar: payload.customer_avatar || undefined,
      location: payload.location?.trim() || undefined,
      rating: Math.max(1, Math.min(5, Math.round(payload.rating || 5))),
      comment: payload.comment.trim(),
      photos,
      is_verified: Boolean(payload.is_verified || payload.order_number),
      is_approved: payload.is_approved ?? true,
      is_featured: Boolean(payload.is_featured),
      helpful_votes: 0,
      source: payload.source || 'storefront',
      order_number: payload.order_number?.trim() || undefined,
      created_at: now,
      updated_at: now
    };

    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        const { data, error } = await supabase
          .from('store_reviews')
          .insert({
            business_id: newReview.business_id,
            product_id: newReview.product_id || null,
            product_name: newReview.product_name || null,
            customer_name: newReview.customer_name,
            customer_email: newReview.customer_email || null,
            customer_avatar: newReview.customer_avatar || null,
            location: newReview.location || null,
            rating: newReview.rating,
            comment: newReview.comment,
            photos: newReview.photos,
            is_verified: newReview.is_verified,
            is_approved: newReview.is_approved,
            is_featured: newReview.is_featured,
            helpful_votes: 0,
            source: newReview.source,
            order_number: newReview.order_number || null
          })
          .select()
          .single();

        if (!error && data) {
          return this.mapDatabaseRow(data);
        }
      } catch (err) {
        console.warn('Supabase createReview error, writing to fallback store:', err);
      }
    }

    // Fallback store
    const all = readAllFallbackReviews();
    all.unshift(newReview);
    writeAllFallbackReviews(all);
    return newReview;
  }

  /**
   * Update review properties (approval, featured status, rating, comment)
   */
  async updateReview(
    businessId: string,
    reviewId: string,
    updates: Partial<StoreReview>
  ): Promise<StoreReview> {
    const now = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        const payload: any = { updated_at: now };
        if (typeof updates.is_approved === 'boolean') payload.is_approved = updates.is_approved;
        if (typeof updates.is_featured === 'boolean') payload.is_featured = updates.is_featured;
        if (typeof updates.rating === 'number') payload.rating = updates.rating;
        if (typeof updates.comment === 'string') payload.comment = updates.comment;
        if (typeof updates.customer_name === 'string') payload.customer_name = updates.customer_name;
        if (typeof updates.product_name === 'string') payload.product_name = updates.product_name;

        const { data, error } = await supabase
          .from('store_reviews')
          .update(payload)
          .eq('id', reviewId)
          .eq('business_id', businessId)
          .select()
          .single();

        if (!error && data) {
          return this.mapDatabaseRow(data);
        }
      } catch (err) {
        console.warn('Supabase updateReview error, falling back to local storage:', err);
      }
    }

    // Fallback store
    const all = readAllFallbackReviews();
    const idx = all.findIndex(r => r.id === reviewId && r.business_id === businessId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates, updated_at: now };
      writeAllFallbackReviews(all);
      return all[idx];
    }

    throw new Error('Review not found');
  }

  /**
   * Delete a review
   */
  async deleteReview(businessId: string, reviewId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        const { error } = await supabase
          .from('store_reviews')
          .delete()
          .eq('id', reviewId)
          .eq('business_id', businessId);

        if (!error) return true;
      } catch (err) {
        console.warn('Supabase deleteReview error, falling back to local storage:', err);
      }
    }

    const all = readAllFallbackReviews();
    const filtered = all.filter(r => !(r.id === reviewId && r.business_id === businessId));
    writeAllFallbackReviews(filtered);
    return true;
  }

  /**
   * Increment helpful upvote count
   */
  async upvoteHelpful(reviewId: string): Promise<number> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getRequiredSupabase();
        const { data: current } = await supabase
          .from('store_reviews')
          .select('helpful_votes')
          .eq('id', reviewId)
          .single();

        if (current) {
          const newVotes = (current.helpful_votes || 0) + 1;
          await supabase
            .from('store_reviews')
            .update({ helpful_votes: newVotes })
            .eq('id', reviewId);
          return newVotes;
        }
      } catch (err) {
        console.warn('Supabase upvoteHelpful error, falling back to local storage:', err);
      }
    }

    const all = readAllFallbackReviews();
    const rev = all.find(r => r.id === reviewId);
    if (rev) {
      rev.helpful_votes = (rev.helpful_votes || 0) + 1;
      writeAllFallbackReviews(all);
      return rev.helpful_votes;
    }
    return 1;
  }

  /**
   * Calculate stats for a business's reviews
   */
  calculateStats(reviews: StoreReview[]): ReviewStats {
    const approved = reviews.filter(r => r.is_approved);
    const total = approved.length;
    if (total === 0) {
      return {
        average_rating: 5.0,
        total_reviews: 0,
        verified_reviews_count: 0,
        rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      };
    }

    const dist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let verifiedCount = 0;

    for (const r of approved) {
      const rating = Math.max(1, Math.min(5, r.rating || 5)) as 1 | 2 | 3 | 4 | 5;
      dist[rating] = (dist[rating] || 0) + 1;
      sum += rating;
      if (r.is_verified) verifiedCount++;
    }

    const avg = Number((sum / total).toFixed(1));

    return {
      average_rating: avg,
      total_reviews: total,
      verified_reviews_count: verifiedCount,
      rating_distribution: dist
    };
  }

  private mapDatabaseRow(row: any): StoreReview {
    return {
      id: row.id,
      business_id: row.business_id,
      product_id: row.product_id || undefined,
      product_name: row.product_name || undefined,
      customer_name: row.customer_name,
      customer_email: row.customer_email || undefined,
      customer_avatar: row.customer_avatar || undefined,
      location: row.location || undefined,
      rating: row.rating,
      comment: row.comment,
      photos: Array.isArray(row.photos) ? row.photos.map(normalizeMediaUrl) : [],
      is_verified: Boolean(row.is_verified),
      is_approved: Boolean(row.is_approved),
      is_featured: Boolean(row.is_featured),
      helpful_votes: row.helpful_votes || 0,
      source: row.source || 'storefront',
      order_number: row.order_number || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

export const reviewRepository = new ReviewRepository();
