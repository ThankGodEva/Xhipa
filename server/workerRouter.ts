import { storeService } from './services/store.service';
import { reviewRepository } from './repositories/review.repository';
import { orderRepository } from './repositories/order.repository';
import { merchantRepository } from './repositories/merchant.repository';
import { productRepository } from './repositories/product.repository';
import { storyRepository } from './repositories/story.repository';
import { subscriptionRepository, DEFAULT_SUBSCRIPTION_PLANS } from './repositories/subscription.repository';
import { adminRepository } from './repositories/admin.repository';
import { affiliateRepository } from './repositories/affiliate.repository';
import { orderService } from './services/order.service';
import { paymentService } from './services/payment.service';
import { entitlementService } from './services/entitlement.service';
import { affiliateService } from './services/affiliate.service';
import { notificationService } from './services/notification.service';
import { normalizeMediaUrl } from './services/r2Storage.service';
import { authenticateWorkerRequest } from './workerAuth';
import { getRequiredSupabase, getSupabaseAdmin, isSupabaseConfigured } from './lib/supabase';
import { slugify } from '../src/lib/utils';
import { Category, Product, StoreSettings } from '../src/types';

function json(body: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, cf-connecting-ip',
      ...headers
    }
  });
}

// In-memory OTP storage for password resets (with 10-minute expiration)
const resetOtpStore = new Map<string, { otp: string; expiresAt: number; token: string }>();
const DEMO_EMAILS = ['merchant@chibeauty.ng', 'admin@platform.ng', 'merchant@example.com'];

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

async function getOrCreateUserBusiness(user: any) {
  let membership = await merchantRepository.getMembershipByUserId(user.id);
  if (!membership) {
    const created = await merchantRepository.createBusinessForUser({
      id: user.id,
      email: user.email,
      fullName: user.full_name
    });
    return {
      membership: created.membership,
      business: created.business,
      store: created.store,
      settings: created.settings
    };
  }

  const business = await merchantRepository.getBusinessById(membership.business_id);
  const store = await merchantRepository.getStoreByBusinessId(membership.business_id);
  const settings = await merchantRepository.getStoreSettings(membership.business_id);

  return {
    membership,
    business: business!,
    store: store!,
    settings: settings!
  };
}

