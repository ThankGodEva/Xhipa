import { getRequiredSupabase } from '../lib/supabase';
import { normalizeDatabaseError } from '../lib/errors';
import { Category, Product, ProductImage, ProductStatus } from '../../src/types';

export class ProductRepository {
  /**
   * Get all categories for a business
   */
  async getCategories(businessId: string): Promise<Category[]> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return (data || []).map((c: any) => ({
        id: c.id,
        business_id: c.business_id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sort_order: c.sort_order || 0,
        is_active: c.is_active ?? true,
        created_at: c.created_at,
        updated_at: c.updated_at
      }));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Get single category by ID
   */
  async getCategoryById(categoryId: string): Promise<Category | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        business_id: data.business_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create a new category
   */
  async createCategory(categoryData: Partial<Category>): Promise<Category> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const slug = (categoryData.slug || categoryData.name || 'category')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          business_id: categoryData.business_id,
          name: categoryData.name,
          slug,
          description: categoryData.description || null,
          sort_order: categoryData.sort_order || 0,
          is_active: categoryData.is_active ?? true,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        business_id: data.business_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update category
   */
  async updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const dbUpdates: any = { updated_at: now };
      if (updates.name !== undefined) {
        dbUpdates.name = updates.name;
        dbUpdates.slug = updates.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;

      const { data, error } = await supabase
        .from('categories')
        .update(dbUpdates)
        .eq('id', categoryId)
        .select('*')
        .single();

      if (error) throw error;

      return {
        id: data.id,
        business_id: data.business_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        sort_order: data.sort_order || 0,
        is_active: data.is_active ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at
      };
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string): Promise<boolean> {
    const supabase = getRequiredSupabase();

    try {
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) throw error;
      return true;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Alias for getProductsByBusinessId
   */
  async getProducts(businessId: string, options?: any): Promise<Product[]> {
    return this.getProductsByBusinessId(businessId, options);
  }

  /**
   * Get products for a business with full relations
   */
  async getProductsByBusinessId(
    businessId: string,
    options?: {
      categoryId?: string;
      status?: ProductStatus;
      search?: string;
      limit?: number;
      offset?: number;
      includeArchived?: boolean;
    }
  ): Promise<Product[]> {
    const supabase = getRequiredSupabase();

    try {
      let query = supabase
        .from('products')
        .select('*, product_images(*), categories(*)')
        .eq('business_id', businessId);

      if (!options?.includeArchived) {
        query = query.neq('status', 'archived');
      }

      if (options?.categoryId) {
        query = query.eq('category_id', options.categoryId);
      }

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.search) {
        query = query.ilike('name', `%${options.search}%`);
      }

      query = query.order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((p: any) => this.mapProductRow(p));
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find product by ID
   */
  async getProductById(productId: string): Promise<Product | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*), categories(*)')
        .eq('id', productId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapProductRow(data);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Find product by slug within a business
   */
  async getProductBySlug(businessId: string, slug: string): Promise<Product | null> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_images(*), categories(*)')
        .eq('business_id', businessId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapProductRow(data);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Count active products for a business
   */
  async countProducts(businessId: string): Promise<number> {
    const supabase = getRequiredSupabase();

    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .neq('status', 'archived');

      if (error) throw error;
      return count || 0;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Create a product in Supabase
   */
  async createProduct(
    productData: Partial<Product>,
    images?: Array<{ storage_path: string; public_url: string; alt_text?: string; sort_order?: number }>
  ): Promise<Product> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const slug = (productData.slug || productData.name || 'product')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') + `-${Date.now().toString(36).substring(4)}`;

      const { data: createdProd, error: prodErr } = await supabase
        .from('products')
        .insert({
          business_id: productData.business_id,
          category_id: productData.category_id || null,
          name: productData.name,
          slug,
          description: productData.description || null,
          price: productData.price || 0,
          compare_at_price: productData.compare_at_price || null,
          track_inventory: productData.track_inventory ?? false,
          stock_quantity: productData.stock_quantity || 0,
          status: productData.status || 'draft',
          is_featured: productData.featured ?? false,
          tiktok_video_url: productData.tiktok_video_url || null,
          created_at: now,
          updated_at: now
        })
        .select('*')
        .single();

      if (prodErr || !createdProd) {
        throw new Error(prodErr?.message || 'Failed to insert product record');
      }

      const imagesToInsert = (images || productData.images || []).map((img, idx) => ({
        business_id: createdProd.business_id,
        product_id: createdProd.id,
        storage_path: img.storage_path || `products/${createdProd.id}/${idx}`,
        public_url: img.public_url,
        alt_text: img.alt_text || createdProd.name,
        sort_order: img.sort_order ?? idx,
        created_at: now
      }));

      if (imagesToInsert.length > 0) {
        await supabase.from('product_images').insert(imagesToInsert);
      }

      const fullProduct = await this.getProductById(createdProd.id);
      if (!fullProduct) {
        throw new Error('Failed to retrieve newly created product');
      }

      return fullProduct;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    updates: Partial<Product>,
    images?: Array<{ storage_path: string; public_url: string; alt_text?: string; sort_order?: number }>
  ): Promise<Product> {
    const now = new Date().toISOString();
    const supabase = getRequiredSupabase();

    try {
      const dbUpdates: any = { updated_at: now };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.compare_at_price !== undefined) dbUpdates.compare_at_price = updates.compare_at_price;
      if (updates.track_inventory !== undefined) dbUpdates.track_inventory = updates.track_inventory;
      if (updates.stock_quantity !== undefined) dbUpdates.stock_quantity = updates.stock_quantity;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.featured !== undefined) dbUpdates.is_featured = updates.featured;
      if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id;
      if (updates.tiktok_video_url !== undefined) dbUpdates.tiktok_video_url = updates.tiktok_video_url;

      const { data: updatedProd, error } = await supabase
        .from('products')
        .update(dbUpdates)
        .eq('id', productId)
        .select('*')
        .single();

      if (error) throw error;

      const imagesToUse = images || updates.images;
      if (imagesToUse !== undefined) {
        await supabase.from('product_images').delete().eq('product_id', productId);
        if (imagesToUse.length > 0) {
          await supabase.from('product_images').insert(
            imagesToUse.map((img, idx) => ({
              business_id: updatedProd.business_id,
              product_id: productId,
              storage_path: img.storage_path || `products/${productId}/${idx}`,
              public_url: img.public_url,
              alt_text: img.alt_text || updatedProd.name,
              sort_order: img.sort_order ?? idx,
              created_at: now
            }))
          );
        }
      }

      const full = await this.getProductById(productId);
      if (!full) throw new Error('Product not found after update');
      return full;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(productId: string): Promise<boolean> {
    const supabase = getRequiredSupabase();

    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      return true;
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Requirement 7.6: Atomically adjust product stock in PostgreSQL
   * Enforces atomic deduction via adjust_product_stock RPC without race-prone read-modify-write fallbacks.
   */
  async adjustStock(productId: string, quantityToDeduct: number): Promise<boolean> {
    const supabase = getRequiredSupabase();

    try {
      const { data, error } = await supabase.rpc('adjust_product_stock', {
        p_product_id: productId,
        p_quantity: quantityToDeduct
      });

      if (error) {
        throw error;
      }

      return Boolean(data);
    } catch (err) {
      throw normalizeDatabaseError(err);
    }
  }

  /**
   * Maps raw database product row into clean Product domain type
   */
  private mapProductRow(data: any): Product {
    const images: ProductImage[] = (data.product_images || [])
      .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((img: any) => ({
        id: img.id,
        business_id: img.business_id,
        product_id: img.product_id,
        storage_path: img.storage_path,
        public_url: img.public_url,
        alt_text: img.alt_text,
        sort_order: img.sort_order || 0,
        created_at: img.created_at
      }));

    const category = data.categories ? {
      id: data.categories.id,
      business_id: data.categories.business_id,
      name: data.categories.name,
      slug: data.categories.slug,
      description: data.categories.description,
      sort_order: data.categories.sort_order || 0,
      is_active: data.categories.is_active ?? true,
      created_at: data.categories.created_at,
      updated_at: data.categories.updated_at
    } : undefined;

    return {
      id: data.id,
      business_id: data.business_id,
      category_id: data.category_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      price: Number(data.price),
      compare_at_price: data.compare_at_price ? Number(data.compare_at_price) : undefined,
      track_inventory: Boolean(data.track_inventory),
      stock_quantity: Number(data.stock_quantity || 0),
      status: data.status as ProductStatus,
      featured: Boolean(data.is_featured ?? data.featured),
      tiktok_video_url: data.tiktok_video_url,
      images,
      category,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export const productRepository = new ProductRepository();
