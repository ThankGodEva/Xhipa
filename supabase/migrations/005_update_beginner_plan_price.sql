-- ==============================================================================
-- 005_update_beginner_plan_price.sql
-- Migration: Update Beginner Plan price to NGN 1,350 / month (135,000 kobo)
-- ==============================================================================

-- Update Beginner Plan price to NGN 1,350 / month (135,000 kobo)
UPDATE public.subscription_plans
SET
    price_monthly = 135000,
    description = 'For growing sellers who need more product catalogue capacity.'
WHERE id = 'beginner';
