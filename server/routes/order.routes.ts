import { Router, Request, Response } from 'express';
import { orderService } from '../services/order.service';
import { checkoutRateLimiter } from '../middleware/rateLimiter';
import { db } from '../data/store';

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
router.get('/track/:orderNumber', (req: Request, res: Response) => {
  const { orderNumber } = req.params;
  const order = Array.from(db.orders.values()).find(o => o.order_number === orderNumber);

  if (!order) {
    return res.status(404).json({
      success: false,
      error: { code: 'ORDER_NOT_FOUND', message: 'Order not found.' }
    });
  }

  const business = db.businesses.get(order.business_id);
  const settings = business ? db.storeSettings.get(business.id) : null;

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
});

export default router;
