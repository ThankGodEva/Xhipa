import { Router, Response } from 'express';
import { db } from '../data/store';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { entitlementService } from '../services/entitlement.service';
import { affiliateService } from '../services/affiliate.service';
import { Category, Product, ProductImage, StoreSettings } from '../../src/types';
import { isReservedSlug, slugify } from '../../src/lib/utils';
import { uploadBase64ToR2 } from '../services/r2Storage.service';

const router = Router();

// Middleware: all merchant routes require authentication
router.use(requireAuth);

// Helper: Ensure a business tenant exists for the authenticated user and assign Free plan
function getOrCreateUserBusiness(user: any) {
  let membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === user.id);
  if (!membership) {
    const bizId = `biz_${user.id}`;
    const baseSlug = slugify(user.full_name || 'store') || 'my-store';
    const generatedSlug = `${baseSlug}-${Math.floor(100 + Math.random() * 900)}`;

    const newBiz = {
      id: bizId,
      name: user.full_name ? `${user.full_name}'s Store` : 'My Store',
      slug: generatedSlug,
      description: 'Welcome to our official online storefront.',
      logo_url: '',
      phone: '',
      whatsapp_number: '',
      email: user.email || '',
      country: 'NG',
      currency: 'NGN',
      status: 'active' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    db.businesses.set(bizId, newBiz);

    membership = {
      id: `bm_${user.id}`,
      business_id: bizId,
      user_id: user.id,
      role: 'owner',
      created_at: new Date().toISOString()
    };
    db.businessMembers.set(membership.id, membership);

    db.stores.set(bizId, {
      id: `str_${user.id}`,
      business_id: bizId,
      slug: generatedSlug,
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    db.storeSettings.set(bizId, {
      id: `set_${user.id}`,
      business_id: bizId,
      theme: 'blue',
      primary_color: '#2563eb',
      show_logo: true,
      show_phone: true,
      show_whatsapp: true,
      show_social_links: true,
      enable_catalogue: true,
      enable_checkout: false,
      delivery_fee_type: 'flat',
      flat_delivery_fee: 150000,
      delivery_information: 'Nationwide delivery across Nigeria.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Automatically assign vendors the Free plan on account creation
    db.subscriptions.set(bizId, {
      id: `sub_${user.id}`,
      business_id: bizId,
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return {
    membership,
    business: db.businesses.get(membership.business_id)!,
    store: db.stores.get(membership.business_id)!,
    settings: db.storeSettings.get(membership.business_id)!
  };
}

/**
 * GET /api/merchant/overview
 * Dashboard analytics and stats (tenant isolated)
 */
router.get('/overview', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  const { membership, business, store, settings } = getOrCreateUserBusiness(req.user);
  const businessId = membership.business_id;
  const plan = entitlementService.getBusinessPlan(businessId);

  const orders = Array.from(db.orders.values()).filter(o => o.business_id === businessId);
  const products = Array.from(db.products.values()).filter(p => p.business_id === businessId && p.status !== 'archived');
  const customers = Array.from(db.customers.values()).filter(c => c.business_id === businessId);

  const totalSales = orders.filter(o => o.payment_status === 'paid').reduce((sum, o) => sum + o.total, 0);
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;

  return res.json({
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
        totalProducts: products.length,
        totalCustomers: customers.length
      },
      recentOrders: orders.slice(-5).reverse()
    }
  });
});

/**
 * GET /api/merchant/business
 */
router.get('/business', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  const { membership, business, store, settings } = getOrCreateUserBusiness(req.user);

  return res.json({
    success: true,
    data: { business, store, settings, role: membership.role }
  });
});

/**
 * PUT /api/merchant/business
 */
router.put('/business', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  const { membership } = getOrCreateUserBusiness(req.user);
  const business = db.businesses.get(membership.business_id);
  const store = db.stores.get(membership.business_id);

  if (!business) {
    return res.status(404).json({ success: false, error: { message: 'Business not found.' } });
  }

  const {
    name,
    slug,
    description,
    phone,
    whatsapp_number,
    email,
    state,
    city,
    address,
    country,
    currency,
    logo_url
  } = req.body;

  if (name) business.name = name;
  if (slug) {
    business.slug = slug;
    if (store) store.slug = slug;
  }
  if (description !== undefined) business.description = description;
  if (phone !== undefined) business.phone = phone;
  if (whatsapp_number !== undefined) business.whatsapp_number = whatsapp_number;
  if (email !== undefined) business.email = email;
  if (state !== undefined) business.state = state;
  if (city !== undefined) business.city = city;
  if (address !== undefined) business.address = address;
  if (country !== undefined) business.country = country;
  if (currency !== undefined) business.currency = currency;
  if (logo_url !== undefined) {
    if (logo_url && logo_url.startsWith('data:')) {
      try {
        const uploadRes = await uploadBase64ToR2({
          base64Data: logo_url,
          filename: `logo_${Date.now()}.jpg`,
          folder: 'branding',
          businessId: membership.business_id
        });
        business.logo_url = uploadRes.url;
      } catch (e) {
        business.logo_url = logo_url;
      }
    } else {
      business.logo_url = logo_url;
    }
  }
  business.updated_at = new Date().toISOString();

  db.businesses.set(business.id, business);
  if (store) db.stores.set(membership.business_id, store);

  return res.json({ success: true, data: business });
});

/**
 * POST /api/merchant/onboard
 * Comprehensive onboarding submission saving all collected details
 */
router.post('/onboard', (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  const { membership } = getOrCreateUserBusiness(req.user);
  const business = db.businesses.get(membership.business_id)!;
  const store = db.stores.get(membership.business_id)!;
  let settings = db.storeSettings.get(membership.business_id);

  const {
    businessName,
    name,
    slug,
    phone,
    whatsapp,
    whatsapp_number,
    mode,
    state,
    city,
    address,
    description,
    referralCode,
    referral_code
  } = req.body;

  const refCode = referralCode || referral_code;
  if (refCode) {
    affiliateService.attributeReferralOnSignup({
      referralCode: refCode,
      referredUserId: req.user.id,
      businessId: membership.business_id,
      userEmail: req.user.email || '',
      userPhone: phone || whatsapp || '',
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }).catch(err => {
      console.error('[Affiliate] Attribution error on onboarding:', err);
    });
  }

  const resolvedName = businessName || name || business.name;
  const resolvedSlug = slug || business.slug;
  const resolvedPhone = phone || business.phone;
  const resolvedWhatsapp = whatsapp || whatsapp_number || resolvedPhone || business.whatsapp_number;

  business.name = resolvedName;
  business.slug = resolvedSlug;
  business.phone = resolvedPhone;
  business.whatsapp_number = resolvedWhatsapp;
  if (req.user.email) business.email = req.user.email;
  if (state !== undefined) business.state = state;
  if (city !== undefined) business.city = city;
  if (address !== undefined) business.address = address;
  if (description !== undefined) business.description = description;
  business.updated_at = new Date().toISOString();
  db.businesses.set(business.id, business);

  store.slug = resolvedSlug;
  store.status = 'published';
  store.published_at = store.published_at || new Date().toISOString();
  store.updated_at = new Date().toISOString();
  db.stores.set(membership.business_id, store);

  if (!settings) {
    settings = {
      id: `set_${req.user.id}`,
      business_id: membership.business_id,
      theme: 'blue',
      primary_color: '#2563eb',
      show_logo: true,
      show_phone: true,
      show_whatsapp: true,
      show_social_links: true,
      enable_catalogue: true,
      enable_checkout: mode === 'checkout',
      delivery_fee_type: 'flat',
      flat_delivery_fee: 150000,
      delivery_information: 'Nationwide delivery across Nigeria.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } else {
    settings.enable_catalogue = true;
    settings.enable_checkout = mode === 'checkout';
    settings.updated_at = new Date().toISOString();
  }
  db.storeSettings.set(membership.business_id, settings);

  // Guarantee Free account subscription is active
  if (!db.subscriptions.has(membership.business_id)) {
    db.subscriptions.set(membership.business_id, {
      id: `sub_${req.user.id}`,
      business_id: membership.business_id,
      plan_id: 'free',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return res.json({
    success: true,
    data: {
      business,
      store,
      settings,
      subscription: db.subscriptions.get(membership.business_id)
    }
  });
});

/**
 * PUT /api/merchant/store/settings
 */
router.put('/store/settings', (req: AuthenticatedRequest, res: Response) => {
  let membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership && req.user) {
    const created = getOrCreateUserBusiness(req.user);
    membership = created.membership;
  }
  if (!membership) {
    return res.status(404).json({ success: false, error: { message: 'No business found.' } });
  }

  const businessId = membership.business_id;
  let settings = db.storeSettings.get(businessId);
  const {
    theme,
    primary_color,
    show_logo,
    show_phone,
    show_whatsapp,
    show_social_links,
    enable_catalogue,
    enable_checkout,
    delivery_fee_type,
    flat_delivery_fee,
    delivery_information,
    return_policy,
    privacy_policy
  } = req.body;

  // Format and sanitize primary_color
  let cleanPrimaryColor = primary_color;
  if (typeof cleanPrimaryColor === 'string') {
    cleanPrimaryColor = cleanPrimaryColor.trim();
    if (!cleanPrimaryColor.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(cleanPrimaryColor)) {
      cleanPrimaryColor = `#${cleanPrimaryColor}`;
    }
  }

  // Validate checkout entitlement
  if (enable_checkout && !entitlementService.can(businessId, 'can_checkout')) {
    return res.status(403).json({
      success: false,
      error: { code: 'UPGRADE_REQUIRED', message: 'Online checkout is available on Starter and Business plans. Please upgrade to enable direct checkout.' }
    });
  }

  if (!settings) {
    settings = {
      id: `set_${Date.now()}`,
      business_id: businessId,
      theme: theme || 'rose',
      primary_color: cleanPrimaryColor || '#10B981',
      show_logo: show_logo ?? true,
      show_phone: show_phone ?? true,
      show_whatsapp: show_whatsapp ?? true,
      show_social_links: show_social_links ?? true,
      enable_catalogue: enable_catalogue ?? true,
      enable_checkout: enable_checkout ?? false,
      delivery_fee_type: delivery_fee_type || 'flat',
      flat_delivery_fee: flat_delivery_fee ?? 150000,
      delivery_information,
      return_policy,
      privacy_policy,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  } else {
    if (theme) settings.theme = theme;
    if (cleanPrimaryColor) settings.primary_color = cleanPrimaryColor;
    if (show_logo !== undefined) settings.show_logo = show_logo;
    if (show_phone !== undefined) settings.show_phone = show_phone;
    if (show_whatsapp !== undefined) settings.show_whatsapp = show_whatsapp;
    if (show_social_links !== undefined) settings.show_social_links = show_social_links;
    if (enable_catalogue !== undefined) settings.enable_catalogue = enable_catalogue;
    if (enable_checkout !== undefined) settings.enable_checkout = enable_checkout;
    if (delivery_fee_type) settings.delivery_fee_type = delivery_fee_type;
    if (flat_delivery_fee !== undefined) settings.flat_delivery_fee = flat_delivery_fee;
    if (delivery_information !== undefined) settings.delivery_information = delivery_information;
    if (return_policy !== undefined) settings.return_policy = return_policy;
    if (privacy_policy !== undefined) settings.privacy_policy = privacy_policy;
    settings.updated_at = new Date().toISOString();
  }

  db.storeSettings.set(businessId, settings);

  return res.json({ success: true, data: settings });
});

/**
 * GET /api/merchant/stories
 * Returns storefront story highlights & slides for merchant configuration
 */
router.get('/stories', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) {
    return res.status(404).json({ success: false, error: { message: 'No business found.' } });
  }

  const stories = db.getStoriesForBusiness(membership.business_id);
  return res.json({ success: true, data: stories });
});

/**
 * PUT /api/merchant/stories
 * Saves updated stories and slides for the merchant's storefront
 */
router.put('/stories', async (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) {
    return res.status(404).json({ success: false, error: { message: 'No business found.' } });
  }

  const { stories } = req.body;
  if (!Array.isArray(stories)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid stories payload. Must be an array.' } });
  }

  // Upload any base64 media across stories & slides to Cloudflare R2
  const processedStories = await Promise.all(
    stories.map(async (story: any, sIdx: number) => {
      let coverImage = story.coverImage || '';
      if (coverImage && coverImage.startsWith('data:')) {
        try {
          const res = await uploadBase64ToR2({
            base64Data: coverImage,
            filename: `story_cover_${sIdx}_${Date.now()}.jpg`,
            folder: 'stories',
            businessId: membership.business_id
          });
          coverImage = res.url;
        } catch (e) {
          console.error('Error uploading story cover to R2:', e);
        }
      }

      let slides = story.slides || [];
      if (Array.isArray(slides)) {
        slides = await Promise.all(
          slides.map(async (slide: any, slideIdx: number) => {
            let img = slide.image || '';
            if (img && img.startsWith('data:')) {
              try {
                const res = await uploadBase64ToR2({
                  base64Data: img,
                  filename: `slide_${sIdx}_${slideIdx}_${Date.now()}.jpg`,
                  folder: 'stories',
                  businessId: membership.business_id
                });
                img = res.url;
              } catch (e) {
                console.error('Error uploading slide image to R2:', e);
              }
            }
            return {
              ...slide,
              image: img
            };
          })
        );
      }

      return {
        ...story,
        coverImage,
        slides
      };
    })
  );

  const updated = db.setStoriesForBusiness(membership.business_id, processedStories);
  return res.json({ success: true, data: updated });
});

/**
 * POST /api/merchant/store/publish
 */
router.post('/store/publish', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) {
    return res.status(404).json({ success: false, error: { message: 'No business found.' } });
  }

  const store = db.stores.get(membership.business_id);
  if (!store) {
    return res.status(404).json({ success: false, error: { message: 'Store not found.' } });
  }

  const { status } = req.body;
  store.status = status || 'published';
  if (store.status === 'published' && !store.published_at) {
    store.published_at = new Date().toISOString();
  }
  store.updated_at = new Date().toISOString();

  db.stores.set(membership.business_id, store);

  return res.json({ success: true, data: store });
});

/**
 * GET /api/merchant/products
 */
router.get('/products', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const businessId = membership.business_id;
  const categories = Array.from(db.categories.values()).filter(c => c.business_id === businessId);
  const products = Array.from(db.products.values())
    .filter(p => p.business_id === businessId && p.status !== 'archived')
    .map(p => ({
      ...p,
      category: categories.find(c => c.id === p.category_id)
    }))
    .reverse();

  return res.json({ success: true, data: products });
});

