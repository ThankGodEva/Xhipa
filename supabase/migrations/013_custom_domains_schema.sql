-- ==============================================================================
-- 013_custom_domains_schema.sql
-- Production Custom Domains Schema for Xhipa Cloudflare for SaaS Integration
-- ==============================================================================

-- 1. Create custom_domains table
CREATE TABLE IF NOT EXISTS public.custom_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    hostname TEXT NOT NULL,
    normalized_hostname TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    verification_status TEXT DEFAULT 'pending',
    ssl_status TEXT DEFAULT 'pending',
    cloudflare_hostname_id TEXT,
    cloudflare_status TEXT,
    cloudflare_ssl_status TEXT,
    validation_records JSONB DEFAULT '[]'::jsonb,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    last_checked_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_custom_domains_normalized_hostname ON public.custom_domains(normalized_hostname);
CREATE INDEX IF NOT EXISTS idx_custom_domains_business_id ON public.custom_domains(business_id);
CREATE INDEX IF NOT EXISTS idx_custom_domains_status ON public.custom_domains(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domains_primary_business ON public.custom_domains(business_id) WHERE is_primary = TRUE;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.custom_domains ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Public read policy for active custom domains (used by edge resolvers and storefront routing)
CREATE POLICY "Public can view active custom domains"
    ON public.custom_domains
    FOR SELECT
    USING (status = 'active');

-- Authenticated merchant team members can view their business custom domains
CREATE POLICY "Merchants can view their custom domains"
    ON public.custom_domains
    FOR SELECT
    TO authenticated
    USING (public.has_business_access(business_id, 'staff'));

-- Authenticated merchant owners and admins can insert new custom domains
CREATE POLICY "Merchants can insert their custom domains"
    ON public.custom_domains
    FOR INSERT
    TO authenticated
    WITH CHECK (public.has_business_access(business_id, 'admin'));

-- Authenticated merchant owners and admins can update their custom domains
CREATE POLICY "Merchants can update their custom domains"
    ON public.custom_domains
    FOR UPDATE
    TO authenticated
    USING (public.has_business_access(business_id, 'admin'))
    WITH CHECK (public.has_business_access(business_id, 'admin'));

-- Authenticated merchant owners and admins can delete their custom domains
CREATE POLICY "Merchants can delete their custom domains"
    ON public.custom_domains
    FOR DELETE
    TO authenticated
    USING (public.has_business_access(business_id, 'admin'));
