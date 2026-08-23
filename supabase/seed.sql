-- Seed Subscription Plans
INSERT INTO public.subscription_plans (id, name, description, price_monthly, currency, max_products, can_checkout, remove_branding, custom_domain, advanced_analytics, is_active)
VALUES
  ('free', 'Free Plan', 'Ideal for hobbyists and early sellers starting out on social media.', 0, 'NGN', 10, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('beginner', 'Beginner Plan', 'For growing sellers who need more product catalogue capacity.', 135000, 'NGN', 30, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('whatsapp_starter', 'WhatsApp Starter Plan', 'For high-volume catalogue sellers who want expanded product capacity on WhatsApp.', 299999, 'NGN', 100, FALSE, FALSE, FALSE, FALSE, TRUE),
  ('starter', 'Starter Plan', 'For active merchants accepting automated online payments & guest checkout.', 500000, 'NGN', 100, TRUE, FALSE, FALSE, FALSE, TRUE),
  ('business', 'Business Plan', 'For established retailers, mini-dropshippers and multi-product stores.', 1500000, 'NGN', -1, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  max_products = EXCLUDED.max_products,
  can_checkout = EXCLUDED.can_checkout,
  remove_branding = EXCLUDED.remove_branding,
  custom_domain = EXCLUDED.custom_domain,
  advanced_analytics = EXCLUDED.advanced_analytics;
