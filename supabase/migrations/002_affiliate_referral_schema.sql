-- =========================================================================
-- STOREFRONT SAAS: AFFILIATE & REFERRAL SYSTEM SCHEMA (MIGRATION 002)
-- =========================================================================

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE affiliate_status AS ENUM ('active', 'suspended');
    CREATE TYPE referral_status AS ENUM ('signed_up', 'active', 'converted', 'cancelled', 'fraudulent');
    CREATE TYPE commission_status AS ENUM ('pending', 'eligible', 'paid', 'cancelled', 'reversed');
    CREATE TYPE payout_status AS ENUM ('pending', 'processing', 'paid', 'rejected');
    CREATE TYPE fraud_status AS ENUM ('normal', 'suspicious', 'fraudulent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. AFFILIATES TABLE
CREATE TABLE IF NOT EXISTS public.affiliates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    affiliate_code TEXT UNIQUE NOT NULL,
    status affiliate_status DEFAULT 'active' NOT NULL,
    payout_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. AFFILIATE CLICKS TABLE
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    anonymous_identifier TEXT NOT NULL, -- SHA256 hashed privacy fingerprint
    landing_page TEXT DEFAULT '/register' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. AFFILIATE REFERRALS TABLE (Authoritative Permanent Referral Relationships)
CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    referred_user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_id UUID UNIQUE NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status referral_status DEFAULT 'signed_up' NOT NULL,
    fraud_status fraud_status DEFAULT 'normal' NOT NULL,
    fraud_score INT DEFAULT 0 NOT NULL,
    fraud_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
    attributed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. AFFILIATE COMMISSIONS TABLE (Immutable financial ledger records)
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    referral_id UUID UNIQUE NOT NULL REFERENCES public.affiliate_referrals(id) ON DELETE CASCADE,
    amount BIGINT DEFAULT 80000 NOT NULL, -- in Kobo (80,000 = ₦800 NGN)
    currency TEXT DEFAULT 'NGN' NOT NULL,
    status commission_status DEFAULT 'pending' NOT NULL,
    trigger TEXT DEFAULT 'first_successful_paid_subscription' NOT NULL,
    eligible_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    paid_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6. AFFILIATE PAYOUTS TABLE
CREATE TABLE IF NOT EXISTS public.affiliate_payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- in Kobo
    currency TEXT DEFAULT 'NGN' NOT NULL,
    status payout_status DEFAULT 'paid' NOT NULL,
    payment_reference TEXT UNIQUE NOT NULL,
    commission_ids UUID[] NOT NULL,
    notes TEXT,
    paid_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =========================================================================
-- INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_affiliates_code ON public.affiliates(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created ON public.affiliate_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_user ON public.affiliate_referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_biz ON public.affiliate_referrals(business_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_status ON public.affiliate_commissions(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read);

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Affiliates: Owner can view/update their record. Platform admin can manage all.
DROP POLICY IF EXISTS "Users can view and manage own affiliate record" ON public.affiliates;
CREATE POLICY "Users can view and manage own affiliate record"
    ON public.affiliates FOR ALL
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE))
    WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE));

-- Affiliate Clicks: Affiliates can view clicks attributed to them.
DROP POLICY IF EXISTS "Affiliates can view own clicks" ON public.affiliate_clicks;
CREATE POLICY "Affiliates can view own clicks"
    ON public.affiliate_clicks FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_clicks.affiliate_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE))));

-- Referrals: Affiliates can view their own referrals.
DROP POLICY IF EXISTS "Affiliates can view own referrals" ON public.affiliate_referrals;
CREATE POLICY "Affiliates can view own referrals"
    ON public.affiliate_referrals FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_referrals.affiliate_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE))));

-- Commissions: Affiliates can view own earned commissions. Platform admin can manage.
DROP POLICY IF EXISTS "Affiliates can view own commissions" ON public.affiliate_commissions;
CREATE POLICY "Affiliates can view own commissions"
    ON public.affiliate_commissions FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_commissions.affiliate_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE))));

-- Payouts: Affiliates can view own payouts.
DROP POLICY IF EXISTS "Affiliates can view own payouts" ON public.affiliate_payouts;
CREATE POLICY "Affiliates can view own payouts"
    ON public.affiliate_payouts FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_payouts.affiliate_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_platform_admin = TRUE))));

-- Notifications: Users can view and update own notifications.
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
