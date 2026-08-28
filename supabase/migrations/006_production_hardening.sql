-- ==============================================================================
-- 006_production_hardening.sql
-- Migration: Atomic inventory deduction, Webhook idempotency, Platform settings,
-- Subscription payment support, and Database-backed governance.
-- ==============================================================================

-- 1. ATOMIC INVENTORY DEDUCTION FUNCTION
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id UUID,
    p_quantity INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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

-- 2. WEBHOOK IDEMPOTENCY TABLE
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    provider TEXT DEFAULT 'paystack' NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    processed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed default platform governance settings
INSERT INTO public.platform_settings (key, value)
VALUES 
    ('general', '{"platform_name": "Xhipa Storefront SaaS", "support_email": "support@xhipa.ng", "maintenance_mode": false, "show_affiliate_button": true, "affiliate_program_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 4. PAYMENTS TABLE HARDENING FOR SUBSCRIPTIONS & DIRECT CHARGES
ALTER TABLE public.payments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'order';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- 5. RLS POLICIES FOR NEW TABLES
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform settings are readable by all" ON public.platform_settings;
CREATE POLICY "Platform settings are readable by all"
    ON public.platform_settings FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Platform settings are manageable by admins" ON public.platform_settings;
CREATE POLICY "Platform settings are manageable by admins"
    ON public.platform_settings FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE));
