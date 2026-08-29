import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { entitlementService } from '../services/entitlement.service';
import { affiliateService } from '../services/affiliate.service';
import { merchantRepository } from '../repositories/merchant.repository';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { storyRepository } from '../repositories/story.repository';
import { subscriptionRepository } from '../repositories/subscription.repository';
import { reviewRepository } from '../repositories/review.repository';
import { Category, Product, ProductImage, StoreSettings } from '../../src/types';
import { slugify } from '../../src/lib/utils';
import { uploadBase64ToR2, normalizeMediaUrl } from '../services/r2Storage.service';

const router = Router();

// Middleware: all merchant routes require authentication
router.use(requireAuth);

/**
 * Helper: Ensure a business tenant exists for the authenticated user and assign Free plan
 */
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

/**
 * GET /api/merchant/overview
 * Dashboard analytics and stats (tenant isolated)
 */
router.get('/overview', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  try {
    const { membership, business, store, settings } = await getOrCreateUserBusiness(req.user);
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
          totalProducts: activeProducts.length,
          totalCustomers: customers.length
        },
        recentOrders: orders.slice(0, 5)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load overview.' } });
  }
});

/**
 * GET /api/merchant/business
 */
router.get('/business', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  try {
    const { membership, business, store, settings } = await getOrCreateUserBusiness(req.user);
    if (business) {
      if (business.logo_url) business.logo_url = normalizeMediaUrl(business.logo_url);
      if (business.banner_url) business.banner_url = normalizeMediaUrl(business.banner_url);
    }
    if (settings && settings.banner_url) {
      settings.banner_url = normalizeMediaUrl(settings.banner_url);
    }
    return res.json({
      success: true,
      data: { business, store, settings, role: membership.role }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load business profile.' } });
  }
});

/**
 * PUT /api/merchant/business
 */
router.put('/business', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
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
      logo_url,
      banner_url
    } = req.body;

    let resolvedLogoUrl = logo_url;
    if (logo_url && typeof logo_url === 'string' && logo_url.startsWith('data:')) {
      try {
        const uploadRes = await uploadBase64ToR2({
          base64Data: logo_url,
          filename: `logo_${Date.now()}.jpg`,
          folder: 'branding',
          businessId: membership.business_id
        });
        resolvedLogoUrl = uploadRes.url;
      } catch (e) {
        console.error('R2 logo upload failed:', e);
      }
    }

    let resolvedBannerUrl = banner_url;
    if (banner_url && typeof banner_url === 'string' && banner_url.startsWith('data:')) {
      try {
        const uploadRes = await uploadBase64ToR2({
          base64Data: banner_url,
          filename: `banner_${Date.now()}.jpg`,
          folder: 'branding',
          businessId: membership.business_id
        });
        resolvedBannerUrl = uploadRes.url;
      } catch (e) {
        console.error('R2 banner upload failed:', e);
      }
    }

    if (resolvedLogoUrl) {
      resolvedLogoUrl = normalizeMediaUrl(resolvedLogoUrl);
    }
    if (resolvedBannerUrl) {
      resolvedBannerUrl = normalizeMediaUrl(resolvedBannerUrl);
    }

    const updatedBiz = await merchantRepository.updateBusiness(membership.business_id, {
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
      logo_url: resolvedLogoUrl,
      banner_url: resolvedBannerUrl
    });

    if (updatedBiz) {
      if (updatedBiz.logo_url) updatedBiz.logo_url = normalizeMediaUrl(updatedBiz.logo_url);
      if (updatedBiz.banner_url) updatedBiz.banner_url = normalizeMediaUrl(updatedBiz.banner_url);
    }

    return res.json({ success: true, data: updatedBiz });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update business.' } });
  }
});

/**
 * POST /api/merchant/onboard
 * Comprehensive onboarding submission saving all collected details
 */
