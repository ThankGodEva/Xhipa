-- ==============================================================================
-- 008_atomic_settlement_functions.sql
-- Migration: Atomic Settlement Functions for Orders, Subscriptions, and Inventory
-- ==============================================================================

-- 1. ATOMIC ORDER PAYMENT SETTLEMENT FUNCTION
CREATE OR REPLACE FUNCTION public.settle_verified_order_payment(
    p_provider_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment RECORD;
    v_order RECORD;
    v_item RECORD;
    v_now TIMESTAMPTZ := NOW();
BEGIN
    -- 1. Lock and retrieve payment by provider reference
    SELECT * INTO v_payment
    FROM public.payments
    WHERE provider_reference = p_provider_reference
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'PAYMENT_NOT_FOUND',
            'message', 'Payment record with given reference does not exist.'
        );
    END IF;

    -- 2. Check Idempotency: If already paid, return settled state immediately
    IF v_payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'already_settled', TRUE,
            'payment_id', v_payment.id,
            'order_id', v_payment.order_id,
            'business_id', v_payment.business_id,
            'message', 'Payment was already settled.'
        );
    END IF;

    -- 3. Validate associated order
    IF v_payment.order_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'NOT_AN_ORDER_PAYMENT',
            'message', 'Payment is not linked to an order.'
        );
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_payment.order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'ORDER_NOT_FOUND',
            'message', 'Associated order not found.'
        );
    END IF;

    -- 4. Atomically mark payment as paid
    UPDATE public.payments
    SET 
        status = 'paid',
        paid_at = v_now,
        updated_at = v_now
    WHERE id = v_payment.id;

    -- 5. Atomically mark order as paid & confirmed
    UPDATE public.orders
    SET 
        payment_status = 'paid',
        status = 'confirmed',
        updated_at = v_now
    WHERE id = v_order.id;

    -- 6. Atomically deduct inventory for all order items
    FOR v_item IN 
        SELECT product_id, quantity 
        FROM public.order_items 
        WHERE order_id = v_order.id AND product_id IS NOT NULL
    LOOP
        UPDATE public.products
        SET 
            stock_quantity = GREATEST(0, stock_quantity - v_item.quantity),
            status = CASE 
                WHEN track_inventory = TRUE AND (stock_quantity - v_item.quantity) <= 0 THEN 'out_of_stock'::product_status 
                ELSE status 
            END,
            updated_at = v_now
        WHERE id = v_item.product_id;
    END LOOP;

    -- 7. Record idempotency in processed_webhooks
    INSERT INTO public.processed_webhooks (event_id, event_type, provider, payload, processed_at)
    VALUES (p_provider_reference, 'order_settlement', 'paystack', jsonb_build_object('order_id', v_order.id, 'payment_id', v_payment.id), v_now)
    ON CONFLICT (event_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', TRUE,
        'already_settled', FALSE,
        'payment_id', v_payment.id,
        'order_id', v_order.id,
        'business_id', v_payment.business_id,
        'message', 'Payment successfully settled.'
    );
END;
$$;

-- 2. ATOMIC SUBSCRIPTION PAYMENT SETTLEMENT FUNCTION
CREATE OR REPLACE FUNCTION public.settle_verified_subscription_payment(
    p_provider_reference TEXT,
    p_business_id UUID,
    p_plan_id TEXT,
    p_paystack_customer_code TEXT DEFAULT NULL,
    p_paystack_subscription_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_payment RECORD;
    v_plan RECORD;
    v_referral RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_period_end TIMESTAMPTZ := NOW() + INTERVAL '30 days';
    v_commission_created BOOLEAN := FALSE;
BEGIN
    -- 1. Lock and retrieve payment by provider reference
    SELECT * INTO v_payment
    FROM public.payments
    WHERE provider_reference = p_provider_reference
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'PAYMENT_NOT_FOUND',
            'message', 'Payment record with given reference does not exist.'
        );
    END IF;

    -- 2. Check Idempotency: If already paid, return settled state immediately
    IF v_payment.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'already_settled', TRUE,
            'payment_id', v_payment.id,
            'business_id', p_business_id,
            'plan_id', p_plan_id,
            'message', 'Subscription payment was already settled.'
        );
    END IF;

    -- 3. Verify target subscription plan
    SELECT * INTO v_plan
    FROM public.subscription_plans
    WHERE id = p_plan_id AND is_active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'PLAN_NOT_FOUND',
            'message', 'Active subscription plan not found.'
        );
    END IF;

    -- 4. Mark payment as paid
    UPDATE public.payments
    SET 
        status = 'paid',
        paid_at = v_now,
        updated_at = v_now
    WHERE id = v_payment.id;

    -- 5. Upsert subscription atomically
    INSERT INTO public.subscriptions (
        business_id,
        plan_id,
        status,
        paystack_customer_code,
        paystack_subscription_code,
        current_period_start,
        current_period_end,
        created_at,
        updated_at
    ) VALUES (
        p_business_id,
        p_plan_id,
        'active',
        p_paystack_customer_code,
        p_paystack_subscription_code,
        v_now,
        v_period_end,
        v_now,
        v_now
    )
    ON CONFLICT (business_id) DO UPDATE
    SET 
        plan_id = EXCLUDED.plan_id,
        status = 'active',
        paystack_customer_code = COALESCE(EXCLUDED.paystack_customer_code, subscriptions.paystack_customer_code),
        paystack_subscription_code = COALESCE(EXCLUDED.paystack_subscription_code, subscriptions.paystack_subscription_code),
        current_period_start = v_now,
        current_period_end = v_period_end,
        updated_at = v_now;

    -- 6. If plan supports checkout, enable store checkout
    IF v_plan.can_checkout = TRUE THEN
        UPDATE public.stores
        SET enable_checkout = TRUE, updated_at = v_now
        WHERE business_id = p_business_id;
    END IF;

    -- 7. Handle Affiliate Commission (Atomically & Idempotently)
    SELECT * INTO v_referral
    FROM public.affiliate_referrals
    WHERE business_id = p_business_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_referral.status != 'converted' THEN
            UPDATE public.affiliate_referrals
            SET status = 'converted', converted_at = v_now, updated_at = v_now
            WHERE id = v_referral.id;
        END IF;

        -- Insert commission ledger record (unique on referral_id)
        INSERT INTO public.affiliate_commissions (
            affiliate_id,
            referral_id,
            amount,
            currency,
            status,
            trigger,
            eligible_at,
            created_at,
            updated_at
        ) VALUES (
            v_referral.affiliate_id,
            v_referral.id,
            80000, -- ₦800 NGN in Kobo
            'NGN',
            'pending',
            'first_successful_paid_subscription',
            v_now + INTERVAL '7 days',
            v_now,
            v_now
        )
        ON CONFLICT (referral_id) DO NOTHING;

        v_commission_created := TRUE;
    END IF;

    -- 8. Record webhook idempotency
    INSERT INTO public.processed_webhooks (event_id, event_type, provider, payload, processed_at)
    VALUES (p_provider_reference, 'subscription_settlement', 'paystack', jsonb_build_object('business_id', p_business_id, 'plan_id', p_plan_id), v_now)
    ON CONFLICT (event_id) DO NOTHING;

    RETURN jsonb_build_object(
        'success', TRUE,
        'already_settled', FALSE,
        'payment_id', v_payment.id,
        'business_id', p_business_id,
        'plan_id', p_plan_id,
        'commission_created', v_commission_created,
        'message', 'Subscription payment successfully settled.'
    );
END;
$$;
