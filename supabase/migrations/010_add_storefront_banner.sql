-- ==============================================================================
-- Migration 010: Add Storefront Banner Support
-- Adds banner_url column to businesses and store_settings for custom storefront hero banners
-- ==============================================================================

-- 1. Add banner_url to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 2. Add banner_url to store_settings table
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- 3. Comment for documentation
COMMENT ON COLUMN public.businesses.banner_url IS 'Custom high-resolution storefront hero banner image URL';
COMMENT ON COLUMN public.store_settings.banner_url IS 'Custom theme hero banner image URL (optional override)';
