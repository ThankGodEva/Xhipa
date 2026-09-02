-- Migration 012: Add is_verified column to businesses table
-- Allows platform admins to grant verified merchant checkmarks

ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Index for querying verified businesses
CREATE INDEX IF NOT EXISTS idx_businesses_is_verified ON public.businesses(is_verified);
