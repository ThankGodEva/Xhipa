import { supabase, isSupabaseConfigured } from './supabase';

const isUUID = (val?: string | null): boolean => {
  if (!val || typeof val !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
};

export interface OnboardingSyncPayload {
  userId: string;
  fullName: string;
  email: string;
  businessName: string;
  slug: string;
  phone: string;
  whatsapp?: string;
  mode?: 'catalogue' | 'checkout';
  state?: string;
  city?: string;
  address?: string;
  description?: string;
}

/**
 * Synchronizes user profile, business entity, store, store_settings,
 * and automatic Free Plan assignment to Supabase when configured.
 */
export async function syncFullMerchantDataToSupabase(payload: OnboardingSyncPayload): Promise<void> {
  if (!isSupabaseConfigured || !isUUID(payload.userId)) return;

  try {
    const now = new Date().toISOString();

    // 1. Ensure Profile in public.profiles
    await supabase.from('profiles').upsert({
      id: payload.userId,
      full_name: payload.fullName,
      updated_at: now
    });

    // 2. Check if business member already exists
    const { data: memberData } = await supabase
      .from('business_members')
      .select('business_id')
      .eq('user_id', payload.userId)
      .maybeSingle();

    let businessId = memberData?.business_id;

    if (!businessId) {
      // Create new business with all collected details
      const { data: newBiz, error: bizErr } = await supabase
        .from('businesses')
        .insert({
          name: payload.businessName,
          slug: payload.slug,
          phone: payload.phone,
          whatsapp_number: payload.whatsapp || payload.phone,
          email: payload.email,
          description: payload.description || 'Welcome to our official store.',
          state: payload.state || null,
          city: payload.city || null,
          address: payload.address || null,
          country: 'NG',
          currency: 'NGN',
          status: 'active',
          created_at: now,
          updated_at: now
        })
        .select('id')
        .single();

      if (!bizErr && newBiz) {
        businessId = newBiz.id;

        // Create business membership as owner
        await supabase.from('business_members').insert({
          business_id: businessId,
          user_id: payload.userId,
          role: 'owner',
          created_at: now,
          updated_at: now
        });

        // Create store record
        await supabase.from('stores').insert({
          business_id: businessId,
          slug: payload.slug,
          status: 'published',
          published_at: now,
          created_at: now,
          updated_at: now
        });

        // Create store settings
        await supabase.from('store_settings').insert({
          business_id: businessId,
          theme: 'blue',
          primary_color: '#2563eb',
          show_logo: true,
          show_phone: true,
          show_whatsapp: true,
          show_social_links: true,
          enable_catalogue: true,
          enable_checkout: payload.mode === 'checkout',
          delivery_fee_type: 'flat',
          flat_delivery_fee: 150000,
          created_at: now,
          updated_at: now
        });

        // Automatically assign vendors the Free Account on account creation
        await supabase.from('subscriptions').insert({
          business_id: businessId,
          plan_id: 'free',
          status: 'active',
          created_at: now,
          updated_at: now
        });
      }
    } else {
      // Update existing business entity
      await supabase
        .from('businesses')
        .update({
          name: payload.businessName,
          slug: payload.slug,
          phone: payload.phone,
          whatsapp_number: payload.whatsapp || payload.phone,
          email: payload.email,
          state: payload.state || null,
          city: payload.city || null,
          address: payload.address || null,
          updated_at: now
        })
        .eq('id', businessId);

      await supabase
        .from('stores')
        .update({
          slug: payload.slug,
          status: 'published',
          updated_at: now
        })
        .eq('business_id', businessId);

      if (payload.mode !== undefined) {
        await supabase
          .from('store_settings')
          .update({
            enable_checkout: payload.mode === 'checkout',
            updated_at: now
          })
          .eq('business_id', businessId);
      }
    }
  } catch (e) {
    console.warn('Supabase remote sync warning (non-fatal):', e);
  }
}