/**
 * Helper: process raw images and upload any base64 data URLs to Cloudflare R2 bucket storage
 */
async function processAndUploadProductImages(rawImages: any[], businessId: string, productId: string): Promise<ProductImage[]> {
  const productImages: ProductImage[] = [];
  for (let idx = 0; idx < rawImages.length; idx++) {
    const item = rawImages[idx];
    let publicUrl = typeof item === 'string' ? item : (item.url || item.public_url || '');
    if (!publicUrl) continue;

    if (publicUrl.startsWith('data:')) {
      try {
        const uploadRes = await uploadBase64ToR2({
          base64Data: publicUrl,
          filename: `prod_${productId}_${idx}.jpg`,
          folder: 'products',
          businessId
        });
        publicUrl = uploadRes.url;
      } catch (err) {
        console.error('Failed to upload product image to R2:', err);
      }
    }

    productImages.push({
      id: (typeof item === 'object' && item.id) ? item.id : `img_${Date.now()}_${idx}`,
      business_id: businessId,
      product_id: productId,
      storage_path: `businesses/${businessId}/products/${productId}/img_${idx}.jpg`,
      public_url: publicUrl,
      alt_text: typeof item === 'object' ? item.alt_text : undefined,
      sort_order: typeof item === 'object' && item.sort_order !== undefined ? item.sort_order : idx,
      created_at: new Date().toISOString()
    });
  }
  return productImages;
}

