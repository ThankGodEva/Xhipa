import { db } from '../data/store';
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
    // 1. Resolve Store
    const store = Array.from(db.stores.values()).find(s => s.slug === input.storeSlug && s.status === 'published');
    if (!store) {
      throw new Error('This store is currently unavailable or published.');
    }

    // 2. Resolve Business
    const business = db.businesses.get(store.business_id);
    if (!business || business.status !== 'active') {
      throw new Error('This business is currently inactive or suspended.');
    }

    // 3. Resolve Store Settings & Entitlements
    const settings = db.storeSettings.get(business.id);
    if (!settings) {
      throw new Error('Store configuration not found.');
    }

    const canCheckout = entitlementService.can(business.id, 'can_checkout');
    const isDirectCheckout = input.orderSource !== 'whatsapp';

    if (isDirectCheckout && (!settings.enable_checkout || !canCheckout)) {
      throw new Error('Online direct checkout is currently disabled for this store. Please place your order via WhatsApp.');
    }

    // 4. Validate Items & Build Authoritative Subtotal
    if (!input.items || input.items.length === 0) {
      throw new Error('Cart cannot be empty.');
    }

    let authoritativeSubtotal = 0;
    const orderItems: OrderItem[] = [];
    const generatedOrderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    for (const requestedItem of input.items) {
      if (requestedItem.quantity <= 0) {
        throw new Error('Invalid product quantity.');
      }

      const product = db.products.get(requestedItem.productId);
      if (!product || product.business_id !== business.id) {
        throw new Error(`Product not found or does not belong to this store.`);
      }

      if (product.status !== 'published') {
        throw new Error(`Product "${product.name}" is no longer available.`);
      }

      if (product.track_inventory && product.stock_quantity < requestedItem.quantity) {
        throw new Error(`Insufficient stock for "${product.name}". Only ${product.stock_quantity} available.`);
      }

      const itemSubtotal = product.price * requestedItem.quantity;
      authoritativeSubtotal += itemSubtotal;

      orderItems.push({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        order_id: generatedOrderId,
        product_id: product.id,
        product_name_snapshot: product.name,
        unit_price: product.price, // Server authoritative price
        quantity: requestedItem.quantity,
        subtotal: itemSubtotal,
        product_image_url: product.images?.[0]?.public_url || '',
        created_at: new Date().toISOString()
      });
    }

    // 5. Calculate Delivery Fee Server-Side
    let deliveryFee = 0;
    if (settings.delivery_fee_type === 'flat' && input.deliveryType !== 'pickup') {
      deliveryFee = settings.flat_delivery_fee || 0;
    }

    const authoritativeTotal = authoritativeSubtotal + deliveryFee;

    // 6. Find or Create Customer
    let customer = Array.from(db.customers.values()).find(
      c => c.business_id === business.id && c.phone === input.customer.phone
    );

    if (!customer) {
      customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        business_id: business.id,
        name: input.customer.name,
        phone: input.customer.phone,
        email: input.customer.email,
        total_orders: 1,
        total_spent: authoritativeTotal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      db.customers.set(customer.id, customer);
    } else {
      customer.total_orders = (customer.total_orders || 0) + 1;
      customer.total_spent = (customer.total_spent || 0) + authoritativeTotal;
      customer.name = input.customer.name;
      if (input.customer.email) customer.email = input.customer.email;
      customer.updated_at = new Date().toISOString();
      db.customers.set(customer.id, customer);
    }

    // 7. Create Order Record
    const order: Order = {
      id: generatedOrderId,
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
      order_source: input.orderSource || 'direct_checkout',
      items: orderItems,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.orders.set(order.id, order);

    return {
      order,
      paymentRequired: isDirectCheckout
    };
  }
}

export const orderService = new OrderService();
