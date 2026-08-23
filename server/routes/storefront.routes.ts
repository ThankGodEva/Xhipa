import { Router, Request, Response } from 'express';
import { storeService } from '../services/store.service';
import { db } from '../data/store';

const router = Router();

/**
 * GET /api/storefront/:slug
 * Resolves public storefront bundle by store slug
 */
router.get('/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const bundle = storeService.getPublicStorefront(slug);

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
router.get('/:slug/product/:productSlug', (req: Request, res: Response) => {
  try {
    const { slug, productSlug } = req.params;
    const bundle = storeService.getPublicStorefront(slug);

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

export default router;
