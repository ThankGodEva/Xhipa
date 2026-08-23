-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    is_platform_admin BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Businesses (Tenants)
DO $$ BEGIN
    CREATE TYPE business_status AS ENUM ('active', 'suspended', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    logo_url TEXT,
    phone TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    email TEXT NOT NULL,
    country TEXT DEFAULT 'NG' NOT NULL,
    currency TEXT DEFAULT 'NGN' NOT NULL,
    state TEXT,
    city TEXT,
    address TEXT,
    status business_status DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Business Members
DO $$ BEGIN
    CREATE TYPE member_role AS ENUM ('owner', 'admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.business_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role member_role DEFAULT 'owner' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(business_id, user_id)
);

-- 4. Stores & Store Settings
DO $$ BEGIN
    CREATE TYPE store_status AS ENUM ('draft', 'published', 'suspended', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    status store_status DEFAULT 'draft' NOT NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    theme TEXT DEFAULT 'emerald' NOT NULL,
    primary_color TEXT DEFAULT '#10B981' NOT NULL,
    show_logo BOOLEAN DEFAULT TRUE NOT NULL,
    show_phone BOOLEAN DEFAULT TRUE NOT NULL,
    show_whatsapp BOOLEAN DEFAULT TRUE NOT NULL,
    show_social_links BOOLEAN DEFAULT TRUE NOT NULL,
    enable_catalogue BOOLEAN DEFAULT TRUE NOT NULL,
    enable_checkout BOOLEAN DEFAULT FALSE NOT NULL,
    delivery_fee_type TEXT DEFAULT 'flat' NOT NULL,
    flat_delivery_fee BIGINT DEFAULT 150000 NOT NULL, -- in Kobo (1,500 NGN)
    delivery_information TEXT,
    return_policy TEXT,
    privacy_policy TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(business_id, slug)
);

-- 6. Products & Product Images
DO $$ BEGIN
    CREATE TYPE product_status AS ENUM ('draft', 'published', 'out_of_stock', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    price BIGINT NOT NULL, -- in Kobo
    compare_at_price BIGINT, -- in Kobo
    stock_quantity INT DEFAULT 0 NOT NULL,
    track_inventory BOOLEAN DEFAULT TRUE NOT NULL,
    status product_status DEFAULT 'published' NOT NULL,
    featured BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(business_id, slug)
);

CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    alt_text TEXT,
    sort_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. Customers (Tenant-Scoped)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(business_id, phone)
);

-- 8. Orders & Order Items
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'ready_for_delivery', 'shipped', 'completed', 'cancelled');
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_number TEXT UNIQUE NOT NULL,
    status order_status DEFAULT 'pending' NOT NULL,
    payment_status payment_status DEFAULT 'pending' NOT NULL,
    currency TEXT DEFAULT 'NGN' NOT NULL,
    subtotal BIGINT NOT NULL, -- in Kobo
    delivery_fee BIGINT DEFAULT 0 NOT NULL, -- in Kobo
    total BIGINT NOT NULL, -- in Kobo
    customer_name_snapshot TEXT NOT NULL,
    customer_phone_snapshot TEXT NOT NULL,
    customer_email_snapshot TEXT,
    delivery_address_snapshot TEXT NOT NULL,
    delivery_notes TEXT,
    order_source TEXT DEFAULT 'direct_checkout' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    unit_price BIGINT NOT NULL, -- in Kobo
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal BIGINT NOT NULL, -- in Kobo
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. Payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'paystack' NOT NULL,
    provider_reference TEXT UNIQUE NOT NULL,
    amount BIGINT NOT NULL, -- in Kobo
    currency TEXT DEFAULT 'NGN' NOT NULL,
    status payment_status DEFAULT 'pending' NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 10. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_monthly BIGINT NOT NULL, -- in Kobo
    currency TEXT DEFAULT 'NGN' NOT NULL,
    max_products INT NOT NULL, -- 10, 30, 100, -1 (unlimited)
    can_checkout BOOLEAN NOT NULL,
    remove_branding BOOLEAN NOT NULL,
    custom_domain BOOLEAN NOT NULL,
    advanced_analytics BOOLEAN NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