router.post('/onboard', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
  }

  try {
    const { membership, business } = await getOrCreateUserBusiness(req.user);
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

    const [updatedBiz, updatedStore, updatedSettings] = await Promise.all([
      merchantRepository.updateBusiness(membership.business_id, {
        name: resolvedName,
        slug: resolvedSlug,
        phone: resolvedPhone,
        whatsapp_number: resolvedWhatsapp,
        email: req.user.email || undefined,
        state,
        city,
        address,
        description
      }),
      merchantRepository.updateStore(membership.business_id, {
        slug: resolvedSlug,
        status: 'published'
      }),
      merchantRepository.updateStoreSettings(membership.business_id, {
        enable_catalogue: true,
        enable_checkout: mode === 'checkout'
      })
    ]);

    const subscription = await subscriptionRepository.getSubscriptionByBusinessId(membership.business_id);

    return res.json({
      success: true,
      data: {
        business: updatedBiz,
        store: updatedStore,
        settings: updatedSettings,
        subscription
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Onboarding update failed.' } });
  }
});

/**
 * PUT /api/merchant/store/settings
 */
router.put('/store/settings', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const businessId = membership.business_id;

    const {
      theme,
      primary_color,
      banner_url,
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

    // Validate checkout entitlement
    if (enable_checkout) {
      const canCheckout = await entitlementService.canAsync(businessId, 'can_checkout');
      if (!canCheckout) {
        return res.status(403).json({
          success: false,
          error: { code: 'UPGRADE_REQUIRED', message: 'Online checkout is available on Starter and Business plans. Please upgrade to enable direct checkout.' }
        });
      }
    }

    let cleanPrimaryColor = primary_color;
    if (typeof cleanPrimaryColor === 'string') {
      cleanPrimaryColor = cleanPrimaryColor.trim();
      if (!cleanPrimaryColor.startsWith('#') && /^[0-9A-Fa-f]{3,8}$/.test(cleanPrimaryColor)) {
        cleanPrimaryColor = `#${cleanPrimaryColor}`;
      }
    }

    let cleanBannerUrl = banner_url;
    if (cleanBannerUrl) {
      cleanBannerUrl = normalizeMediaUrl(cleanBannerUrl);
    }

    const updatedSettings = await merchantRepository.updateStoreSettings(businessId, {
      theme,
      primary_color: cleanPrimaryColor,
      banner_url: cleanBannerUrl,
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
    });

    if (updatedSettings && updatedSettings.banner_url) {
      updatedSettings.banner_url = normalizeMediaUrl(updatedSettings.banner_url);
    }

    return res.json({ success: true, data: updatedSettings });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update store settings.' } });
  }
});

/**
 * GET /api/merchant/stories
 */
router.get('/stories', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const stories = await storyRepository.getStoriesByBusinessId(membership.business_id);
    return res.json({ success: true, data: stories });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load stories.' } });
  }
});

/**
 * PUT /api/merchant/stories
 */
