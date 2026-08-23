-- ==============================================================================
-- 003_update_subscription_plans.sql
-- Migration: Update Beginner Plan capacity to 30 products and add WhatsApp Starter Plan
-- ==============================================================================

-- 1. Update Beginner Plan (Max 30 products, NGN 1,350 / month = 135000 kobo)
UPDATE public.subscription_plans
SET
    max_products = 30,
    price_monthly = 135000,
    description = 'For growing sellers who need more product catalogue capacity.'
WHERE id = 'beginner';

-- 2. Insert or Upsert WhatsApp Starter Plan (Max 100 products, NGN 2,999.99 / month = 299999 kobo)
INSERT INTO public.subscription_plans (
    id,
    name,
    description,
    price_monthly,
    currency,
    max_products,
    can_checkout,
    remove_branding,
    custom_domain,
    advanced_analytics,
    is_active
)
VALUES (
    'whatsapp_starter',
    'WhatsApp Starter Plan',
    'For high-volume catalogue sellers who want expanded product capacity on WhatsApp.',
    299999,
    'NGN',
    100,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    currency = EXCLUDED.currency,
    max_products = EXCLUDED.max_products,
    can_checkout = EXCLUDED.can_checkout,
    remove_branding = EXCLUDED.remove_branding,
    custom_domain = EXCLUDED.custom_domain,
    advanced_analytics = EXCLUDED.advanced_analytics,
    is_active = EXCLUDED.is_active;