DO $$ BEGIN
    CREATE TYPE sub_status AS ENUM ('active', 'past_due', 'cancelled', 'trialing');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
    status sub_status DEFAULT 'active' NOT NULL,
    paystack_customer_code TEXT,
    paystack_subscription_code TEXT,
    current_period_start TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    current_period_end TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days') NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance & rapid multi-tenant isolation lookups
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON public.businesses(slug);
CREATE INDEX IF NOT EXISTS idx_business_members_user ON public.business_members(user_id);
CREATE INDEX IF NOT EXISTS idx_business_members_biz ON public.business_members(business_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON public.stores(slug);
CREATE INDEX IF NOT EXISTS idx_products_biz_status ON public.products(business_id, status);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(business_id, slug);
CREATE INDEX IF NOT EXISTS idx_categories_biz ON public.categories(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_biz ON public.orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON public.payments(provider_reference);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Helper function to check tenant access
CREATE OR REPLACE FUNCTION public.has_business_access(target_business_id UUID, minimum_role member_role DEFAULT 'staff')
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view and update own profile" ON public.profiles;
CREATE POLICY "Users can view and update own profile"
    ON public.profiles FOR ALL
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. Businesses Policies
DROP POLICY IF EXISTS "Public can view active businesses associated with published stores" ON public.businesses;
CREATE POLICY "Public can view active businesses associated with published stores"
    ON public.businesses FOR SELECT
    USING (status = 'active' OR has_business_access(id));

DROP POLICY IF EXISTS "Owners and admins can update their business" ON public.businesses;
CREATE POLICY "Owners and admins can update their business"
    ON public.businesses FOR UPDATE
    USING (has_business_access(id, 'admin'))
    WITH CHECK (has_business_access(id, 'admin'));

-- 3. Business Members Policies
DROP POLICY IF EXISTS "Members can view membership within their business" ON public.business_members;
CREATE POLICY "Members can view membership within their business"
    ON public.business_members FOR SELECT
    USING (user_id = auth.uid() OR has_business_access(business_id, 'admin'));

DROP POLICY IF EXISTS "Owners can manage membership" ON public.business_members;
CREATE POLICY "Owners can manage membership"
    ON public.business_members FOR ALL
    USING (has_business_access(business_id, 'owner'))
    WITH CHECK (has_business_access(business_id, 'owner'));

-- 4. Stores Policies
DROP POLICY IF EXISTS "Public can view published stores" ON public.stores;
CREATE POLICY "Public can view published stores"
    ON public.stores FOR SELECT
    USING (status = 'published' OR has_business_access(business_id));

DROP POLICY IF EXISTS "Admins can update stores" ON public.stores;
CREATE POLICY "Admins can update stores"
    ON public.stores FOR ALL
    USING (has_business_access(business_id, 'admin'))
    WITH CHECK (has_business_access(business_id, 'admin'));

-- 5. Store Settings Policies
DROP POLICY IF EXISTS "Public can view settings of published stores" ON public.store_settings;
CREATE POLICY "Public can view settings of published stores"
    ON public.store_settings FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.stores s WHERE s.business_id = store_settings.business_id AND s.status = 'published')
        OR has_business_access(business_id)
    );

DROP POLICY IF EXISTS "Admins can update store settings" ON public.store_settings;
CREATE POLICY "Admins can update store settings"
    ON public.store_settings FOR ALL
    USING (has_business_access(business_id, 'admin'))
    WITH CHECK (has_business_access(business_id, 'admin'));

-- 6. Categories Policies
DROP POLICY IF EXISTS "Public can view categories of published stores" ON public.categories;
CREATE POLICY "Public can view categories of published stores"
    ON public.categories FOR SELECT
    USING (
        (is_active = TRUE AND EXISTS (SELECT 1 FROM public.stores s WHERE s.business_id = categories.business_id AND s.status = 'published'))
        OR has_business_access(business_id)
    );

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories FOR ALL
    USING (has_business_access(business_id, 'admin'))
    WITH CHECK (has_business_access(business_id, 'admin'));

-- 7. Products & Images Policies
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
    ON public.products FOR SELECT
    USING (
        (status = 'published' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.business_id = products.business_id AND s.status = 'published'))
        OR has_business_access(business_id)
    );

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products FOR ALL
    USING (has_business_access(business_id, 'admin'))
    WITH CHECK (has_business_access(business_id, 'admin'));

DROP POLICY IF EXISTS "Public can view product images" ON public.product_images;
CREATE POLICY "Public can view product images"
    ON public.product_images FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.status = 'published')
        OR has_business_access(business_id)
    );

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images"
    ON public.product_images FOR ALL
    USING (has_business_access(business_id, 'admin'))
    WITH CHECK (has_business_access(business_id, 'admin'));

-- 8. Customers, Orders, Payments (Private - strictly merchant & service role)
DROP POLICY IF EXISTS "Members can view own business customers" ON public.customers;
CREATE POLICY "Members can view own business customers"
    ON public.customers FOR SELECT
    USING (has_business_access(business_id));

DROP POLICY IF EXISTS "Members can view and manage own business orders" ON public.orders;
CREATE POLICY "Members can view and manage own business orders"
    ON public.orders FOR ALL
    USING (has_business_access(business_id))
    WITH CHECK (has_business_access(business_id));

DROP POLICY IF EXISTS "Members can view own business order items" ON public.order_items;
CREATE POLICY "Members can view own business order items"
    ON public.order_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND has_business_access(o.business_id)));

DROP POLICY IF EXISTS "Members can view own business payments" ON public.payments;
CREATE POLICY "Members can view own business payments"
    ON public.payments FOR SELECT
    USING (has_business_access(business_id));

-- 9. Plans & Subscriptions
DROP POLICY IF EXISTS "Public can view subscription plans" ON public.subscription_plans;
CREATE POLICY "Public can view subscription plans"
    ON public.subscription_plans FOR SELECT
    USING (is_active = TRUE);

DROP POLICY IF EXISTS "Members can view own business subscription" ON public.subscriptions;
CREATE POLICY "Members can view own business subscription"
    ON public.subscriptions FOR SELECT
    USING (has_business_access(business_id));