router.put('/stories', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const { stories } = req.body;

    if (!Array.isArray(stories)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid stories payload. Must be an array.' } });
    }

    // Upload any base64 media across stories & slides to Cloudflare R2
    const processedStories = await Promise.all(
      stories.map(async (story: any, sIdx: number) => {
        let coverImage = story.coverImage || story.cover_image || '';
        if (coverImage && coverImage.startsWith('data:')) {
          try {
            const r2Res = await uploadBase64ToR2({
              base64Data: coverImage,
              filename: `story_cover_${sIdx}_${Date.now()}.jpg`,
              folder: 'stories',
              businessId: membership.business_id
            });
            coverImage = r2Res.url;
          } catch (e) {
            console.error('Error uploading story cover to R2:', e);
          }
        }

        let slides = story.slides || [];
        if (Array.isArray(slides)) {
          slides = await Promise.all(
            slides.map(async (slide: any, slideIdx: number) => {
              let img = slide.image || slide.imageUrl || '';
              if (img && img.startsWith('data:')) {
                try {
                  const r2Res = await uploadBase64ToR2({
                    base64Data: img,
                    filename: `slide_${sIdx}_${slideIdx}_${Date.now()}.jpg`,
                    folder: 'stories',
                    businessId: membership.business_id
                  });
                  img = r2Res.url;
                } catch (e) {
                  console.error('Error uploading slide image to R2:', e);
                }
              }
              return {
                id: slide.id || `slide_${Date.now()}_${slideIdx}`,
                title: slide.title || '',
                subtitle: slide.subtitle,
                image: img,
                tag: slide.tag,
                product_id: slide.product_id || slide.productId,
                likesCount: slide.likesCount || slide.likes || 0
              };
            })
          );
        }

        return {
          id: story.id,
          business_id: membership.business_id,
          title: story.title,
          coverImage,
          unread: story.unread ?? false,
          slides
        };
      })
    );

    const updated = await storyRepository.saveStories(membership.business_id, processedStories);
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to save stories.' } });
  }
});

/**
 * POST /api/merchant/store/publish
 */
router.post('/store/publish', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const { status } = req.body;
    const updated = await merchantRepository.updateStore(membership.business_id, {
      status: status || 'published'
    });
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update store status.' } });
  }
});

/**
 * GET /api/merchant/products
 */
router.get('/products', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const businessId = membership.business_id;
    const [categories, products] = await Promise.all([
      productRepository.getCategories(businessId),
      productRepository.getProducts(businessId)
    ]);

    const activeProducts = products
      .filter(p => p.status !== 'archived')
      .map(p => ({
        ...p,
        category: categories.find(c => c.id === p.category_id)
      }));

    return res.json({ success: true, data: activeProducts });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load products.' } });
  }
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
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const businessId = membership.business_id;

    // Check product limits based on subscription plan
    const limitCheck = await entitlementService.canAddProductAsync(businessId);
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

    const product = await productRepository.createProduct(
      {
        business_id: businessId,
        category_id: category_id || undefined,
        name,
        slug,
        description: description || '',
        price: Number(price),
        compare_at_price: compare_at_price ? Number(compare_at_price) : undefined,
        stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : 10,
        track_inventory: track_inventory !== undefined ? Boolean(track_inventory) : true,
        status: status || 'published',
        featured: Boolean(featured),
        tiktok_video_url: resolvedTikTokUrl
      },
      productImages
    );

    return res.status(201).json({ success: true, data: product });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to create product.' } });
  }
});

/**
 * PUT /api/merchant/products/:id
 */
router.put('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const product = await productRepository.getProductById(req.params.id);

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

    let productImages: ProductImage[] | undefined;
    if (Array.isArray(images)) {
      productImages = await processAndUploadProductImages(images, membership.business_id, product.id);
    } else if (Array.isArray(imageUrls)) {
      productImages = await processAndUploadProductImages(imageUrls, membership.business_id, product.id);
    } else if (imageUrl !== undefined) {
      if (imageUrl) {
        productImages = await processAndUploadProductImages([imageUrl], membership.business_id, product.id);
      } else {
        productImages = [];
      }
    }

    const updated = await productRepository.updateProduct(
      product.id,
      {
        name,
        description,
        price: price !== undefined ? Number(price) : undefined,
        compare_at_price: compare_at_price !== undefined ? (compare_at_price ? Number(compare_at_price) : undefined) : undefined,
        category_id: category_id !== undefined ? (category_id || undefined) : undefined,
        stock_quantity: stock_quantity !== undefined ? Number(stock_quantity) : undefined,
        track_inventory: track_inventory !== undefined ? Boolean(track_inventory) : undefined,
        featured: featured !== undefined ? Boolean(featured) : undefined,
        status,
        tiktok_video_url: tiktok_video_url || tiktokVideoUrl || video_url || undefined
      },
      productImages
    );

    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update product.' } });
  }
});

