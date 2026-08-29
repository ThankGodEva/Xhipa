-- ==============================================================================
-- Migration 011: Storefront Customer Reviews & Merchant Testimonials
-- Creates table to store product and merchant reviews, verification status, and ratings
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.store_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT,
    customer_name TEXT NOT NULL,
    customer_email TEXT,
    customer_avatar TEXT,
    location TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    photos JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_approved BOOLEAN DEFAULT TRUE NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE NOT NULL,
    helpful_votes INTEGER DEFAULT 0 NOT NULL,
    source TEXT DEFAULT 'storefront' NOT NULL, -- 'storefront' | 'order_tracking' | 'merchant_manual'
    order_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_store_reviews_business ON public.store_reviews(business_id, is_approved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_reviews_product ON public.store_reviews(product_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_store_reviews_order ON public.store_reviews(order_number);

-- Enable RLS
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Public can view approved reviews
CREATE POLICY "Public can view approved store reviews" ON public.store_reviews
    FOR SELECT USING (is_approved = true);

-- Anyone can submit a review to a business
CREATE POLICY "Public can insert reviews" ON public.store_reviews
    FOR INSERT WITH CHECK (true);

-- Public can upvote helpful votes
CREATE POLICY "Public can upvote reviews" ON public.store_reviews
    FOR UPDATE USING (true);

-- Merchants can manage all reviews for their business
CREATE POLICY "Merchants can manage their reviews" ON public.store_reviews
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM public.business_members 
            WHERE user_id = auth.uid()
        )
    );
