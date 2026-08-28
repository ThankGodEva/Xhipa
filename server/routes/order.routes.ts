import { Router, Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { checkoutRateLimiter, orderTrackingRateLimiter } from '../middleware/rateLimiter';
import { orderRepository } from '../repositories/order.repository';
import { merchantRepository } from '../repositories/merchant.repository';

const router = Router();

/**
 * POST /api/orders/checkout
 * Server-authoritative guest order placement
 */
router.post('/checkout', checkoutRateLimiter, async (req: Request, res: Response) => {
  try {
    const { storeSlug, items, customer, deliveryType, orderSource } = req.body;

    if (!storeSlug || !items || !customer || !customer.name || !customer.phone || !customer.deliveryAddress) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Please provide all required checkout fields (name, phone, delivery address, and items).' }
      });
    }

    const result = await orderService.createCheckoutOrder({
      storeSlug,
      items,
      customer,
      deliveryType,
      orderSource
    });

    return res.status(201).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: { code: 'CHECKOUT_FAILED', message: error.message || 'Failed to place order.' }
    });
  }
});

/**
 * GET /api/orders/track/:orderNumber
 * Public guest order tracking by order number
 */
router.get('/track/:orderNumber', orderTrackingRateLimiter, async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const order = await orderRepository.getOrderByNumber(orderNumber);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
      });
    }

    const [business, settings] = await Promise.all([
      merchantRepository.getBusinessById(order.business_id),
      merchantRepository.getStoreSettings(order.business_id)
    ]);

    return res.json({
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
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to track order.' }
    });
  }
});

export default router;
