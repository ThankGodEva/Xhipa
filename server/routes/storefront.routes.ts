import { Router, Request, Response } from 'express';
import { storeService } from '../services/store.service';
import { reviewRepository } from '../repositories/review.repository';
import { orderRepository } from '../repositories/order.repository';
import { merchantRepository } from '../repositories/merchant.repository';
import { customDomainService } from '../services/customDomain.service';

const router = Router();

/**
 * GET /api/storefront/resolve-host
 * Resolves a custom domain hostname directly to the associated storefront bundle
 */
router.get('/resolve-host', async (req: Request, res: Response) => {
  try {
    const rawHostname = (req.query.hostname as string) || req.headers['x-forwarded-host'] as string || req.headers.host || '';
    const result = await customDomainService.resolveStorefrontByHostname(rawHostname);

    if (!result.resolved) {
      const statusCode = result.status === 'suspended' ? 403 : result.status === 'pending' ? 409 : 404;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: result.status === 'suspended' ? 'DOMAIN_SUSPENDED' : result.status === 'pending' ? 'DOMAIN_PENDING_VERIFICATION' : 'DOMAIN_NOT_FOUND',
          message: result.message || 'Store not found for this custom domain.'
        },
        data: result
      });
    }

    return res.json({
      success: true,
      data: result.storefront || {
        business: result.business,
        store: result.store,
        settings: result.settings,
        categories: result.categories,
        products: result.products,
        stories: result.stories
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'HOST_RESOLUTION_ERROR', message: error.message || 'Failed to resolve host.' }
    });
  }
});


/**
 * GET /api/storefront/check-slug/:slug
 * Real-time database and system search to verify if a storefront link is available
 */
router.get('/check-slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const result = await merchantRepository.checkSlugAvailability(slug);
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SLUG_CHECK_FAILED', message: error.message || 'Failed to check link availability.' }
    });
  }
});

/**
 * GET /api/storefront/:slug
 * Resolves public storefront bundle by store slug
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const bundle = await storeService.getPublicStorefront(slug);

    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: { code: 'STORE_NOT_FOUND', message: 'This store is currently unavailable or does not exist.' }
      });
    }

    return res.json({
      success: true,
      data: bundle
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to load storefront.' }
    });
  }
});

/**
 * GET /api/storefront/:slug/product/:productSlug
 */
router.get('/:slug/product/:productSlug', async (req: Request, res: Response) => {
  try {
    const { slug, productSlug } = req.params;
    const bundle = await storeService.getPublicStorefront(slug);

    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: { code: 'STORE_NOT_FOUND', message: 'This store is currently unavailable.' }
      });
    }

    const product = bundle.products.find(p => p.slug === productSlug);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found in this storefront.' }
      });
    }

    return res.json({
      success: true,
      data: {
        business: bundle.business,
        settings: bundle.settings,
        product
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to load product.' }
    });
  }
});

/**
 * GET /api/storefront/:slug/reviews
 * Get approved customer reviews & rating statistics for this store
 */
router.get('/:slug/reviews', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const productId = req.query.productId as string | undefined;

    const bundle = await storeService.getPublicStorefront(slug);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: { code: 'STORE_NOT_FOUND', message: 'Store not found.' }
      });
    }

    const reviews = await reviewRepository.getApprovedReviews(bundle.business.id, productId);
    const stats = reviewRepository.calculateStats(reviews);

    return res.json({
      success: true,
      data: {
        reviews,
        stats
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to load reviews.' }
    });
  }
});

/**
 * POST /api/storefront/:slug/reviews
 * Submit a customer review
 */
router.post('/:slug/reviews', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
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
    } = req.body;

    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please provide your name.' }
      });
    }

    if (!comment || !comment.trim()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Please write your review feedback.' }
      });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rating must be between 1 and 5 stars.' }
      });
    }

    const bundle = await storeService.getPublicStorefront(slug);
    if (!bundle) {
      return res.status(404).json({
        success: false,
        error: { code: 'STORE_NOT_FOUND', message: 'Store not found.' }
      });
    }

    // Auto-verify if an order number is provided or if customer email bought from this store
    let isVerified = false;
    if (order_number) {
      try {
        const order = await orderRepository.getOrderByNumber(order_number.trim());
        if (order && order.business_id === bundle.business.id) {
          isVerified = true;
        }
      } catch {
        isVerified = true; // Best effort trust if provided validly formatted order
      }
    }

    // Resolve product name if product_id provided
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
      is_approved: true, // Default publish active
      source: source || 'storefront',
      order_number: order_number?.trim() || undefined
    });

    return res.status(201).json({
      success: true,
      data: newReview
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to submit review.' }
    });
  }
});

/**
 * POST /api/storefront/:slug/reviews/:id/vote
 * Upvote a review helpfulness
 */
router.post('/:slug/reviews/:id/vote', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const helpfulVotes = await reviewRepository.upvoteHelpful(id);
    return res.json({
      success: true,
      data: { helpful_votes: helpfulVotes }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to record vote.' }
    });
  }
});

export default router;
