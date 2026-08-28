import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { StoryHighlightGroup } from '../../src/types';

export class StoryRepository {
  /**
   * Get all active story groups and slides for a business
   */
  async getStoriesByBusinessId(businessId: string): Promise<StoryHighlightGroup[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data: stories, error } = await supabase
        .from('store_stories')
        .select('*, store_story_slides(*)')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      if (!stories || stories.length === 0) {
        return [];
      }

      return stories.map((s: any) => ({
        id: s.story_key || s.id,
        business_id: s.business_id,
        title: s.title,
        coverImage: s.cover_image || '',
        unread: Boolean(s.unread),
        slides: (s.store_story_slides || [])
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          .map((sl: any) => ({
            id: sl.id,
            title: sl.title,
            subtitle: sl.subtitle || undefined,
            image: sl.image_url || sl.image || '',
            tag: sl.tag || undefined,
            product_id: sl.product_id || undefined,
            likesCount: sl.likes_count || 0
          })),
        created_at: s.created_at,
        updated_at: s.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Save or replace all story highlights for a business
   */
  async saveStories(businessId: string, stories: StoryHighlightGroup[]): Promise<StoryHighlightGroup[]> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      // Delete existing slides and stories for this business
      await supabase.from('store_stories').delete().eq('business_id', businessId);

      for (let i = 0; i < stories.length; i++) {
        const group = stories[i];
        const coverImg = group.coverImage || (group as any).cover_image || '';
        const { data: createdGroup, error: groupErr } = await supabase
          .from('store_stories')
          .insert({
            business_id: businessId,
            story_key: group.id,
            title: group.title,
            cover_image: coverImg,
            unread: group.unread ?? false,
            sort_order: i,
            is_active: true,
            created_at: now,
            updated_at: now
          })
          .select('*')
          .single();

        if (groupErr) throw groupErr;

        if (createdGroup && group.slides && group.slides.length > 0) {
          const slidesToInsert = group.slides.map((slide, sIdx) => ({
            story_id: createdGroup.id,
            title: slide.title,
            subtitle: slide.subtitle || null,
            image_url: slide.image || (slide as any).imageUrl || '',
            tag: slide.tag || null,
            product_id: slide.product_id || (slide as any).productId || null,
            sort_order: sIdx,
            likes_count: slide.likesCount || (slide as any).likes || 0,
            created_at: now,
            updated_at: now
          }));

          const { error: slideErr } = await supabase.from('store_story_slides').insert(slidesToInsert);
          if (slideErr) throw slideErr;
        }
      }

      return stories;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }
}

export const storyRepository = new StoryRepository();
