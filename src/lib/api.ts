import {
  Business,
  Category,
  Customer,
  Entitlements,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  PublicStorefrontBundle,
  PublicStorefrontData,
  Store,
  StoreSettings,
  SubscriptionPlan,
  StoryHighlightGroup,
  StoreReview,
  ReviewStats,
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('storefront_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

import { DEMO_STORES_MAP } from './demoStores';

async function safeParseJson<T = any>(res: Response, fallbackError = 'Request failed'): Promise<T> {
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;
  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const text = await res.text().catch(() => '');
    try {
      data = JSON.parse(text);
    } catch {
      const cleanMessage = text
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);
      data = { success: false, error: { message: cleanMessage || `${fallbackError} (${res.status})` } };
    }
  }

  if (!res.ok || (data && data.success === false)) {
    throw new Error(data?.error?.message || data?.message || `${fallbackError} (${res.status})`);
  }
  return data;
}

export const api = {
  // Authentication & Verification
  async checkEmailStatus(email?: string, userId?: string): Promise<{ isVerified: boolean; emailConfirmedAt?: string | null }> {
    try {
      const res = await fetch(`${API_BASE}/auth/check-email-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, userId })
      });
      const data = await safeParseJson(res, 'Email check failed');
      if (res.ok && data.success) {
        return { isVerified: Boolean(data.isVerified), emailConfirmedAt: data.emailConfirmedAt };
      }
    } catch (err) {
      console.warn('Backend check-email-status fetch failed:', err);
    }
    return { isVerified: false };
  },

  // Public Storefront
  async getStorefront(slug: string): Promise<PublicStorefrontData> {
    const cleanSlug = slug?.toLowerCase().trim();
    try {
      const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(slug)}`);
      const data = await safeParseJson(res, 'Store not found');
      if (res.ok && data.success && data.data) {
        return data.data;
      }
    } catch (err) {
      console.warn('Backend storefront fetch failed, checking demo stores:', err);
    }

    if (cleanSlug && DEMO_STORES_MAP[cleanSlug]) {
      return DEMO_STORES_MAP[cleanSlug];
    }

    throw new Error('Store not found');
  },

  async getPublicStore(slug: string): Promise<PublicStorefrontData> {
    return this.getStorefront(slug);
  },

  async getProductDetail(storeSlug: string, productSlug: string): Promise<{ business: Business; settings: StoreSettings; product: Product }> {
    const cleanStoreSlug = storeSlug?.toLowerCase().trim();
    try {
      const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(storeSlug)}/product/${encodeURIComponent(productSlug)}`);
      const data = await safeParseJson(res, 'Product not found');
      if (res.ok && data.success && data.data) {
        return data.data;
      }
    } catch (err) {
      console.warn('Backend product detail fetch failed, checking demo store:', err);
    }

    if (cleanStoreSlug && DEMO_STORES_MAP[cleanStoreSlug]) {
      const bundle = DEMO_STORES_MAP[cleanStoreSlug];
      const product = bundle.products.find(p => p.slug === productSlug);
      if (product) {
        return {
          business: bundle.business,
          settings: bundle.settings,
          product
        };
      }
    }

    throw new Error('Product not found');
  },

  async getPublicProduct(storeSlug: string, productSlug: string): Promise<{ business: Business; settings: StoreSettings; product: Product }> {
    return this.getProductDetail(storeSlug, productSlug);
  },

  // Storefront Reviews
  async getStoreReviews(slug: string, productId?: string): Promise<{ reviews: StoreReview[]; stats: ReviewStats }> {
    const url = productId 
      ? `${API_BASE}/storefront/${encodeURIComponent(slug)}/reviews?productId=${encodeURIComponent(productId)}`
      : `${API_BASE}/storefront/${encodeURIComponent(slug)}/reviews`;
    const res = await fetch(url);
    const data = await safeParseJson(res, 'Failed to load reviews');
    return data.data || { reviews: [], stats: { average_rating: 5, total_reviews: 0, verified_reviews_count: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } };
  },

  async submitStoreReview(slug: string, payload: {
    customer_name: string;
    customer_email?: string;
    customer_avatar?: string;
    location?: string;
    product_id?: string;
    product_name?: string;
    rating: number;
    comment: string;
    photos?: string[];
    order_number?: string;
    source?: 'storefront' | 'order_tracking' | 'merchant_manual';
  }): Promise<StoreReview> {
    const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(slug)}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to submit review');
    return data.data;
  },

  async voteReviewHelpful(slug: string, reviewId: string): Promise<{ helpful_votes: number }> {
    const res = await fetch(`${API_BASE}/storefront/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(reviewId)}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await safeParseJson(res, 'Failed to register vote');
    return data.data;
  },

  // Checkout & Orders
  async checkout(payload: {
    storeSlug: string;
    items: Array<{ productId: string; quantity: number }>;
    customer: { name: string; phone: string; email?: string; deliveryAddress: string; notes?: string };
    deliveryType?: 'flat' | 'pickup' | 'free';
    orderSource?: 'direct_checkout' | 'whatsapp';
  }): Promise<{ order: Order; paymentRequired: boolean }> {
    const res = await fetch(`${API_BASE}/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Checkout failed');
    return data.data;
  },

  async trackOrder(orderNumber: string): Promise<{ order: Order; business: any; settings: any }> {
    const res = await fetch(`${API_BASE}/orders/track/${encodeURIComponent(orderNumber)}`);
    const data = await safeParseJson(res, 'Order not found');
    return data.data;
  },

  // Payments
  async initializePayment(payload: {
    orderId: string;
    email: string;
    amountInKobo: number;
    callbackUrl?: string;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    const res = await fetch(`${API_BASE}/payments/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Payment initialization failed');
    return data.data;
  },

  async verifyPayment(reference: string): Promise<{ success: boolean; orderId?: string; message: string }> {
    const res = await fetch(`${API_BASE}/payments/verify/${encodeURIComponent(reference)}`);
    const data = await safeParseJson(res, 'Payment verification failed');
    return data.data;
  },

  // Subscription Plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    const res = await fetch(`${API_BASE}/plans`);
    const data = await safeParseJson(res, 'Failed to fetch plans');
    return data.data || [];
  },

  async getSubscriptionPlans(): Promise<{ plans: SubscriptionPlan[] }> {
    const plans = await this.getPlans();
    return { plans };
  },

  // Merchant Portal
  async getMerchantOverview(): Promise<any> {
    const res = await fetch(`${API_BASE}/merchant/overview`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load dashboard');
    return data.data;
  },

  async getMerchantBusiness(): Promise<{
    business: Business;
    store: Store;
    settings: StoreSettings;
    role: string;
    metrics?: any;
    recentOrders?: Order[];
  }> {
    const res = await fetch(`${API_BASE}/merchant/business`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load business');
    
    // Also attach metrics and recent orders if available from overview
    try {
      const overview = await this.getMerchantOverview();
      return {
        ...data.data,
        metrics: overview?.metrics || {
          todayRevenue: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          totalOrders: 0,
          totalProducts: 0
        },
        recentOrders: overview?.recentOrders || []
      };
    } catch {
      return {
        ...data.data,
        metrics: {
          todayRevenue: 0,
          totalRevenue: 0,
          pendingOrders: 0,
          totalOrders: 0,
          totalProducts: 0
        },
        recentOrders: []
      };
    }
  },

  async updateMerchantBusiness(payload: Partial<Business>): Promise<Business> {
    const res = await fetch(`${API_BASE}/merchant/business`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to update business');
    return data.data;
  },

  async onboardMerchant(payload: {
    businessName: string;
    slug: string;
    phone: string;
    whatsapp?: string;
    mode: 'catalogue' | 'checkout';
    state?: string;
    city?: string;
    address?: string;
    description?: string;
    referralCode?: string;
  }): Promise<{ business: Business; store: Store; settings: StoreSettings; subscription: any }> {
    const res = await fetch(`${API_BASE}/merchant/onboard`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to complete onboarding');
    return data.data;
  },

  async updateStoreSettings(payload: Partial<StoreSettings>): Promise<StoreSettings> {
    const res = await fetch(`${API_BASE}/merchant/store/settings`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to update store settings');
    return data.data;
  },

  async getMerchantStories(): Promise<StoryHighlightGroup[]> {
    const res = await fetch(`${API_BASE}/merchant/stories`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load stories');
    return data.data || [];
  },

  async updateMerchantStories(stories: StoryHighlightGroup[]): Promise<StoryHighlightGroup[]> {
    const res = await fetch(`${API_BASE}/merchant/stories`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify({ stories })
    });
    const data = await safeParseJson(res, 'Failed to save stories');
    return data.data || [];
  },

  async publishStore(status: 'published' | 'draft'): Promise<Store> {
    const res = await fetch(`${API_BASE}/merchant/store/publish`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ status })
    });
    const data = await safeParseJson(res, 'Failed to update publish state');
    return data.data;
  },

  async getMerchantProducts(): Promise<Product[] & { products: Product[] }> {
    const res = await fetch(`${API_BASE}/merchant/products`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load products');
    const list: any = data.data || [];
    list.products = list;
    return list;
  },

  async createProduct(payload: any): Promise<Product & { product: Product }> {
    const res = await fetch(`${API_BASE}/merchant/products`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to create product');
    const result: any = data.data;
    result.product = data.data;
    return result;
  },

  async updateProduct(id: string, payload: any): Promise<Product & { product: Product }> {
    const res = await fetch(`${API_BASE}/merchant/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to update product');
    const result: any = data.data;
    result.product = data.data;
    return result;
  },

  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/merchant/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    await safeParseJson(res, 'Failed to delete product');
  },

  async getMerchantCategories(): Promise<Category[] & { categories: Category[] }> {
    const res = await fetch(`${API_BASE}/merchant/categories`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load categories');
    const list: any = data.data || [];
    list.categories = list;
    return list;
  },

  async createCategory(payload: { name: string; description?: string }): Promise<Category> {
    const res = await fetch(`${API_BASE}/merchant/categories`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to create category');
    return data.data;
  },

  async getMerchantOrders(): Promise<Order[] & { orders: Order[] }> {
    const res = await fetch(`${API_BASE}/merchant/orders`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load orders');
    const list: any = data.data || [];
    list.orders = list;
    return list;
  },

  async updateOrderStatus(
    id: string,
    payload: string | { status?: string; payment_status?: string }
  ): Promise<Order & { order: Order }> {
    const body = typeof payload === 'string' ? { status: payload } : payload;
    const res = await fetch(`${API_BASE}/merchant/orders/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify(body)
    });
    const data = await safeParseJson(res, 'Failed to update order status');
    const result: any = data.data;
    result.order = data.data;
    return result;
  },

  async getMerchantCustomers(): Promise<Customer[] & { customers: Customer[] }> {
    const res = await fetch(`${API_BASE}/merchant/customers`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load customers');
    const list: any = data.data || [];
    list.customers = list;
    return list;
  },

  // Merchant Review Management
  async getMerchantReviews(): Promise<{ reviews: StoreReview[]; stats: ReviewStats }> {
    const res = await fetch(`${API_BASE}/merchant/reviews`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load reviews');
    return data.data || { reviews: [], stats: { average_rating: 5, total_reviews: 0, verified_reviews_count: 0, rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } } };
  },

  async createMerchantReview(payload: {
    customer_name: string;
    customer_email?: string;
    customer_avatar?: string;
    location?: string;
    product_id?: string;
    product_name?: string;
    rating: number;
    comment: string;
    photos?: string[];
    is_verified?: boolean;
    is_approved?: boolean;
    is_featured?: boolean;
    order_number?: string;
  }): Promise<StoreReview> {
    const res = await fetch(`${API_BASE}/merchant/reviews`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to create review');
    return data.data;
  },

  async updateMerchantReview(
    reviewId: string,
    updates: Partial<StoreReview>
  ): Promise<StoreReview> {
    const res = await fetch(`${API_BASE}/merchant/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify(updates)
    });
    const data = await safeParseJson(res, 'Failed to update review');
    return data.data;
  },

  async deleteMerchantReview(reviewId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/merchant/reviews/${encodeURIComponent(reviewId)}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    await safeParseJson(res, 'Failed to delete review');
  },

  async getMerchantSubscription(): Promise<{
    subscription: any;
    plan: SubscriptionPlan;
    entitlements: Entitlements;
    usage?: any;
  }> {
    const res = await fetch(`${API_BASE}/merchant/subscription`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load subscription');
    
    const subData = data.data;
    const plan = subData.plan;
    return {
      subscription: subData.subscription,
      plan: plan,
      entitlements: {
        max_products: plan?.max_products ?? 10,
        can_checkout: plan?.can_checkout ?? false,
        can_remove_branding: plan?.remove_branding ?? false,
        remove_branding: plan?.remove_branding ?? false,
        custom_domain_allowed: plan?.custom_domain ?? false,
        custom_domain: plan?.custom_domain ?? false,
        advanced_analytics: plan?.advanced_analytics ?? false,
      },
      usage: subData.usage
    };
  },

  async initializeSubscriptionPayment(params: { planId: string; callbackUrl?: string }): Promise<{ authorization_url: string; access_code: string; reference: string; free_activated?: boolean }> {
    const res = await fetch(`${API_BASE}/merchant/subscription/initialize`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(params)
    });
    const data = await safeParseJson(res, 'Failed to initialize subscription payment');
    return data.data;
  },

  async upgradeSubscription(planId: string): Promise<{ success: boolean; subscription: any; plan: SubscriptionPlan; message: string }> {
    const res = await fetch(`${API_BASE}/merchant/subscription/upgrade`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ planId })
    });
    const data = await safeParseJson(res, 'Failed to upgrade subscription');
    return data.data;
  },

  // Platform Admin
  async getAdminMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/metrics`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load admin metrics');
    return data.data;
  },

  async getAdminBusinesses(): Promise<any[] & { metrics: any; businesses: any[] }> {
    const [bizRes, metricsRes] = await Promise.all([
      fetch(`${API_BASE}/admin/businesses`, { headers: getAuthHeader() }),
      fetch(`${API_BASE}/admin/metrics`, { headers: getAuthHeader() })
    ]);
    const bizData = await safeParseJson(bizRes, 'Failed to load businesses');
    const metricsData = await safeParseJson(metricsRes, 'Failed to load metrics');

    const businesses = bizData.data || [];
    const metrics = metricsData.data || {
      totalBusinesses: businesses.length,
      activeStores: businesses.filter((b: any) => b.status === 'active').length,
      totalOrders: 0,
      gmvTotal: 0
    };

    const result: any = businesses;
    result.businesses = businesses;
    result.metrics = metrics;
    return result;
  },

  async setBusinessStatus(id: string, status: 'active' | 'suspended'): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/businesses/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status })
    });
    const data = await safeParseJson(res, 'Failed to update status');
    return data.data;
  },

  async updateBusinessStatus(id: string, status: 'active' | 'suspended'): Promise<any> {
    return this.setBusinessStatus(id, status);
  },

  // ==========================================
  // AFFILIATE PROGRAM API
  // ==========================================

  async getAffiliateDashboard(): Promise<import('../types').AffiliateDashboardStats> {
    const res = await fetch(`${API_BASE}/affiliate/dashboard`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load affiliate dashboard');
    return data.data;
  },

  async updateAffiliatePayoutDetails(payoutDetails: import('../types').AffiliatePayoutDetails): Promise<import('../types').Affiliate> {
    const res = await fetch(`${API_BASE}/affiliate/payout-details`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payoutDetails)
    });
    const data = await safeParseJson(res, 'Failed to update payout details');
    return data.data;
  },

  async getAffiliateNotifications(): Promise<import('../types').AppNotification[]> {
    const res = await fetch(`${API_BASE}/affiliate/notifications`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load notifications');
    return data.data || [];
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`${API_BASE}/affiliate/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeader()
    });
  },

  async markAllNotificationsRead(): Promise<void> {
    await fetch(`${API_BASE}/affiliate/notifications/mark-all-read`, {
      method: 'POST',
      headers: getAuthHeader()
    });
  },

  // Admin Affiliate Management
  async getAdminAffiliates(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/affiliates`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load affiliates');
    return data.data || [];
  },

  async getAdminReferrals(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/referrals`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load referrals');
    return data.data || [];
  },

  async getAdminCommissions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/commissions`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load commissions');
    return data.data || [];
  },

  async getAdminPayouts(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/payouts`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to load payouts');
    return data.data || [];
  },

  async updateAdminAffiliateStatus(affiliateId: string, status: 'active' | 'suspended'): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/affiliates/${affiliateId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ status })
    });
    const data = await safeParseJson(res, 'Failed to update affiliate status');
    return data.data;
  },

  async flagAdminReferralFraud(referralId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/referrals/${referralId}/fraud`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ reason })
    });
    const data = await safeParseJson(res, 'Failed to flag referral');
    return data.data;
  },

  async cancelAdminCommission(commissionId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/commissions/${commissionId}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ reason })
    });
    const data = await safeParseJson(res, 'Failed to cancel commission');
    return data.data;
  },

  async processAdminPayout(payload: {
    affiliateId: string;
    paymentReference: string;
    commissionIds: string[];
    notes?: string;
  }): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/payouts/process`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to record payout');
    return data.data;
  },

  async getPlatformSettings(): Promise<{ show_affiliate_button: boolean; affiliate_program_enabled: boolean; maintenance_mode?: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/platform/settings`);
      const data = await safeParseJson(res, 'Failed to load platform settings');
      return data.data || { show_affiliate_button: true, affiliate_program_enabled: true };
    } catch {
      return { show_affiliate_button: true, affiliate_program_enabled: true };
    }
  },

  async getAdminPlatformSettings(): Promise<{ show_affiliate_button: boolean; affiliate_program_enabled: boolean; maintenance_mode?: boolean }> {
    const res = await fetch(`${API_BASE}/admin/platform/settings`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to fetch platform settings');
    return data.data;
  },

  async updateAdminPlatformSettings(payload: Partial<{ show_affiliate_button: boolean; affiliate_program_enabled: boolean; maintenance_mode?: boolean }>): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/platform/settings`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(payload)
    });
    const data = await safeParseJson(res, 'Failed to update platform settings');
    return data.data;
  },

  async getAdminPlans(): Promise<SubscriptionPlan[]> {
    const res = await fetch(`${API_BASE}/admin/plans`, { headers: getAuthHeader() });
    const data = await safeParseJson(res, 'Failed to fetch subscription plans');
    return data.data || [];
  },

  async updateAdminPlanStatus(planId: string, isActive: boolean): Promise<SubscriptionPlan> {
    const res = await fetch(`${API_BASE}/admin/plans/${planId}/status`, {
      method: 'PATCH',
      headers: getAuthHeader(),
      body: JSON.stringify({ is_active: isActive })
    });
    const data = await safeParseJson(res, 'Failed to update plan status');
    return data.data;
  },

  async updateAdminPlan(planId: string, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
    const res = await fetch(`${API_BASE}/admin/plans/${planId}`, {
      method: 'PUT',
      headers: getAuthHeader(),
      body: JSON.stringify(updates)
    });
    const data = await safeParseJson(res, 'Failed to update plan');
    return data.data;
  },

  // Cloudflare R2 Bucket Storage Media Methods
  async uploadMedia(
    file: File | Blob,
    options?: { folder?: string; businessId?: string; filename?: string }
  ): Promise<{ url: string; key: string; filename: string; mimetype: string; size: number; storage: string }> {
    const filename = options?.filename || (file instanceof File ? file.name : `upload_${Date.now()}.jpg`);
    const token = localStorage.getItem('storefront_auth_token') || 'demo-merchant-token';

    // 1. Try multipart FormData upload
    try {
      const formData = new FormData();
      formData.append('file', file, filename);
      if (options?.folder) formData.append('folder', options.folder);
      if (options?.businessId) formData.append('businessId', options.businessId);

      const res = await fetch(`${API_BASE}/media/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await safeParseJson(res, 'Failed to upload media to Cloudflare R2');
      if (data && data.success && data.data?.url) {
        return data.data;
      }
    } catch (formErr) {
      console.warn('Multipart upload failed, attempting base64 fallback:', formErr);
    }

    // 2. Base64 fallback if multipart upload fails
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      return await this.uploadBase64(base64Data, {
        folder: options?.folder || 'branding',
        businessId: options?.businessId,
        filename
      });
    } catch (b64Err) {
      console.warn('Base64 R2 upload fallback failed:', b64Err);
      // 3. Ultimate resilient fallback: return data URL
      const fallbackDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });

      if (fallbackDataUrl) {
        return {
          url: fallbackDataUrl,
          key: `${options?.folder || 'branding'}/${filename}`,
          filename,
          mimetype: file.type || 'image/jpeg',
          size: file.size,
          storage: 'inline-data-url'
        };
      }

      throw new Error('Failed to upload media. Please try another image.');
    }
  },

  async uploadBase64(
    base64Data: string,
    options?: { folder?: string; businessId?: string; filename?: string }
  ): Promise<{ url: string; key: string; filename: string; mimetype: string; size: number; storage: string }> {
    const token = localStorage.getItem('storefront_auth_token') || 'demo-merchant-token';
    const res = await fetch(`${API_BASE}/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dataUrl: base64Data,
        folder: options?.folder || 'uploads',
        businessId: options?.businessId || 'general',
        filename: options?.filename
      })
    });

    const data = await safeParseJson(res, 'Failed to upload media');
    return data.data;
  },

  async getR2StorageStatus(): Promise<{
    provider: string;
    isConfigured: boolean;
    bucketName: string;
    publicDomain: string;
    endpoint: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/media/status`);
      const data = await safeParseJson(res, 'Failed to fetch storage status');
      return data.data;
    } catch {
      return {
        provider: 'Cloudflare R2 Bucket Storage',
        isConfigured: false,
        bucketName: 'Not configured',
        publicDomain: 'Proxy via /api/media/*',
        endpoint: 'Not configured'
      };
    }
  }
};
