import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Customer, Order, OrderItem, OrderStatus, PaymentStatus } from '../../src/types';

export class OrderRepository {
  /**
   * Find or create a customer record in PostgreSQL
   */
  async findOrCreateCustomer(params: {
    businessId: string;
    name: string;
    phone: string;
    email?: string;
    amountToAdd?: number;
  }): Promise<Customer> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const { data: existingCustomer, error: findErr } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', params.businessId)
        .eq('phone', params.phone)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existingCustomer) {
        const updatedOrders = (existingCustomer.total_orders || 0) + 1;
        const updatedSpent = (existingCustomer.total_spent || 0) + (params.amountToAdd || 0);

        const { data: updated, error: updateErr } = await supabase
          .from('customers')
          .update({
            name: params.name,
            email: params.email || existingCustomer.email,
            total_orders: updatedOrders,
            total_spent: updatedSpent,
            updated_at: now
          })
          .eq('id', existingCustomer.id)
          .select('*')
          .single();

        if (updateErr) throw updateErr;
        return updated as Customer;
      } else {
        const { data: created, error: insertErr } = await supabase
          .from('customers')
          .insert({
            business_id: params.businessId,
            name: params.name,
            phone: params.phone,
            email: params.email || null,
            total_orders: 1,
            total_spent: params.amountToAdd || 0,
            created_at: now,
            updated_at: now
          })
          .select('*')
          .single();

        if (insertErr) throw insertErr;
        return created as Customer;
      }
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get all customers for a business
   */
  async getCustomersByBusinessId(businessId: string): Promise<Customer[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Customer[];
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create an order with order items in PostgreSQL
   */
  async createOrder(
    orderData: Partial<Order>,
    items: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      subtotal: number;
      productImageUrl?: string;
    }>
  ): Promise<Order> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const { data: createdOrder, error: orderErr } = await supabase
        .from('orders')
        .insert({
          business_id: orderData.business_id,
          customer_id: orderData.customer_id || null,
          order_number: orderData.order_number,
          status: orderData.status || 'pending',
          payment_status: orderData.payment_status || 'pending',
          currency: orderData.currency || 'NGN',
          subtotal: orderData.subtotal,
          delivery_fee: orderData.delivery_fee || 0,
          total: orderData.total,
          customer_name_snapshot: orderData.customer_name_snapshot,
          customer_phone_snapshot: orderData.customer_phone_snapshot,
          customer_email_snapshot: orderData.customer_email_snapshot || null,
          delivery_address_snapshot: orderData.delivery_address_snapshot,
          delivery_notes: orderData.delivery_notes || null,
          order_source: orderData.order_source || 'direct_checkout',
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (orderErr || !createdOrder) {
        throw new Error(orderErr?.message || 'Failed to insert order record');
      }

      const itemsToInsert = items.map(item => ({
        order_id: createdOrder.id,
        business_id: createdOrder.business_id,
        product_id: item.productId,
        product_name_snapshot: item.productName,
        product_image_url: item.productImageUrl || null,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        subtotal: item.subtotal,
        created_at: now
      }));

      if (itemsToInsert.length > 0) {
        const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert);
        if (itemsErr) throw itemsErr;
      }

      const fullOrder = await this.getOrderById(createdOrder.id);
      if (!fullOrder) throw new Error('Failed to retrieve newly created order');
      return fullOrder;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find order by ID with all related order items
   */
  async getOrderById(orderId: string): Promise<Order | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), customers(*)')
        .eq('id', orderId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapOrderRow(data);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find order by order number (optionally scoping by businessId)
   */
  async getOrderByNumber(arg1: string, arg2?: string): Promise<Order | null> {
    const supabase = getRequiredSupabase();
    const businessId = arg2 ? arg1 : undefined;
    const orderNumber = arg2 ? arg2 : arg1;

    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*), customers(*)')
        .eq('order_number', orderNumber);

      if (businessId) {
        query = query.eq('business_id', businessId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapOrderRow(data);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get orders for a business with optional filtering
   */
  async getOrdersByBusinessId(
    businessId: string,
    options?: {
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      limit?: number;
      offset?: number;
    }
  ): Promise<Order[]> {
    const supabase = getRequiredSupabase();

    try {
      let query = supabase
        .from('orders')
        .select('*, order_items(*), customers(*)')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.paymentStatus) {
        query = query.eq('payment_status', options.paymentStatus);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((o: any) => this.mapOrderRow(o));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get customer order history
   */
  async getOrdersByCustomerId(customerId: string): Promise<Order[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((o: any) => this.mapOrderRow(o));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update order status and optionally payment status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus, paymentStatus?: PaymentStatus): Promise<Order> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const updates: any = { status, updated_at: now };
      if (paymentStatus) {
        updates.payment_status = paymentStatus;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select('*')
        .single();

      if (error) throw error;

      const fullOrder = await this.getOrderById(orderId);
      if (!fullOrder) throw new Error('Order not found after status update');
      return fullOrder;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update order payment status
   */
  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, status?: OrderStatus): Promise<Order> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const updates: any = { payment_status: paymentStatus, updated_at: now };
      if (status) {
        updates.status = status;
      }

      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select('*')
        .single();

      if (error) throw error;

      const fullOrder = await this.getOrderById(orderId);
      if (!fullOrder) throw new Error('Order not found after payment update');
      return fullOrder;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Calculate merchant metrics from PostgreSQL
   */
  async getMetricsByBusinessId(businessId: string): Promise<{
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  }> {
    const supabase = getRequiredSupabase();

    try {
      const [
        { data: orders, error: ordErr },
        { count: customerCount, error: custErr }
      ] = await Promise.all([
        supabase.from('orders').select('status, payment_status, total').eq('business_id', businessId),
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('business_id', businessId)
      ]);

      if (ordErr) throw ordErr;
      if (custErr) throw custErr;

      const ordList = orders || [];
      const paidOrders = ordList.filter(o => o.payment_status === 'paid');
      const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const totalOrders = ordList.length;
      const pendingOrders = ordList.filter(o => o.status === 'pending').length;
      const completedOrders = ordList.filter(o => o.status === 'completed' || o.status === 'delivered').length;
      const totalCustomers = customerCount || 0;
      const averageOrderValue = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;

      return {
        totalRevenue,
        totalOrders,
        pendingOrders,
        completedOrders,
        totalCustomers,
        averageOrderValue
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Retrieve recent order activities for merchant dashboard
   */
  async getRecentActivities(businessId: string): Promise<Array<{
    id: string;
    type: 'order_placed' | 'order_paid' | 'order_fulfilled';
    title: string;
    description: string;
    time: string;
    amount?: number;
  }>> {
    const supabase = getRequiredSupabase();

    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return (orders || []).map((o: any) => {
        let type: 'order_placed' | 'order_paid' | 'order_fulfilled' = 'order_placed';
        let title = `Order #${o.order_number} Placed`;
        let description = `${o.customer_name_snapshot} placed an order for ₦${(Number(o.total) / 100).toLocaleString()}`;

        if (o.payment_status === 'paid') {
          type = 'order_paid';
          title = `Order #${o.order_number} Paid`;
          description = `Payment of ₦${(Number(o.total) / 100).toLocaleString()} confirmed from ${o.customer_name_snapshot}`;
        }

        return {
          id: o.id,
          type,
          title,
          description,
          time: o.created_at,
          amount: Number(o.total)
        };
      });
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Helper to transform database order row into domain Order type
   */
  private mapOrderRow(data: any): Order {
    const items: OrderItem[] = (data.order_items || []).map((i: any) => ({
      id: i.id,
      order_id: i.order_id,
      product_id: i.product_id,
      product_name_snapshot: i.product_name_snapshot,
      product_image_url: i.product_image_url,
      unit_price: Number(i.unit_price),
      quantity: Number(i.quantity),
      subtotal: Number(i.subtotal),
      created_at: i.created_at
    }));

    return {
      id: data.id,
      business_id: data.business_id,
      customer_id: data.customer_id,
      order_number: data.order_number,
      status: data.status as OrderStatus,
      payment_status: data.payment_status as PaymentStatus,
      currency: data.currency,
      subtotal: Number(data.subtotal),
      delivery_fee: Number(data.delivery_fee || 0),
      total: Number(data.total),
      customer_name_snapshot: data.customer_name_snapshot,
      customer_phone_snapshot: data.customer_phone_snapshot,
      customer_email_snapshot: data.customer_email_snapshot,
      delivery_address_snapshot: data.delivery_address_snapshot,
      delivery_notes: data.delivery_notes,
      order_source: data.order_source,
      items,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export const orderRepository = new OrderRepository();
