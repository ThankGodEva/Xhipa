-- ==============================================================================
-- Migration 004: Storefront Stories and Highlight Groups Schema
-- Creates tables to store merchant customizable Instagram-style stories
-- ==============================================================================

-- 1. Storefront Stories Table (Highlight Groups)
CREATE TABLE IF NOT EXISTS public.store_stories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    story_key TEXT NOT NULL, -- e.g. 'reviews', 'unboxing', 'bestsellers', 'routine', 'shipping' or custom id
    title TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    unread BOOLEAN DEFAULT TRUE NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(business_id, story_key)
);

-- 2. Store Story Slides Table (Individual story cards inside each highlight)
CREATE TABLE IF NOT EXISTS public.store_story_slides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    story_id UUID NOT NULL REFERENCES public.store_stories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    tag TEXT,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    likes_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices for rapid storefront lookup and sorting
CREATE INDEX IF NOT EXISTS idx_store_stories_business ON public.store_stories(business_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_store_story_slides_story ON public.store_story_slides(story_id, sort_order);

-- Enable Row Level Security (RLS)
ALTER TABLE public.store_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_story_slides ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view active stories on storefronts
CREATE POLICY "Public can view active storefront stories" ON public.store_stories
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public can view storefront story slides" ON public.store_story_slides
    FOR SELECT USING (true);

-- Policy: Merchants can read, insert, update, and delete their own store stories
CREATE POLICY "Merchants can manage their store stories" ON public.store_stories
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.business_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Merchants can manage their story slides" ON public.store_story_slides
    FOR ALL USING (
        story_id IN (
            SELECT s.id FROM public.store_stories s
            JOIN public.business_members bm ON bm.business_id = s.business_id
            WHERE bm.user_id = auth.uid()
        )
    );

-- Seed default stories for existing businesses if needed
INSERT INTO public.store_stories (id, business_id, story_key, title, cover_image, unread, sort_order)
SELECT 
    uuid_generate_v4(), 
    b.id, 
    'reviews', 
    'Reviews', 
    'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200', 
    true, 
    0
FROM public.businesses b
ON CONFLICT (business_id, story_key) DO NOTHING;