/**
 * POST /api/merchant/products
 */
router.post('/products', async (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const businessId = membership.business_id;

  // Check product limits based on subscription plan (Free: 10, Beginner: 50, Starter: 100, Business: unltd)
  const limitCheck = entitlementService.canAddProduct(businessId);
  if (!limitCheck.allowed) {
    return res.status(403).json({
      success: false,
      error: { code: 'PRODUCT_LIMIT_REACHED', message: limitCheck.message }
    });
  }

  const {
    name,
    description,
    price,
    compare_at_price,
    category_id,
    stock_quantity,
    track_inventory,
    featured,
    status,
    imageUrl,
    imageUrls,
    images,
    tiktok_video_url,
    tiktokVideoUrl,
    video_url
  } = req.body;

  if (!name || price === undefined) {
    return res.status(400).json({ success: false, error: { message: 'Product name and price are required.' } });
  }

  const slug = slugify(name) + '-' + Math.floor(1000 + Math.random() * 9000);
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Parse and upload images to Cloudflare R2
  let rawList: any[] = [];
  if (Array.isArray(images) && images.length > 0) {
    rawList = images;
  } else if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    rawList = imageUrls;
  } else if (imageUrl) {
    rawList = [imageUrl];
  }

  const productImages = await processAndUploadProductImages(rawList, businessId, productId);

  const resolvedTikTokUrl = tiktok_video_url || tiktokVideoUrl || video_url || undefined;

  const newProduct: Product = {
    id: productId,
    business_id: businessId,
    category_id: category_id || undefined,
    name,
    slug,
    description: description || '',
    price: Number(price), // in Kobo
    compare_at_price: compare_at_price ? Number(compare_at_price) : undefined,
    stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : 10,
    track_inventory: track_inventory !== undefined ? Boolean(track_inventory) : true,
    status: status || 'published',
    featured: Boolean(featured),
    images: productImages,
    tiktok_video_url: resolvedTikTokUrl,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.products.set(productId, newProduct);

  return res.status(201).json({ success: true, data: newProduct });
});

