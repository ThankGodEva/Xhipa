export type BusinessStatus = 'active' | 'suspended' | 'cancelled';
export type MemberRole = 'owner' | 'admin' | 'staff';
export type StoreStatus = 'draft' | 'published' | 'suspended' | 'archived';
export type ProductStatus = 'draft' | 'published' | 'out_of_stock' | 'archived';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready_for_delivery' | 'shipped' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'trialing';
export type DeliveryFeeType = 'flat' | 'free' | 'pickup';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_platform_admin?: boolean;
  is_email_verified?: boolean;
  email_confirmed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  banner_url?: string;
  phone: string;
  whatsapp_number: string;
  email: string;
  country: string;
  currency: string;
  state?: string;
  city?: string;
  address?: string;
  status: BusinessStatus;
  is_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface Store {
  id: string;
  business_id: string;
  slug: string;
  status: StoreStatus;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  business_id: string;
  theme: string;
  primary_color: string;
  banner_url?: string;
  show_logo: boolean;
  show_phone: boolean;
  show_whatsapp: boolean;
  show_social_links: boolean;
  enable_catalogue: boolean;
  enable_checkout: boolean;
  delivery_fee_type: DeliveryFeeType;
  flat_delivery_fee: number; // in Kobo (e.g. 150000 = 1,500 NGN)
  delivery_information?: string;
  return_policy?: string;
  privacy_policy?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  slug: string;
  description?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  business_id: string;
  product_id: string;
  storage_path: string;
  public_url: string;
  alt_text?: string;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  name: string;
  slug: string;
  description?: string;
  price: number; // in Kobo (e.g. 250000 = 2,500 NGN)
  compare_at_price?: number; // in Kobo
  stock_quantity: number;
  track_inventory: boolean;
  status: ProductStatus;
  featured: boolean;
  images: ProductImage[];
  tiktok_video_url?: string;
  category?: Category;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  total_orders?: number;
  total_spent?: number; // in Kobo
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  product_name_snapshot: string;
  unit_price: number; // in Kobo
  quantity: number;
  subtotal: number; // in Kobo
  product_image_url?: string;
  created_at: string;
}

export interface Order {
  id: string;
  business_id: string;
  customer_id?: string;
  order_number: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  currency: string;
  subtotal: number; // in Kobo
  delivery_fee: number; // in Kobo
  total: number; // in Kobo
  customer_name_snapshot: string;
  customer_phone_snapshot: string;
  customer_email_snapshot?: string;
  delivery_address_snapshot: string;
  delivery_notes?: string;
  order_source: 'direct_checkout' | 'whatsapp';
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  business_id: string;
  order_id?: string | null;
  payment_type?: 'order' | 'subscription';
  provider: string;
  provider_reference: string;
  amount: number; // in Kobo
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, unknown>;
  paid_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: 'free' | 'beginner' | 'whatsapp_starter' | 'starter' | 'business';
  name: string;
  description: string;
  price_monthly: number; // in Kobo (0, 135000, 299999, 500000, 1500000)
  currency: string;
  max_products: number; // 10, 30, 100, -1 (unlimited)
  can_checkout: boolean;
  remove_branding: boolean;
  can_remove_branding?: boolean;
  custom_domain: boolean;
  custom_domain_allowed?: boolean;
  advanced_analytics: boolean;
  features: string[];
  is_active?: boolean; // Controls whether this plan is available for merchants to subscribe to
}

export interface PlatformSettings {
  platform_name?: string;
  support_email?: string;
  show_affiliate_button: boolean;
  affiliate_program_enabled: boolean;
  maintenance_mode?: boolean;
  updated_at?: string;
  [key: string]: any;
}