/**
 * DELETE /api/merchant/products/:id
 */
router.delete('/products/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const product = await productRepository.getProductById(req.params.id);

    if (!product || product.business_id !== membership.business_id) {
      return res.status(404).json({ success: false, error: { message: 'Product not found.' } });
    }

    await productRepository.deleteProduct(product.id);
    return res.json({ success: true, message: 'Product deleted.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete product.' } });
  }
});

/**
 * GET /api/merchant/categories
 */
router.get('/categories', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const categories = await productRepository.getCategories(membership.business_id);
    return res.json({ success: true, data: categories.filter(c => c.is_active) });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load categories.' } });
  }
});

/**
 * POST /api/merchant/categories
 */
router.post('/categories', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { message: 'Category name is required.' } });

    const newCat = await productRepository.createCategory({
      business_id: membership.business_id,
      name,
      description
    });

    return res.status(201).json({ success: true, data: newCat });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to create category.' } });
  }
});

/**
 * GET /api/merchant/orders
 */
router.get('/orders', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const orders = await orderRepository.getOrdersByBusinessId(membership.business_id);
    return res.json({ success: true, data: orders });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load orders.' } });
  }
});

/**
 * PATCH /api/merchant/orders/:id/status
 */
router.patch('/orders/:id/status', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const order = await orderRepository.getOrderById(req.params.id);

    if (!order || order.business_id !== membership.business_id) {
      return res.status(404).json({ success: false, error: { message: 'Order not found.' } });
    }

    const { status, payment_status } = req.body;
    const updated = await orderRepository.updateOrderStatus(order.id, status, payment_status);
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update order status.' } });
  }
});

/**
 * GET /api/merchant/customers
 */
router.get('/customers', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const customers = await orderRepository.getCustomersByBusinessId(membership.business_id);
    return res.json({ success: true, data: customers });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load customers.' } });
  }
});

/**
 * GET /api/merchant/reviews
 */
router.get('/reviews', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const reviews = await reviewRepository.getAllMerchantReviews(membership.business_id);
    const stats = reviewRepository.calculateStats(reviews);
    return res.json({
      success: true,
      data: {
        reviews,
        stats
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to load reviews.' } });
  }
});

/**
 * POST /api/merchant/reviews
 * Merchant adds manual customer review / testimonial
 */
router.post('/reviews', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
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
      is_verified,
      is_approved,
      is_featured,
      order_number
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Customer name is required.' } });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Review comment is required.' } });
    }

    const created = await reviewRepository.createReview({
      business_id: membership.business_id,
      product_id: product_id || undefined,
      product_name: product_name?.trim() || undefined,
      customer_name: customer_name.trim(),
      customer_email: customer_email?.trim() || undefined,
      customer_avatar: customer_avatar || undefined,
      location: location?.trim() || undefined,
      rating: Number(rating) || 5,
      comment: comment.trim(),
      photos: Array.isArray(photos) ? photos : [],
      is_verified: typeof is_verified === 'boolean' ? is_verified : true,
      is_approved: typeof is_approved === 'boolean' ? is_approved : true,
      is_featured: Boolean(is_featured),
      source: 'merchant_manual',
      order_number: order_number?.trim() || undefined
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to create review.' } });
  }
});

/**
 * PATCH /api/merchant/reviews/:id
 * Update review status, approval, or content
 */
router.patch('/reviews/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    const updated = await reviewRepository.updateReview(membership.business_id, req.params.id, req.body);
    return res.json({ success: true, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to update review.' } });
  }
});

/**
 * DELETE /api/merchant/reviews/:id
 */
router.delete('/reviews/:id', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false, error: { message: 'Unauthorized' } });

  try {
    const { membership } = await getOrCreateUserBusiness(req.user);
    await reviewRepository.deleteReview(membership.business_id, req.params.id);
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete review.' } });
  }
});

export default router;
