import { merchantRepository } from '../repositories/merchant.repository';
import { productRepository } from '../repositories/product.repository';
import { orderRepository } from '../repositories/order.repository';
import { entitlementService } from './entitlement.service';
import { Customer, Order, OrderItem } from '../../src/types';
import { generateOrderNumber } from '../../src/lib/utils';

export interface CheckoutInput {
  storeSlug: string;
  items: Array<{ productId: string; quantity: number }>;
  customer: {
    name: string;
    phone: string;
    email?: string;
    deliveryAddress: string;
    notes?: string;
  };
  deliveryType?: 'flat' | 'pickup' | 'free';
  orderSource?: 'direct_checkout' | 'whatsapp';
}

export class OrderService {
  /**
   * Server-authoritative order creation
   */
  async createCheckoutOrder(input: CheckoutInput): Promise<{ order: Order; paymentRequired: boolean }> {
    const cleanSlug = input.storeSlug.toLowerCase().trim();

    // 1. Resolve Business
    const business = await merchantRepository.getBusinessBySlug(cleanSlug);
    if (!business || business.status !== 'active') {
      throw new Error('This business is currently inactive or not found.');
    }

    // 2. Resolve Store
    const store = await merchantRepository.getStoreByBusinessId(business.id);
    if (!store || store.status !== 'published') {
      throw new Error('This store is currently unavailable or not published.');
    }

    // 3. Resolve Store Settings & Entitlements
    const settings = await merchantRepository.getStoreSettings(business.id);
    if (!settings) {
      throw new Error('Store configuration not found.');
    }

    const canCheckout = await entitlementService.canAsync(business.id, 'can_checkout');
    const isDirectCheckout = input.orderSource !== 'whatsapp';

    if (isDirectCheckout && (!settings.enable_checkout || !canCheckout)) {
      throw new Error('Online direct checkout is currently disabled for this store. Please place your order via WhatsApp.');
    }

    // 4. Validate Items & Build Authoritative Subtotal
    if (!input.items || input.items.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    let authoritativeSubtotal = 0;
    const validatedItems: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      productImageUrl?: string;
    }> = [];

    for (const requestedItem of input.items) {
      if (requestedItem.quantity <= 0) {
        throw new Error('Invalid product quantity.');
      }

      const product = await productRepository.getProductById(requestedItem.productId);
      if (!product || product.business_id !== business.id) {
        throw new Error('Product not found or does not belong to this store.');
      }

      if (product.status !== 'published') {
        throw new Error(`Product "${product.name}" is no longer available.`);
      }

      if (product.track_inventory && product.stock_quantity < requestedItem.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock_quantity} available.`);
      }

      const itemSubtotal = product.price * requestedItem.quantity;
      authoritativeSubtotal += itemSubtotal;

      validatedItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice: product.price, // Server authoritative price
        quantity: requestedItem.quantity,
        subtotal: itemSubtotal,
        productImageUrl: product.images?.[0]?.public_url || ''
      });
    }

    // 5. Calculate Delivery Fee Server-Side
    let deliveryFee = 0;
    if (settings.delivery_fee_type === 'flat' && input.deliveryType !== 'pickup') {
      deliveryFee = settings.flat_delivery_fee || 0;
    }

    const authoritativeTotal = authoritativeSubtotal + deliveryFee;

    // 6. Find or Create Customer
    const customer = await orderRepository.findOrCreateCustomer({
      businessId: business.id,
      name: input.customer.name,
      phone: input.customer.phone,
      email: input.customer.email,
      amountToAdd: authoritativeTotal
    });

    // 7. Create Order Record
    const order = await orderRepository.createOrder(
      {
        business_id: business.id,
        customer_id: customer.id,
        order_number: generateOrderNumber(),
        status: 'pending',
        payment_status: 'pending',
        currency: business.currency || 'NGN',
        subtotal: authoritativeSubtotal,
        delivery_fee: deliveryFee,
        total: authoritativeTotal,
        customer_name_snapshot: input.customer.name,
        customer_phone_snapshot: input.customer.phone,
        customer_email_snapshot: input.customer.email,
        delivery_address_snapshot: input.customer.deliveryAddress,
        delivery_notes: input.customer.notes,
        order_source: input.orderSource || 'direct_checkout'
      },
      validatedItems
    );

    return {
      order,
      paymentRequired: isDirectCheckout
    };
  }
}

export const orderService = new OrderService();