export interface Entitlements {
  max_products: number;
  can_checkout: boolean;
  can_remove_branding: boolean;
  remove_branding?: boolean;
  custom_domain_allowed: boolean;
  custom_domain?: boolean;
  advanced_analytics: boolean;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: 'free' | 'beginner' | 'whatsapp_starter' | 'starter' | 'business';
  status: SubscriptionStatus;
  paystack_customer_code?: string;
  paystack_subscription_code?: string;
  current_period_start: string;
  current_period_end: string;
  plan?: SubscriptionPlan;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface StorySlide {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  tag?: string;
  product_id?: string;
  product?: Product;
  likesCount?: number;
}

export interface StoryHighlightGroup {
  id: string;
  business_id?: string;
  title: string;
  coverImage: string;
  unread?: boolean;
  slides: StorySlide[];
  created_at?: string;
  updated_at?: string;
}

export interface PublicStorefrontBundle {
  business: Business;
  store: Store;
  settings: StoreSettings;
  categories: Category[];
  products: Product[];
  stories?: StoryHighlightGroup[];
  entitlements?: Entitlements;
}

export type PublicStorefrontData = PublicStorefrontBundle;

// ==========================================
// AFFILIATE & REFERRAL PROGRAM TYPES
// ==========================================

export type AffiliateStatus = 'active' | 'suspended';
export type ReferralStatus = 'signed_up' | 'active' | 'converted' | 'cancelled' | 'fraudulent';
export type CommissionStatus = 'pending' | 'eligible' | 'paid' | 'cancelled' | 'reversed';
export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'rejected';
export type FraudStatus = 'normal' | 'suspicious' | 'fraudulent';

export interface AffiliatePayoutDetails {
  bank_name: string;
  account_number: string;
  account_name: string;
  bank_code?: string;
}

export interface Affiliate {
  id: string;
  user_id: string;
  affiliate_code: string;
  status: AffiliateStatus;
  payout_details?: AffiliatePayoutDetails;
  created_at: string;
  updated_at: string;
}

export interface AffiliateReferral {
  id: string;
  affiliate_id: string;
  referred_user_id: string;
  business_id: string;
  status: ReferralStatus;
  fraud_status?: FraudStatus;
  fraud_score?: number;
  fraud_reasons?: string[];
  attributed_at: string;
  converted_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields for convenience
  referred_user_name?: string;
  referred_user_email?: string;
  business_name?: string;
  business_slug?: string;
  current_plan?: string;
  commission_amount?: number;
  commission_status?: CommissionStatus;
}

export interface AffiliateClick {
  id: string;
  affiliate_id: string;
  referral_code: string;
  anonymous_identifier: string; // SHA256 hashed privacy-conscious fingerprint
  landing_page: string;
  created_at: string;
}

export interface AffiliateCommission {
  id: string;
  affiliate_id: string;
  referral_id: string;
  amount: number; // in Kobo (80000 = ₦800) or NGN
  currency: string; // 'NGN'
  status: CommissionStatus;
  trigger: 'first_successful_paid_subscription';
  eligible_at: string; // Date when commission matures from pending to eligible (7 days default)
  paid_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
  // Joined metadata
  business_name?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliate_id: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  payment_reference: string;
  commission_ids: string[];
  notes?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  // Joined metadata
  affiliate_code?: string;
  affiliate_user_name?: string;
  affiliate_user_email?: string;
  payout_details?: AffiliatePayoutDetails;
}

export interface AffiliateDashboardStats {
  affiliate: Affiliate;
  referral_url: string;
  total_clicks: number;
  total_signups: number;
  total_converted: number;
  pending_commission: number; // in Kobo or NGN
  eligible_commission: number;
  paid_commission: number;
  total_earned: number;
  recent_referrals: AffiliateReferral[];
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
}

export type NotificationType =
  | 'affiliate_signup'
  | 'affiliate_conversion'
  | 'commission_earned'
  | 'commission_eligible'
  | 'payout_completed'
  | 'general';

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

export interface StoreReview {
  id: string;
  business_id: string;
  product_id?: string;
  product_name?: string;
  customer_name: string;
  customer_email?: string;
  customer_avatar?: string;
  location?: string;
  rating: number; // 1 to 5
  comment: string;
  photos: string[];
  is_verified: boolean;
  is_approved: boolean;
  is_featured: boolean;
  helpful_votes: number;
  source: 'storefront' | 'order_tracking' | 'merchant_manual';
  order_number?: string;
  created_at: string;
  updated_at?: string;
}

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  verified_reviews_count: number;
  rating_distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export type CustomDomainStatus = 'pending' | 'pending_validation' | 'active' | 'failed' | 'suspended' | 'deleted';
export type CustomDomainVerificationStatus = 'pending' | 'verified' | 'failed';
export type CustomDomainSslStatus = 'initializing' | 'pending_validation' | 'pending_issuance' | 'pending_deployment' | 'active' | 'expired' | 'deleted';

export interface CustomDomainValidationRecord {
  type: string;
  name: string;
  value: string;
  status?: string;
  txt_name?: string;
  txt_value?: string;
}

export interface CustomDomain {
  id: string;
  business_id: string;
  hostname: string;
  normalized_hostname: string;
  status: CustomDomainStatus;
  verification_status?: string;
  ssl_status?: string;
  cloudflare_hostname_id?: string;
  cloudflare_status?: string;
  cloudflare_ssl_status?: string;
  validation_records?: CustomDomainValidationRecord[];
  is_primary: boolean;
  verified_at?: string;
  last_checked_at?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface DnsInstructionRecord {
  type: 'CNAME' | 'TXT' | 'A';
  name: string;
  value: string;
  target?: string;
  description: string;
  status?: string;
}

export interface CustomDomainDetailsResponse {
  domain: CustomDomain;
  dnsInstructions: {
    cname: {
      type: string;
      name: string;
      target: string;
      description: string;
    };
    txtVerification?: {
      type: string;
      name: string;
      value: string;
      description: string;
    };
    records: DnsInstructionRecord[];
    isApex: boolean;
    apexGuidance?: string;
  };
}

export interface HostnameResolutionResult {
  resolved: boolean;
  status?: 'active' | 'pending' | 'suspended' | 'not_found' | 'error';
  hostname?: string;
  business?: Business;
  store?: Store;
  settings?: StoreSettings;
  categories?: Category[];
  products?: Product[];
  stories?: StoryHighlightGroup[];
  storefront?: PublicStorefrontBundle;
  message?: string;
}


