-- ==============================================================================
-- 007_phase9_production_security.sql
-- Migration: Enhanced database constraints, search_path security on functions,
-- and strict invariant enforcement.
-- ==============================================================================

-- 1. SECURITY DEFINER search_path hardening
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

-- 2. Financial & Inventory Invariant Check Constraints
DO $$ BEGIN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_price_non_negative CHECK (price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.products ADD CONSTRAINT chk_products_stock_non_negative CHECK (stock_quantity >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_total_non_negative CHECK (total >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_subtotal_non_negative CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_unit_price_non_negative CHECK (unit_price >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_subtotal_non_negative CHECK (subtotal >= 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.payments ADD CONSTRAINT chk_payments_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.affiliate_commissions ADD CONSTRAINT chk_commissions_amount_positive CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