export async function handleWorkerApiRoute(request: Request, url: URL): Promise<Response | null> {
  const method = request.method.toUpperCase();
  const path = url.pathname;

  // -------------------------------------------------------------
  // 1. PUBLIC STOREFRONT ROUTES
  // -------------------------------------------------------------

  // GET /api/storefront/check-slug/:slug
  if (path.startsWith('/api/storefront/check-slug/') && method === 'GET') {
    const slug = path.replace('/api/storefront/check-slug/', '');
    try {
      const result = await merchantRepository.checkSlugAvailability(slug);
      return json({ success: true, data: result });
    } catch (err: any) {
      return json({ success: false, error: { code: 'SLUG_CHECK_FAILED', message: err.message || 'Failed to check link availability.' } }, 500);
    }
  }

  // GET /api/storefront/:slug/product/:productSlug
  const productMatch = path.match(/^\/api\/storefront\/([^\/]+)\/product\/([^\/]+)$/);
  if (productMatch && method === 'GET') {
    const [, slug, productSlug] = productMatch;
    try {
      const bundle = await storeService.getPublicStorefront(slug);
      if (!bundle) {
        return json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'This store is currently unavailable.' } }, 404);
      }
      const product = bundle.products.find(p => p.slug === productSlug);
      if (!product) {
        return json({ success: false, error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found in this storefront.' } }, 404);
      }
      return json({
        success: true,
        data: {
          business: bundle.business,
          settings: bundle.settings,
          product
        }
      });
    } catch (err: any) {
      return json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to load product.' } }, 500);
    }
  }

  // POST /api/storefront/:slug/reviews/:id/vote
  const reviewVoteMatch = path.match(/^\/api\/storefront\/([^\/]+)\/reviews\/([^\/]+)\/vote$/);
  if (reviewVoteMatch && method === 'POST') {
    const [, , id] = reviewVoteMatch;
    try {
      const helpfulVotes = await reviewRepository.upvoteHelpful(id);
      return json({ success: true, data: { helpful_votes: helpfulVotes } });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to record vote.' } }, 500);
    }
  }

  // GET /api/storefront/:slug/reviews
  const reviewsGetMatch = path.match(/^\/api\/storefront\/([^\/]+)\/reviews$/);
  if (reviewsGetMatch && method === 'GET') {
    const [, slug] = reviewsGetMatch;
    try {
      const productId = url.searchParams.get('productId') || undefined;
      const bundle = await storeService.getPublicStorefront(slug);
      if (!bundle) {
        return json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found.' } }, 404);
      }
      const reviews = await reviewRepository.getApprovedReviews(bundle.business.id, productId);
      const stats = reviewRepository.calculateStats(reviews);
      return json({ success: true, data: { reviews, stats } });
    } catch (err: any) {
      return json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to load reviews.' } }, 500);
    }
  }

  // POST /api/storefront/:slug/reviews
  if (reviewsGetMatch && method === 'POST') {
    const [, slug] = reviewsGetMatch;
    try {
      const body = (await request.json()) as any;
      const {
        customer_name,
        customer_email,
        customer_avatar,
        location,
        product_id,
        product_name,
        rating,
        comment,
        photos,
        order_number,
        source
      } = body;

      if (!customer_name || !customer_name.trim()) {
        return json({ success: false, error: { message: 'Please provide your name.' } }, 400);
      }
      if (!comment || !comment.trim()) {
        return json({ success: false, error: { message: 'Please write your review feedback.' } }, 400);
      }
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        return json({ success: false, error: { message: 'Rating must be between 1 and 5 stars.' } }, 400);
      }

      const bundle = await storeService.getPublicStorefront(slug);
      if (!bundle) {
        return json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'Store not found.' } }, 404);
      }

      let isVerified = false;
      if (order_number) {
        try {
          const order = await orderRepository.getOrderByNumber(order_number.trim());
          if (order && order.business_id === bundle.business.id) {
            isVerified = true;
          }
        } catch {
          isVerified = true;
        }
      }

      let resolvedProductName = product_name;
      if (product_id && !resolvedProductName) {
        const match = bundle.products.find(p => p.id === product_id);
        if (match) resolvedProductName = match.name;
      }

      const newReview = await reviewRepository.createReview({
        business_id: bundle.business.id,
        product_id: product_id || undefined,
        product_name: resolvedProductName || undefined,
        customer_name: customer_name.trim(),
        customer_email: customer_email?.trim() || undefined,
        customer_avatar: customer_avatar || undefined,
        location: location?.trim() || undefined,
        rating: numRating,
        comment: comment.trim(),
        photos: Array.isArray(photos) ? photos : [],
        is_verified: isVerified || Boolean(order_number),
        is_approved: true,
        source: source || 'storefront',
        order_number: order_number?.trim() || undefined
      });

      return json({ success: true, data: newReview }, 201);
    } catch (err: any) {
      return json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to submit review.' } }, 500);
    }
  }

  // GET /api/storefront/:slug
  const storefrontMatch = path.match(/^\/api\/storefront\/([^\/]+)$/);
  if (storefrontMatch && method === 'GET') {
    const slug = decodeURIComponent(storefrontMatch[1]);
    try {
      const bundle = await storeService.getPublicStorefront(slug);
      if (!bundle) {
        return json({ success: false, error: { code: 'STORE_NOT_FOUND', message: 'This store is currently unavailable or does not exist.' } }, 404);
      }
      return json({ success: true, data: bundle });
    } catch (err: any) {
      console.error(`[WorkerRouter] Error loading storefront for "${slug}":`, err);
      return json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to load storefront.' } }, 500);
    }
  }

  // -------------------------------------------------------------
  // 2. ORDER ROUTES
  // -------------------------------------------------------------

  // POST /api/orders/checkout
  if (path === '/api/orders/checkout' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const { storeSlug, items, customer, deliveryType, orderSource } = body;
      if (!storeSlug || !items || !customer || !customer.name || !customer.phone || !customer.deliveryAddress) {
        return json({
          success: false,
          error: { code: 'INVALID_INPUT', message: 'Please provide all required checkout fields (name, phone, delivery address, and items).' }
        }, 400);
      }

      const result = await orderService.createCheckoutOrder({
        storeSlug,
        items,
        customer,
        deliveryType,
        orderSource
      });

      return json({ success: true, data: result }, 201);
    } catch (err: any) {
      return json({ success: false, error: { code: 'CHECKOUT_FAILED', message: err.message || 'Failed to place order.' } }, 400);
    }
  }

  // GET /api/orders/track/:orderNumber
  if (path.startsWith('/api/orders/track/') && method === 'GET') {
    const orderNumber = path.replace('/api/orders/track/', '');
    try {
      const order = await orderRepository.getOrderByNumber(orderNumber);
      if (!order) {
        return json({ success: false, error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' } }, 404);
      }

      const [business, settings] = await Promise.all([
        merchantRepository.getBusinessById(order.business_id),
        merchantRepository.getStoreSettings(order.business_id)
      ]);

      return json({
        success: true,
        data: {
          order,
          business: business ? {
            name: business.name,
            phone: business.phone,
            whatsapp_number: business.whatsapp_number,
            currency: business.currency
          } : null,
          settings: settings ? {
            primary_color: settings.primary_color
          } : null
        }
      });
    } catch (err: any) {
      return json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message || 'Failed to track order.' } }, 500);
    }
  }

  // -------------------------------------------------------------
  // 3. PAYMENT ROUTES
  // -------------------------------------------------------------

  // POST /api/payments/initialize
  if (path === '/api/payments/initialize' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const { orderId, email, amountInKobo, callbackUrl, metadata } = body;
      if (!orderId) {
        return json({ success: false, error: { code: 'INVALID_REQUEST', message: 'orderId is required.' } }, 400);
      }

      const result = await paymentService.initializePayment({
        orderId,
        email: email || 'customer@xhipa.com',
        amountInKobo,
        callbackUrl: callbackUrl || `${url.origin}/payment/callback`,
        metadata
      });

      return json({ success: true, data: result });
    } catch (err: any) {
      return json({ success: false, error: { code: 'PAYMENT_INIT_FAILED', message: err.message || 'Payment initialization failed.' } }, 400);
    }
  }

  // GET /api/payments/verify/:reference
  if (path.startsWith('/api/payments/verify/') && method === 'GET') {
    const reference = path.replace('/api/payments/verify/', '');
    try {
      if (!reference) {
        return json({ success: false, error: { code: 'REFERENCE_REQUIRED', message: 'Payment reference is required.' } }, 400);
      }
      const result = await paymentService.verifyPayment(reference);
      return json({ success: result.success, data: result });
    } catch (err: any) {
      return json({ success: false, error: { code: 'VERIFICATION_FAILED', message: err.message || 'Verification failed.' } }, 400);
    }
  }

  // -------------------------------------------------------------
  // 4. PLANS & PLATFORM SETTINGS
  // -------------------------------------------------------------

  // GET /api/plans
  if (path === '/api/plans' && method === 'GET') {
    try {
      const plans = await subscriptionRepository.getPlans();
      return json({ success: true, data: plans });
    } catch (err: any) {
      console.warn('[WorkerRouter] Failed to retrieve plans from DB, serving defaults:', err);
      return json({ success: true, data: DEFAULT_SUBSCRIPTION_PLANS });
    }
  }

  // GET /api/platform/settings
  if (path === '/api/platform/settings' && method === 'GET') {
    try {
      const settings = await adminRepository.getPlatformSettings();
      return json({ success: true, data: settings });
    } catch (err: any) {
      console.warn('[WorkerRouter] Failed to retrieve platform settings from DB, serving defaults:', err);
      return json({
        success: true,
        data: {
          platform_name: 'Xhipa Storefront SaaS',
          support_email: 'support@xhipa.ng',
          maintenance_mode: false,
          show_affiliate_button: true,
          affiliate_program_enabled: true
        }
      });
    }
  }

  // -------------------------------------------------------------
  // 5. AUTH ROUTES
  // -------------------------------------------------------------

  // GET /api/auth/me
  if (path === '/api/auth/me' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    return json({ success: true, user: auth.authContext.user });
  }

  // POST /api/auth/check-email-exists
  if (path === '/api/auth/check-email-exists' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const cleanEmail = (body.email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return json({ success: false, error: { message: 'Email address is required' } }, 400);
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return json({ success: true, exists: false, valid: false });
      }

      if (DEMO_EMAILS.includes(cleanEmail)) {
        return json({
          success: true,
          exists: true,
          message: 'This email address is already registered. Please sign in instead.'
        });
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, email')
              .ilike('email', cleanEmail)
              .maybeSingle();

            if (profile) {
              return json({
                success: true,
                exists: true,
                message: 'This email address is already registered. Please sign in instead.'
              });
            }

            if (supabase.auth?.admin) {
              const { data: usersData } = await supabase.auth.admin.listUsers();
              if (usersData?.users) {
                const match = usersData.users.find((u: any) => u.email?.toLowerCase() === cleanEmail);
                if (match) {
                  return json({
                    success: true,
                    exists: true,
                    message: 'This email address is already registered. Please sign in instead.'
                  });
                }
              }
            }
          } catch (err) {
            console.warn('[Worker Auth] Check email exists error:', err);
          }
        }
      }

      return json({ success: true, exists: false });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to check email' } }, 500);
    }
  }

  // POST /api/auth/forgot-password
  if (path === '/api/auth/forgot-password' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const cleanEmail = (body.email || '').trim().toLowerCase();
      if (!cleanEmail) {
        return json({ success: false, error: { message: 'Email address is required' } }, 400);
      }

      let sentViaSupabase = false;
      let devOtp: string | undefined = undefined;

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
            if (!error) {
              sentViaSupabase = true;
            }
          } catch (err) {
            console.warn('[Worker Auth] Supabase reset error:', err);
          }
        }
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      resetOtpStore.set(cleanEmail, {
        otp: generatedOtp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        token: resetToken
      });

      if (!sentViaSupabase) {
        devOtp = generatedOtp;
      }

      return json({
        success: true,
        sentViaSupabase,
        devOtp,
        message: 'Password reset OTP has been sent. Please check your email inbox.'
      });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to send OTP' } }, 500);
    }
  }

  // POST /api/auth/verify-reset-otp
  if (path === '/api/auth/verify-reset-otp' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const cleanEmail = (body.email || '').trim().toLowerCase();
      const cleanOtp = (body.otp || '').trim();
      if (!cleanEmail || !cleanOtp) {
        return json({ success: false, error: { message: 'Email and OTP code are required' } }, 400);
      }

      const stored = resetOtpStore.get(cleanEmail);
      if (stored && stored.otp === cleanOtp && Date.now() < stored.expiresAt) {
        return json({
          success: true,
          verified: true,
          resetToken: stored.token
        });
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        if (supabase) {
          try {
            const { data, error } = await supabase.auth.verifyOtp({
              email: cleanEmail,
              token: cleanOtp,
              type: 'recovery'
            });
            if (!error && data?.user) {
              const resetToken = `rst_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
              resetOtpStore.set(cleanEmail, {
                otp: cleanOtp,
                expiresAt: Date.now() + 15 * 60 * 1000,
                token: resetToken
              });
              return json({ success: true, verified: true, resetToken });
            }
          } catch (err) {
            console.warn('[Worker Auth] Supabase verifyOtp error:', err);
          }
        }
      }

      return json({ success: false, error: { message: 'Invalid or expired OTP code. Please check the code and try again.' } }, 400);
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to verify OTP' } }, 500);
    }
  }

  // POST /api/auth/reset-password
  if (path === '/api/auth/reset-password' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const { email, newPassword, resetToken, otp } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !newPassword) {
        return json({ success: false, error: { message: 'Email and new password are required' } }, 400);
      }
      if (newPassword.length < 6) {
        return json({ success: false, error: { message: 'Password must be at least 6 characters' } }, 400);
      }

      const stored = resetOtpStore.get(cleanEmail);
      const isValidStored = stored && (stored.token === resetToken || stored.otp === otp) && Date.now() < stored.expiresAt;
      if (!isValidStored && !resetToken) {
        return json({ success: false, error: { message: 'Invalid or expired password reset session. Please request a new OTP.' } }, 400);
      }

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseAdmin();
        if (supabase && supabase.auth?.admin) {
          try {
            const { data: usersData } = await supabase.auth.admin.listUsers();
            const user = usersData?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (user) {
              await supabase.auth.admin.updateUserById(user.id, { password: newPassword });
            }
          } catch (err) {
            console.warn('[Worker Auth] Supabase reset-password error:', err);
          }
        }
      }

      resetOtpStore.delete(cleanEmail);
      return json({
        success: true,
        message: 'Your password has been reset successfully. You can now sign in with your new password.'
      });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to reset password' } }, 500);
    }
  }

  // POST /api/auth/check-email-status
  if (path === '/api/auth/check-email-status' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const { email, userId } = body;
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail && !userId) {
        return json({ success: false, error: { message: 'email or userId is required' } }, 400);
      }

      if (!isSupabaseConfigured()) {
        return json({ success: true, isVerified: false });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return json({ success: true, isVerified: false });
      }

      let isVerified = false;
      let emailConfirmedAt: string | null = null;
      let resolvedUserId = userId;

      if (userId && isUUID(userId) && supabase.auth?.admin) {
        try {
          const { data, error } = await supabase.auth.admin.getUserById(userId);
          if (!error && data?.user) {
            isVerified = Boolean(data.user.email_confirmed_at || (data.user as any).confirmed_at);
            emailConfirmedAt = data.user.email_confirmed_at || null;
          }
        } catch {
          // continue
        }
      }

      if (!isVerified && cleanEmail && supabase.auth?.admin) {
        try {
          const { data, error } = await supabase.auth.admin.listUsers();
          if (!error && data?.users) {
            const match = (data.users as any[]).find((u: any) => u.email?.toLowerCase() === cleanEmail);
            if (match) {
              resolvedUserId = match.id;
              isVerified = Boolean(match.email_confirmed_at || match.confirmed_at);
              emailConfirmedAt = match.email_confirmed_at || null;
            }
          }
        } catch {
          // continue
        }
      }

      if (!isVerified) {
        try {
          let query = supabase.from('profiles').select('*');
          if (resolvedUserId && isUUID(resolvedUserId)) {
            query = query.eq('id', resolvedUserId);
          } else if (cleanEmail) {
            query = query.ilike('email', cleanEmail);
          }
          const { data: profile } = await query.maybeSingle();
          if (profile?.email_confirmed_at || profile?.is_email_verified) {
            isVerified = true;
            emailConfirmedAt = profile.email_confirmed_at || new Date().toISOString();
          }
        } catch {
          // continue
        }
      }

      if (isVerified && (resolvedUserId && isUUID(resolvedUserId))) {
        try {
          await supabase
            .from('profiles')
            .update({
              is_email_verified: true,
              email_confirmed_at: emailConfirmedAt || new Date().toISOString()
            })
            .eq('id', resolvedUserId);
        } catch {
          // silent
        }
      }

      return json({ success: true, isVerified, emailConfirmedAt });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to check email status' } }, 500);
    }
  }

  // -------------------------------------------------------------
  // 6. MERCHANT SUBSCRIPTION & OVERVIEW ROUTES
  // -------------------------------------------------------------

  // GET /api/merchant/subscription
  if (path === '/api/merchant/subscription' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const membership = await merchantRepository.getMembershipByUserId(auth.authContext.user.id);
      if (!membership) {
        return json({ success: false, error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' } }, 404);
      }
      const businessId = membership.business_id;
      const [subscription, plan, productLimit, canCheckout, removeBranding, customDomain, advancedAnalytics] = await Promise.all([
        subscriptionRepository.getSubscriptionByBusinessId(businessId),
        entitlementService.getBusinessPlanAsync(businessId),
        entitlementService.canAddProductAsync(businessId),
        entitlementService.canAsync(businessId, 'can_checkout'),
        entitlementService.canAsync(businessId, 'remove_branding'),
        entitlementService.canAsync(businessId, 'custom_domain'),
        entitlementService.canAsync(businessId, 'advanced_analytics')
      ]);

      return json({
        success: true,
        data: {
          subscription: subscription || {
            business_id: businessId,
            plan_id: 'free',
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          plan,
          usage: {
            productCount: productLimit.currentCount,
            maxProducts: productLimit.maxAllowed,
            canCheckout,
            removeBranding,
            customDomain,
            advancedAnalytics
          }
        }
      });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to retrieve subscription.' } }, 500);
    }
  }

  // POST /api/merchant/subscription/initialize
  if (path === '/api/merchant/subscription/initialize' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { planId, callbackUrl } = body;
      if (!planId) {
        return json({ success: false, error: { code: 'PLAN_REQUIRED', message: 'Subscription plan ID is required.' } }, 400);
      }

      const targetPlan = await subscriptionRepository.getPlanById(planId);
      if (!targetPlan) {
        return json({ success: false, error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan ID.' } }, 400);
      }
      if (targetPlan.is_active === false) {
        return json({ success: false, error: { code: 'PLAN_UNAVAILABLE', message: `The ${targetPlan.name} is currently not available for new subscriptions.` } }, 400);
      }

      const membership = await merchantRepository.getMembershipByUserId(auth.authContext.user.id);
      if (!membership) {
        return json({ success: false, error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' } }, 404);
      }

      const businessId = membership.business_id;
      if (targetPlan.id === 'free' || targetPlan.price_monthly === 0) {
        const sub = await subscriptionRepository.upsertSubscription({
          businessId,
          planId: 'free',
          status: 'active'
        });
        return json({
          success: true,
          data: {
            free_activated: true,
            subscription: sub,
            plan: targetPlan,
            message: 'Free tier activated.'
          }
        });
      }

      const resolvedCallbackUrl = callbackUrl || `${url.origin}/dashboard/subscription`;
      const userEmail = auth.authContext.user.email || 'merchant@xhipa.com';

      const result = await paymentService.initializeSubscriptionPayment({
        businessId,
        userId: auth.authContext.user.id,
        email: userEmail,
        planId: targetPlan.id,
        callbackUrl: resolvedCallbackUrl
      });

      return json({ success: true, data: result });
    } catch (err: any) {
      return json({ success: false, error: { code: 'SUBSCRIPTION_INIT_FAILED', message: err.message || 'Failed to initialize subscription payment.' } }, 400);
    }
  }

  // POST /api/merchant/subscription/upgrade
  if (path === '/api/merchant/subscription/upgrade' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { planId } = body;
      const targetPlan = await subscriptionRepository.getPlanById(planId);
      if (!planId || !targetPlan) {
        return json({ success: false, error: { code: 'INVALID_PLAN', message: 'Invalid subscription plan ID.' } }, 400);
      }

      if (targetPlan.is_active === false) {
        return json({ success: false, error: { code: 'PLAN_UNAVAILABLE', message: `The ${targetPlan.name} is currently not available for new subscriptions.` } }, 400);
      }

      const membership = await merchantRepository.getMembershipByUserId(auth.authContext.user.id);
      if (!membership) {
        return json({ success: false, error: { code: 'BUSINESS_NOT_FOUND', message: 'No business found for this account.' } }, 404);
      }

      const businessId = membership.business_id;
      if (targetPlan.id === 'free' || targetPlan.price_monthly === 0) {
        const sub = await subscriptionRepository.upsertSubscription({
          businessId,
          planId: 'free',
          status: 'active'
        });
        return json({
          success: true,
          data: {
            subscription: sub,
            plan: targetPlan,
            message: 'Free tier activated.'
          }
        });
      }

      return json({
        success: false,
        error: {
          code: 'PAYMENT_REQUIRED',
          message: 'Paid subscription plans require payment verification before activation. Please initialize payment.'
        }
      }, 402);
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Upgrade failed.' } }, 500);
    }
  }

  // GET /api/merchant/overview
  if (path === '/api/merchant/overview' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership, business, store, settings } = await getOrCreateUserBusiness(auth.authContext.user);
      if (business) {
        if (business.logo_url) business.logo_url = normalizeMediaUrl(business.logo_url);
        if (business.banner_url) business.banner_url = normalizeMediaUrl(business.banner_url);
      }
      if (settings && settings.banner_url) {
        settings.banner_url = normalizeMediaUrl(settings.banner_url);
      }
      const businessId = membership.business_id;
      const plan = await entitlementService.getBusinessPlanAsync(businessId);

      const [orders, products, customers] = await Promise.all([
        orderRepository.getOrdersByBusinessId(businessId),
        productRepository.getProducts(businessId),
        orderRepository.getCustomersByBusinessId(businessId)
      ]);

      const activeProducts = products.filter(p => p.status !== 'archived');
      const totalSales = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0);
      const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

      return json({
        success: true,
        data: {
          business,
          store,
          settings,
          plan,
          stats: {
            totalSales,
            totalOrders: orders.length,
            pendingOrders,
            totalProducts: activeProducts.length,
            totalCustomers: customers.length
          },
          recentOrders: orders.slice(0, 5)
        }
      });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load overview.' } }, 500);
    }
  }

  // GET /api/merchant/business
  if (path === '/api/merchant/business' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { business, store, settings, membership } = await getOrCreateUserBusiness(auth.authContext.user);
      if (business) {
        if (business.logo_url) business.logo_url = normalizeMediaUrl(business.logo_url);
        if (business.banner_url) business.banner_url = normalizeMediaUrl(business.banner_url);
      }
      if (settings && settings.banner_url) {
        settings.banner_url = normalizeMediaUrl(settings.banner_url);
      }
      return json({
        success: true,
        data: { business, store, settings, membership }
      });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load business profile.' } }, 500);
    }
  }

  // PUT /api/merchant/business
  if (path === '/api/merchant/business' && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const businessId = membership.business_id;

      const updated = await merchantRepository.updateBusiness(businessId, {
        name: body.name,
        currency: body.currency,
        phone: body.phone,
        whatsapp_number: body.whatsapp_number,
        email: body.email,
        logo_url: body.logo_url,
        banner_url: body.banner_url
      });

      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update business.' } }, 500);
    }
  }

  // POST /api/merchant/onboard
  if (path === '/api/merchant/onboard' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const result = await merchantRepository.onboardMerchant({
        userId: auth.authContext.user.id,
        fullName: body.fullName || auth.authContext.user.full_name || 'Store Owner',
        email: body.email || auth.authContext.user.email,
        businessName: body.businessName,
        slug: body.slug,
        phone: body.phone,
        whatsapp: body.whatsappNumber || body.whatsapp,
        mode: body.mode,
        state: body.state,
        city: body.city,
        address: body.address,
        description: body.description
      });

      if (body.referralCode) {
        affiliateService.attributeReferralOnSignup({
          referralCode: body.referralCode,
          referredUserId: auth.authContext.user.id,
          businessId: result.business.id,
          userEmail: auth.authContext.user.email
        }).catch(err => console.error('[Affiliate Worker] Record signup error:', err));
      }

      return json({ success: true, data: result });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Onboarding failed.' } }, 500);
    }
  }

  // PUT /api/merchant/store/settings
  if (path === '/api/merchant/store/settings' && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const businessId = membership.business_id;

      const canCheckoutAllowed = await entitlementService.canAsync(businessId, 'can_checkout');

      const sanitized: Partial<StoreSettings> = { ...body };
      if (!canCheckoutAllowed && sanitized.enable_checkout) {
        sanitized.enable_checkout = false;
      }

      const updated = await merchantRepository.updateStoreSettings(businessId, sanitized);
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update store settings.' } }, 500);
    }
  }

  // GET /api/merchant/stories
  if (path === '/api/merchant/stories' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const stories = await storyRepository.getStoriesByBusinessId(membership.business_id);
      return json({ success: true, data: stories });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load stories.' } }, 500);
    }
  }

  // PUT /api/merchant/stories
  if (path === '/api/merchant/stories' && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const stories = await storyRepository.saveStories(membership.business_id, body.stories || []);
      return json({ success: true, data: stories });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to save stories.' } }, 500);
    }
  }

  // POST /api/merchant/store/publish
  if (path === '/api/merchant/store/publish' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const updated = await merchantRepository.updateStoreStatus(membership.business_id, body.status || 'published');
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to publish store.' } }, 500);
    }
  }

  // GET /api/merchant/products
  if (path === '/api/merchant/products' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const products = await productRepository.getProducts(membership.business_id);
      return json({ success: true, data: products });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load products.' } }, 500);
    }
  }

  // POST /api/merchant/products
  if (path === '/api/merchant/products' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const businessId = membership.business_id;

      const productLimitCheck = await entitlementService.canAddProductAsync(businessId);
      if (!productLimitCheck.allowed) {
        return json({
          success: false,
          error: {
            code: 'PLAN_LIMIT_REACHED',
            message: `Product limit reached. Your current plan allows maximum ${productLimitCheck.maxAllowed} products. Please upgrade to add more products.`
          }
        }, 403);
      }

      const product = await productRepository.createProduct({
        ...body,
        business_id: businessId,
        price: Number(body.price) || 0,
        compare_at_price: body.compare_at_price ? Number(body.compare_at_price) : undefined,
        stock_quantity: Number(body.stock_quantity) || 0
      });

      return json({ success: true, data: product }, 201);
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to create product.' } }, 500);
    }
  }

  // PUT /api/merchant/products/:id
  const productPutMatch = path.match(/^\/api\/merchant\/products\/([^\/]+)$/);
  if (productPutMatch && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const productId = productPutMatch[1];
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const product = await productRepository.getProductById(productId);
      if (!product || product.business_id !== membership.business_id) {
        return json({ success: false, error: { code: 'FORBIDDEN', message: 'Product does not belong to your business.' } }, 403);
      }

      const updated = await productRepository.updateProduct(productId, {
        ...body,
        price: body.price !== undefined ? Number(body.price) : undefined,
        compare_at_price: body.compare_at_price !== undefined ? (body.compare_at_price ? Number(body.compare_at_price) : null) : undefined,
        stock_quantity: body.stock_quantity !== undefined ? Number(body.stock_quantity) : undefined
      });

      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update product.' } }, 500);
    }
  }

  // DELETE /api/merchant/products/:id
  if (productPutMatch && method === 'DELETE') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const productId = productPutMatch[1];
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const product = await productRepository.getProductById(productId);
      if (!product || product.business_id !== membership.business_id) {
        return json({ success: false, error: { code: 'FORBIDDEN', message: 'Product does not belong to your business.' } }, 403);
      }

      await productRepository.deleteProduct(productId);
      return json({ success: true, message: 'Product deleted.' });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to delete product.' } }, 500);
    }
  }

  // GET /api/merchant/categories
  if (path === '/api/merchant/categories' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const categories = await productRepository.getCategories(membership.business_id);
      return json({ success: true, data: categories });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load categories.' } }, 500);
    }
  }

  // POST /api/merchant/categories
  if (path === '/api/merchant/categories' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const category = await productRepository.createCategory({
        ...body,
        business_id: membership.business_id
      });
      return json({ success: true, data: category }, 201);
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to create category.' } }, 500);
    }
  }

  // PUT /api/merchant/categories/:id
  const catPutMatch = path.match(/^\/api\/merchant\/categories\/([^\/]+)$/);
  if (catPutMatch && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const categoryId = catPutMatch[1];
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const cat = await productRepository.getCategoryById(categoryId);
      if (!cat || cat.business_id !== membership.business_id) {
        return json({ success: false, error: { code: 'FORBIDDEN', message: 'Category does not belong to your business.' } }, 403);
      }
      const updated = await productRepository.updateCategory(categoryId, body);
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update category.' } }, 500);
    }
  }

  // DELETE /api/merchant/categories/:id
  if (catPutMatch && method === 'DELETE') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const categoryId = catPutMatch[1];
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const cat = await productRepository.getCategoryById(categoryId);
      if (!cat || cat.business_id !== membership.business_id) {
        return json({ success: false, error: { code: 'FORBIDDEN', message: 'Category does not belong to your business.' } }, 403);
      }
      await productRepository.deleteCategory(categoryId);
      return json({ success: true, message: 'Category deleted.' });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to delete category.' } }, 500);
    }
  }

  // GET /api/merchant/orders
  if (path === '/api/merchant/orders' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const orders = await orderRepository.getOrdersByBusinessId(membership.business_id);
      return json({ success: true, data: orders });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load orders.' } }, 500);
    }
  }

  // PATCH /api/merchant/orders/:id/status
  const orderStatusMatch = path.match(/^\/api\/merchant\/orders\/([^\/]+)\/status$/);
  if (orderStatusMatch && method === 'PATCH') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const orderId = orderStatusMatch[1];
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const order = await orderRepository.getOrderById(orderId);
      if (!order || order.business_id !== membership.business_id) {
        return json({ success: false, error: { code: 'FORBIDDEN', message: 'Order does not belong to your business.' } }, 403);
      }
      const updated = await orderRepository.updateOrderStatus(orderId, body.status);
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update order status.' } }, 500);
    }
  }

  // GET /api/merchant/customers
  if (path === '/api/merchant/customers' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const customers = await orderRepository.getCustomersByBusinessId(membership.business_id);
      return json({ success: true, data: customers });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load customers.' } }, 500);
    }
  }

  // GET /api/merchant/reviews
  if (path === '/api/merchant/reviews' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const reviews = await reviewRepository.getAllMerchantReviews(membership.business_id);
      const stats = reviewRepository.calculateStats(reviews);
      return json({ success: true, data: { reviews, stats } });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load reviews.' } }, 500);
    }
  }

  // POST /api/merchant/reviews
  if (path === '/api/merchant/reviews' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const review = await reviewRepository.createReview({
        business_id: membership.business_id,
        product_id: body.product_id || undefined,
        product_name: body.product_name?.trim() || undefined,
        customer_name: body.customer_name?.trim() || 'Anonymous Customer',
        customer_email: body.customer_email?.trim() || undefined,
        customer_avatar: body.customer_avatar || undefined,
        location: body.location?.trim() || undefined,
        rating: Number(body.rating) || 5,
        comment: body.comment?.trim() || '',
        photos: Array.isArray(body.photos) ? body.photos : [],
        is_verified: typeof body.is_verified === 'boolean' ? body.is_verified : true,
        is_approved: typeof body.is_approved === 'boolean' ? body.is_approved : true,
        is_featured: Boolean(body.is_featured),
        source: 'merchant_manual',
        order_number: body.order_number?.trim() || undefined
      });
      return json({ success: true, data: review }, 201);
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to create review.' } }, 500);
    }
  }

  // PATCH /api/merchant/reviews/:id
  const reviewPatchMatch = path.match(/^\/api\/merchant\/reviews\/([^\/]+)$/);
  if (reviewPatchMatch && method === 'PATCH') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const reviewId = reviewPatchMatch[1];
    try {
      const body = (await request.json()) as any;
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      const updated = await reviewRepository.updateReview(membership.business_id, reviewId, body);
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update review.' } }, 500);
    }
  }

  // DELETE /api/merchant/reviews/:id
  if (reviewPatchMatch && method === 'DELETE') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const reviewId = reviewPatchMatch[1];
    try {
      const { membership } = await getOrCreateUserBusiness(auth.authContext.user);
      await reviewRepository.deleteReview(membership.business_id, reviewId);
      return json({ success: true, message: 'Review deleted.' });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to delete review.' } }, 500);
    }
  }

  // -------------------------------------------------------------
  // 7. AFFILIATE ROUTES
  // -------------------------------------------------------------

  // GET /api/affiliate/track-click
  if (path === '/api/affiliate/track-click' && method === 'GET') {
    const refCode = url.searchParams.get('ref') || '';
    const landingPage = url.searchParams.get('page') || '/register';
    if (!refCode) {
      return json({ success: false, error: { message: 'Referral code is required.' } }, 400);
    }
    const result = await affiliateService.recordClick({
      code: refCode,
      ip: request.headers.get('cf-connecting-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
      landingPage
    });
    if (!result.success) {
      return json({ success: false, error: { message: result.error } }, 404);
    }
    return json({ success: true, data: { affiliate_code: result.affiliate_code, message: 'Referral touch recorded.' } });
  }

  // GET /api/affiliate/validate-code/:code
  if (path.startsWith('/api/affiliate/validate-code/') && method === 'GET') {
    const code = path.replace('/api/affiliate/validate-code/', '');
    const validation = await affiliateService.validateReferralCode(code);
    if (!validation.valid) {
      return json({ success: false, error: { message: validation.error } }, 404);
    }
    return json({ success: true, data: { valid: true, code: validation.code } });
  }

  // GET /api/affiliate/dashboard
  if (path === '/api/affiliate/dashboard' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const dashboard = await affiliateService.getAffiliateDashboard(auth.authContext.user.id, url.origin);
      return json({ success: true, data: dashboard });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load affiliate dashboard.' } }, 500);
    }
  }

  // PUT /api/affiliate/payout-details
  if (path === '/api/affiliate/payout-details' && method === 'PUT') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const body = (await request.json()) as any;
      const updated = await affiliateService.updatePayoutDetails(auth.authContext.user.id, body);
      return json({ success: true, data: updated });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to update payout details.' } }, 500);
    }
  }

  // GET /api/affiliate/notifications
  if (path === '/api/affiliate/notifications' && method === 'GET') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      const notifications = await notificationService.getUserNotifications(auth.authContext.user.id);
      return json({ success: true, data: notifications });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to load notifications.' } }, 500);
    }
  }

  // PATCH /api/affiliate/notifications/:id/read
  const notifReadMatch = path.match(/^\/api\/affiliate\/notifications\/([^\/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    const notifId = notifReadMatch[1];
    try {
      await notificationService.markAsRead(notifId, auth.authContext.user.id);
      return json({ success: true });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to mark notification read.' } }, 500);
    }
  }

  // POST /api/affiliate/notifications/mark-all-read
  if (path === '/api/affiliate/notifications/mark-all-read' && method === 'POST') {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    try {
      await notificationService.markAllAsRead(auth.authContext.user.id);
      return json({ success: true });
    } catch (err: any) {
      return json({ success: false, error: { message: err.message || 'Failed to mark all notifications read.' } }, 500);
    }
  }

  // -------------------------------------------------------------
  // 8. ADMIN ROUTES
  // -------------------------------------------------------------

  if (path.startsWith('/api/admin/')) {
    const auth = await authenticateWorkerRequest(request);
    if (auth.errorResponse || !auth.authContext) return auth.errorResponse!;
    if (!auth.authContext.user.is_platform_admin) {
      return json({ success: false, error: { code: 'ADMIN_REQUIRED', message: 'Platform administrator privileges required.' } }, 403);
    }

    // GET /api/admin/metrics
    if (path === '/api/admin/metrics' && method === 'GET') {
      try {
        const metrics = await adminRepository.getPlatformMetrics();
        return json({ success: true, data: metrics });
      } catch (err: any) {
        return json({ success: false, error: { code: err.code || 'METRICS_ERROR', message: err.message || 'Failed to retrieve platform metrics.' } }, 500);
      }
    }

    // GET /api/admin/businesses
    if (path === '/api/admin/businesses' && method === 'GET') {
      try {
        const businesses = await adminRepository.getAllBusinesses();
        return json({ success: true, data: businesses });
      } catch (err: any) {
        return json({ success: false, error: { code: err.code || 'BUSINESSES_ERROR', message: err.message || 'Failed to list businesses.' } }, 500);
      }
    }

    // PATCH /api/admin/businesses/:id/status
    const adminBizMatch = path.match(/^\/api\/admin\/businesses\/([^\/]+)\/status$/);
    if (adminBizMatch && method === 'PATCH') {
      const bizId = adminBizMatch[1];
      try {
        const body = (await request.json()) as any;
        if (!['active', 'suspended', 'cancelled'].includes(body.status)) {
          return json({ success: false, error: { code: 'INVALID_STATUS', message: 'Status must be active, suspended, or cancelled.' } }, 400);
        }
        const business = await adminRepository.updateBusinessStatus(bizId, body.status);
        return json({ success: true, data: { business, message: `Business ${business.name} is now ${body.status}.` } });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to update business status.' } }, 500);
      }
    }

    // GET /api/admin/platform/settings
    if (path === '/api/admin/platform/settings' && method === 'GET') {
      try {
        const settings = await adminRepository.getPlatformSettings();
        return json({ success: true, data: settings });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to retrieve settings.' } }, 500);
      }
    }

    // PUT /api/admin/platform/settings
    if (path === '/api/admin/platform/settings' && method === 'PUT') {
      try {
        const body = (await request.json()) as any;
        const updated = await adminRepository.updatePlatformSettings(body);
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to update settings.' } }, 500);
      }
    }

    // GET /api/admin/plans
    if (path === '/api/admin/plans' && method === 'GET') {
      try {
        const plans = await adminRepository.getAllSubscriptionPlans();
        return json({ success: true, data: plans });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to retrieve plans.' } }, 500);
      }
    }

    // PATCH /api/admin/plans/:id/status
    const adminPlanStatusMatch = path.match(/^\/api\/admin\/plans\/([^\/]+)\/status$/);
    if (adminPlanStatusMatch && method === 'PATCH') {
      const planId = adminPlanStatusMatch[1];
      try {
        const body = (await request.json()) as any;
        const updated = await adminRepository.updateSubscriptionPlan(planId, { is_active: Boolean(body.is_active) });
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to update plan status.' } }, 500);
      }
    }

    // PUT /api/admin/plans/:id
    const adminPlanPutMatch = path.match(/^\/api\/admin\/plans\/([^\/]+)$/);
    if (adminPlanPutMatch && method === 'PUT') {
      const planId = adminPlanPutMatch[1];
      try {
        const body = (await request.json()) as any;
        const updated = await adminRepository.updateSubscriptionPlan(planId, body);
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to update plan details.' } }, 500);
      }
    }

    // GET /api/admin/affiliates
    if (path === '/api/admin/affiliates' && method === 'GET') {
      try {
        const affiliates = await affiliateService.adminGetAllAffiliates();
        return json({ success: true, data: affiliates });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to load affiliates.' } }, 500);
      }
    }

    // GET /api/admin/referrals
    if (path === '/api/admin/referrals' && method === 'GET') {
      try {
        const referrals = await affiliateService.adminGetAllReferrals();
        return json({ success: true, data: referrals });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to load referrals.' } }, 500);
      }
    }

    // GET /api/admin/commissions
    if (path === '/api/admin/commissions' && method === 'GET') {
      try {
        const commissions = await affiliateService.adminGetAllCommissions();
        return json({ success: true, data: commissions });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to load commissions.' } }, 500);
      }
    }

    // GET /api/admin/payouts
    if (path === '/api/admin/payouts' && method === 'GET') {
      try {
        const payouts = await affiliateService.adminGetAllPayouts();
        return json({ success: true, data: payouts });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to load payouts.' } }, 500);
      }
    }

    // PATCH /api/admin/affiliates/:id/status
    const adminAffStatusMatch = path.match(/^\/api\/admin\/affiliates\/([^\/]+)\/status$/);
    if (adminAffStatusMatch && method === 'PATCH') {
      const affId = adminAffStatusMatch[1];
      try {
        const body = (await request.json()) as any;
        const updated = await affiliateService.adminSetAffiliateStatus(affId, body.status);
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to update affiliate status.' } }, 500);
      }
    }

    // PATCH /api/admin/referrals/:id/fraud
    const adminRefFraudMatch = path.match(/^\/api\/admin\/referrals\/([^\/]+)\/fraud$/);
    if (adminRefFraudMatch && method === 'PATCH') {
      const refId = adminRefFraudMatch[1];
      try {
        const body = (await request.json()) as any;
        const updated = await affiliateService.adminMarkReferralFraudulent(refId, body.reason || 'Flagged by Administrator');
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to mark referral fraud.' } }, 500);
      }
    }

    // PATCH /api/admin/commissions/:id/cancel
    const adminCommCancelMatch = path.match(/^\/api\/admin\/commissions\/([^\/]+)\/cancel$/);
    if (adminCommCancelMatch && method === 'PATCH') {
      const commId = adminCommCancelMatch[1];
      try {
        const body = (await request.json()) as any;
        const updated = await affiliateService.adminCancelCommission(commId, body.reason || 'Cancelled by Administrator');
        return json({ success: true, data: updated });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to cancel commission.' } }, 500);
      }
    }

    // POST /api/admin/payouts/process
    if (path === '/api/admin/payouts/process' && method === 'POST') {
      try {
        const body = (await request.json()) as any;
        const payout = await affiliateService.adminRecordPayout({
          affiliateId: body.affiliateId,
          paymentReference: body.paymentReference,
          commissionIds: body.commissionIds || [],
          notes: body.notes
        });
        return json({ success: true, data: payout });
      } catch (err: any) {
        return json({ success: false, error: { message: err.message || 'Failed to process payout.' } }, 500);
      }
    }
  }

  // Not matched in custom router
  return null;
}
