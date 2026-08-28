-- ==============================================================================
-- 009_production_security_cloudflare.sql
-- Migration: Production Hardening, Cloudflare Worker compatibility grants,
-- function execution lockdown, and search_path verification.
-- ==============================================================================

-- 1. Explicit search_path hardening across all public functions
CREATE OR REPLACE FUNCTION public.has_business_access(target_business_id UUID, minimum_role member_role DEFAULT 'staff')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.business_members bm
        WHERE bm.business_id = target_business_id
          AND bm.user_id = auth.uid()
          AND (
            minimum_role = 'staff' OR
            (minimum_role = 'admin' AND bm.role IN ('admin', 'owner')) OR
            (minimum_role = 'owner' AND bm.role = 'owner')
          )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_rows_updated INT;
BEGIN
    UPDATE public.products
    SET 
        stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        status = CASE 
            WHEN track_inventory = TRUE AND (stock_quantity - p_quantity) <= 0 THEN 'out_of_stock'::product_status 
            ELSE status 
        END,
        updated_at = NOW()
    WHERE id = p_product_id
      AND (track_inventory = FALSE OR stock_quantity >= p_quantity);

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    RETURN v_rows_updated > 0;
END;
$$;

-- 2. Restrict Direct Function Invocation from Anon / Authenticated users
-- Settlement functions must only be callable by service_role (backend server / Cloudflare worker)
REVOKE ALL ON FUNCTION public.settle_verified_order_payment(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_verified_order_payment(TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.settle_verified_subscription_payment(TEXT, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_verified_subscription_payment(TEXT, UUID, TEXT, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.adjust_product_stock(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INT) TO service_role;

-- 3. Grant has_business_access to authenticated users for RLS evaluation
GRANT EXECUTE ON FUNCTION public.has_business_access(UUID, member_role) TO authenticated, service_role;

-- 4. Invariant audit log table for distributed tracing & incident recovery
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    provider_reference TEXT,
    amount BIGINT,
    currency VARCHAR(10) DEFAULT 'NGN',
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service_role can insert/read financial audit logs
REVOKE ALL ON public.financial_audit_logs FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.financial_audit_logs TO service_role;