/**
 * PUT /api/merchant/products/:id
 */
router.put('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const product = db.products.get(req.params.id);
  if (!product || product.business_id !== membership.business_id) {
    return res.status(404).json({ success: false, error: { message: 'Product not found.' } });
  }

  const {
    name,
    description,
    price,
    compare_at_price,
    category_id,
    stock_quantity,
    track_inventory,
    featured,
    status,
    imageUrl,
    imageUrls,
    images,
    tiktok_video_url,
    tiktokVideoUrl,
    video_url
  } = req.body;

  if (name) product.name = name;
  if (description !== undefined) product.description = description;
  if (price !== undefined) product.price = Number(price);
  if (compare_at_price !== undefined) product.compare_at_price = compare_at_price ? Number(compare_at_price) : undefined;
  if (category_id !== undefined) product.category_id = category_id || undefined;
  if (stock_quantity !== undefined) product.stock_quantity = Number(stock_quantity);
  if (track_inventory !== undefined) product.track_inventory = Boolean(track_inventory);
  if (featured !== undefined) product.featured = Boolean(featured);
  if (status) product.status = status;

  if (tiktok_video_url !== undefined || tiktokVideoUrl !== undefined || video_url !== undefined) {
    product.tiktok_video_url = tiktok_video_url || tiktokVideoUrl || video_url || undefined;
  }

  if (Array.isArray(images)) {
    product.images = await processAndUploadProductImages(images, membership.business_id, product.id);
  } else if (Array.isArray(imageUrls)) {
    product.images = await processAndUploadProductImages(imageUrls, membership.business_id, product.id);
  } else if (imageUrl !== undefined) {
    if (imageUrl) {
      product.images = await processAndUploadProductImages([imageUrl], membership.business_id, product.id);
    } else {
      product.images = [];
    }
  }

  product.updated_at = new Date().toISOString();
  db.products.set(product.id, product);

  return res.json({ success: true, data: product });
});

/**
 * DELETE /api/merchant/products/:id
 */
router.delete('/products/:id', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const product = db.products.get(req.params.id);
  if (!product || product.business_id !== membership.business_id) {
    return res.status(404).json({ success: false, error: { message: 'Product not found.' } });
  }

  // Soft delete as archived
  product.status = 'archived';
  db.products.set(product.id, product);

  return res.json({ success: true, message: 'Product deleted.' });
});

/**
 * GET /api/merchant/categories
 */
router.get('/categories', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const categories = Array.from(db.categories.values())
    .filter(c => c.business_id === membership.business_id && c.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  return res.json({ success: true, data: categories });
});

/**
 * POST /api/merchant/categories
 */
router.post('/categories', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, error: { message: 'Category name is required.' } });

  const slug = slugify(name);
  const catId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newCat: Category = {
    id: catId,
    business_id: membership.business_id,
    name,
    slug,
    description,
    sort_order: db.categories.size + 1,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  db.categories.set(catId, newCat);

  return res.status(201).json({ success: true, data: newCat });
});

/**
 * GET /api/merchant/orders
 */
router.get('/orders', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const orders = Array.from(db.orders.values())
    .filter(o => o.business_id === membership.business_id)
    .reverse();

  return res.json({ success: true, data: orders });
});

/**
 * PATCH /api/merchant/orders/:id/status
 */
router.patch('/orders/:id/status', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const order = db.orders.get(req.params.id);
  if (!order || order.business_id !== membership.business_id) {
    return res.status(404).json({ success: false, error: { message: 'Order not found.' } });
  }

  const { status, payment_status } = req.body;
  if (status) order.status = status;
  if (payment_status) order.payment_status = payment_status;
  order.updated_at = new Date().toISOString();

  db.orders.set(order.id, order);

  return res.json({ success: true, data: order });
});

/**
 * GET /api/merchant/customers
 */
router.get('/customers', (req: AuthenticatedRequest, res: Response) => {
  const membership = Array.from(db.businessMembers.values()).find(bm => bm.user_id === req.user?.id);
  if (!membership) return res.status(404).json({ success: false, error: { message: 'No business found.' } });

  const customers = Array.from(db.customers.values())
    .filter(c => c.business_id === membership.business_id)
    .reverse();

  return res.json({ success: true, data: customers });
});

export default router;
