import { PublicStorefrontBundle } from '../types';

export const CHI_BEAUTY_DEMO_STORE: PublicStorefrontBundle = {
  business: {
    id: 'demo-chi-beauty-01',
    name: 'Chi Beauty & Glow',
    slug: 'chi-beauty',
    description: 'Handmade organic skincare, radiance serums, hydrating face mists, and nutrient-rich botanical oils handcrafted with care in Lagos, Nigeria.',
    phone: '+234 812 345 6789',
    whatsapp_number: '+234 812 345 6789',
    email: 'hello@chibeauty.ng',
    country: 'NG',
    currency: 'NGN',
    state: 'Lagos State',
    city: 'Lekki, Lagos',
    address: '14 Admiralty Way, Lekki Phase 1, Lagos',
    status: 'active',
    logo_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&auto=format&fit=crop&q=80',
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  store: {
    id: 'store-chi-beauty-01',
    business_id: 'demo-chi-beauty-01',
    slug: 'chi-beauty',
    status: 'published',
    published_at: new Date('2025-01-01').toISOString(),
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  settings: {
    id: 'settings-chi-beauty-01',
    business_id: 'demo-chi-beauty-01',
    theme: 'modern',
    primary_color: '#059669', // Emerald
    show_logo: true,
    show_phone: true,
    show_whatsapp: true,
    show_social_links: true,
    enable_catalogue: true,
    enable_checkout: true,
    delivery_fee_type: 'flat',
    flat_delivery_fee: 150000, // ₦1,500 in Kobo
    delivery_information: 'Express 24-48hr dispatch in Lagos; 2-4 days nationwide delivery across Nigeria.',
    return_policy: '7-day satisfaction guarantee on sealed, unopened skincare items.',
    privacy_policy: 'We treat your personal details with complete confidentiality and care.',
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  categories: [
    {
      id: 'cat-serums',
      business_id: 'demo-chi-beauty-01',
      name: 'Serums & Radiance',
      slug: 'serums-radiance',
      description: 'Concentrated active serums for visible glow and dark spot correction',
      sort_order: 1,
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cat-oils',
      business_id: 'demo-chi-beauty-01',
      name: 'Botanical Oils',
      slug: 'botanical-oils',
      description: 'Cold-pressed natural body and face oils',
      sort_order: 2,
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cat-cleansers',
      business_id: 'demo-chi-beauty-01',
      name: 'Cleansers & Toners',
      slug: 'cleansers-toners',
      description: 'pH-balanced purifying cleansers and soothing facial mists',
      sort_order: 3,
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cat-butters',
      business_id: 'demo-chi-beauty-01',
      name: 'Whipped Butters & Scrubs',
      slug: 'whipped-butters-scrubs',
      description: 'Raw shea butter soufflés and honey glow scrubs',
      sort_order: 4,
      is_active: true,
      created_at: new Date('2025-01-01').toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  products: [
    {
      id: 'prod-vit-c-serum',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-serums',
      name: '20% Vitamin C Radiance Serum',
      slug: 'vitamin-c-radiance-serum',
      description: 'Our award-winning 20% Vitamin C serum combines pure L-Ascorbic Acid with Hyaluronic Acid and Ferulic Acid to fade dark spots, brighten hyperpigmentation, and restore radiant skin elasticity.\n\n• Formulated for tropical climates\n• Fast absorbing and non-sticky\n• 30ml UV-protected dropper bottle',
      price: 850000, // ₦8,500
      compare_at_price: 1050000, // ₦10,500
      stock_quantity: 18,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img-vit-c-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-vit-c-serum',
          storage_path: 'demo/vit-c-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&auto=format&fit=crop&q=80',
          alt_text: '20% Vitamin C Radiance Serum Bottle',
          sort_order: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'img-vit-c-2',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-vit-c-serum',
          storage_path: 'demo/vit-c-2.jpg',
          public_url: 'https://images.unsplash.com/photo-1608248597359-7b3b75a133a8?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Serum dropper texture',
          sort_order: 1,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-serums',
        business_id: 'demo-chi-beauty-01',
        name: 'Serums & Radiance',
        slug: 'serums-radiance',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-02').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-marula-oil',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-oils',
      name: 'Golden Marula Body & Face Glow Oil',
      slug: 'golden-marula-body-oil',
      description: 'Cold-pressed virgin Marula and Baobab seed oil rich in Omega 6 & 9 fatty acids. Delivers intense moisture, softens rough texture, and gives your skin a luminous golden radiance all day.\n\n• 100% pure cold-pressed oil\n• Suitable for dry, normal, and combination skin\n• 100ml amber glass bottle',
      price: 1200000, // ₦12,000
      compare_at_price: 1500000, // ₦15,000
      stock_quantity: 12,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img-marula-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-marula-oil',
          storage_path: 'demo/marula-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Golden Marula Body Oil',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-oils',
        business_id: 'demo-chi-beauty-01',
        name: 'Botanical Oils',
        slug: 'botanical-oils',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-03').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-tea-tree-cleanser',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-cleansers',
      name: 'Tea Tree & Neem Purifying Cleanser',
      slug: 'tea-tree-face-cleanser',
      description: 'A gentle foaming cleanser formulated with organic Australian Tea Tree, Neem extract, and Salicylic Acid to clear pores, prevent breakouts, and control excess oil without drying out your skin barrier.\n\n• Sulfate-free and gentle\n• Balances sebum production\n• 150ml pump bottle',
      price: 650000, // ₦6,500
      stock_quantity: 24,
      track_inventory: true,
      status: 'published',
      featured: false,
      images: [
        {
          id: 'img-cleanser-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-tea-tree-cleanser',
          storage_path: 'demo/cleanser-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Tea Tree Cleanser bottle',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-cleansers',
        business_id: 'demo-chi-beauty-01',
        name: 'Cleansers & Toners',
        slug: 'cleansers-toners',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-04').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-shea-souffle',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-butters',
      name: 'Whipped Shea & Cocoa Glow Soufflé',
      slug: 'whipped-shea-cocoa-souffle',
      description: 'Triple-whipped raw unrefined Nigerian Shea butter, Cocoa butter, and sweet Almond oil whipped into a decadent cloud-like texture. Melts effortlessly into skin for 48-hour moisture lock.\n\n• Scented with warm vanilla bean\n• 100% natural, no synthetic fillers\n• 250g amber jar',
      price: 450000, // ₦4,500
      stock_quantity: 15,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img-shea-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-shea-souffle',
          storage_path: 'demo/shea-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Whipped Shea Butter jar',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-butters',
        business_id: 'demo-chi-beauty-01',
        name: 'Whipped Butters & Scrubs',
        slug: 'whipped-butters-scrubs',
        sort_order: 4,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-05').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-rosewater-mist',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-cleansers',
      name: 'Rosewater & Aloe Hydrating Glow Mist',
      slug: 'rosewater-aloe-hydrating-mist',
      description: 'Distilled organic Damask rose petals infused with soothing Aloe Vera juice and vegetable glycerin. Instant mid-day hydration boost and setting spray.\n\n• Refreshes makeup and tired skin\n• 100ml fine mist spray bottle',
      price: 380000, // ₦3,800
      stock_quantity: 30,
      track_inventory: true,
      status: 'published',
      featured: false,
      images: [
        {
          id: 'img-mist-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-rosewater-mist',
          storage_path: 'demo/mist-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Rosewater Glow Mist bottle',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-cleansers',
        business_id: 'demo-chi-beauty-01',
        name: 'Cleansers & Toners',
        slug: 'cleansers-toners',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-06').toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-turmeric-mask',
      business_id: 'demo-chi-beauty-01',
      category_id: 'cat-butters',
      name: 'Turmeric & Raw Honey Brightening Face Mask',
      slug: 'turmeric-honey-brightening-mask',
      description: 'Wild Nigerian Turmeric root blended with raw forest honey and Kaolin clay. Gently exfoliates dead skin cells, unclogs congested pores, and promotes a visible glow within 15 minutes.\n\n• Non-staining gentle formula\n• 120g jar',
      price: 520000, // ₦5,200
      stock_quantity: 9,
      track_inventory: true,
      status: 'published',
      featured: false,
      images: [
        {
          id: 'img-turmeric-1',
          business_id: 'demo-chi-beauty-01',
          product_id: 'prod-turmeric-mask',
          storage_path: 'demo/turmeric-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1567928805192-d35d641494b8?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Turmeric & Honey Mask Jar',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      category: {
        id: 'cat-butters',
        business_id: 'demo-chi-beauty-01',
        name: 'Whipped Butters & Scrubs',
        slug: 'whipped-butters-scrubs',
        sort_order: 4,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      created_at: new Date('2025-01-07').toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  stories: [
    {
      id: 'story-group-glow',
      business_id: 'demo-chi-beauty-01',
      title: '✨ Glow Guide',
      coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300',
      unread: true,
      slides: [
        {
          id: 'slide-1',
          title: 'Step 1: Cleanse Gently',
          subtitle: 'Use our Tea Tree & Neem cleanser morning and night',
          image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
          tag: 'Routine',
          likesCount: 142
        },
        {
          id: 'slide-2',
          title: 'Step 2: 20% Vitamin C',
          subtitle: '3-4 drops for all day radiance and sun defense',
          image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
          tag: 'Bestseller',
          likesCount: 285
        },
        {
          id: 'slide-3',
          title: 'Step 3: Lock with Marula Oil',
          subtitle: 'Seal in hydration for a dewy, non-greasy glow',
          image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800',
          tag: 'Moisture',
          likesCount: 198
        }
      ]
    },
    {
      id: 'story-group-reviews',
      business_id: 'demo-chi-beauty-01',
      title: '💖 Customer Love',
      coverImage: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=300',
      slides: [
        {
          id: 'slide-r1',
          title: '"My dark spots vanished!"',
          subtitle: '— Amara, verified customer from Abuja',
          image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
          tag: '5-Star Review',
          likesCount: 310
        },
        {
          id: 'slide-r2',
          title: '"Fast dispatch to Port Harcourt"',
          subtitle: '— Kemi, received order within 48 hours',
          image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800',
          tag: 'Delivery',
          likesCount: 175
        }
      ]
    }
  ],
  entitlements: {
    max_products: 100,
    can_checkout: true,
    can_remove_branding: false,
    custom_domain_allowed: false,
    advanced_analytics: true
  }
};

export const LAGOS_KICKS_DEMO_STORE: PublicStorefrontBundle = {
  business: {
    id: 'demo-lagos-kicks-01',
    name: 'Lagos Kicks & Streetwear',
    slug: 'lagos-kicks',
    description: 'Exclusive streetwear sneakers, premium kicks, vintage tees, and luxury accessories curated in Lagos.',
    phone: '+234 803 987 6543',
    whatsapp_number: '+234 803 987 6543',
    email: 'orders@lagoskicks.ng',
    country: 'NG',
    currency: 'NGN',
    state: 'Lagos State',
    city: 'Ikeja, Lagos',
    address: '22 Allen Avenue, Ikeja, Lagos',
    status: 'active',
    logo_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=300&auto=format&fit=crop&q=80',
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  store: {
    id: 'store-lagos-kicks-01',
    business_id: 'demo-lagos-kicks-01',
    slug: 'lagos-kicks',
    status: 'published',
    published_at: new Date('2025-01-01').toISOString(),
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  settings: {
    id: 'settings-lagos-kicks-01',
    business_id: 'demo-lagos-kicks-01',
    theme: 'bold',
    primary_color: '#2563EB', // Blue
    show_logo: true,
    show_phone: true,
    show_whatsapp: true,
    show_social_links: true,
    enable_catalogue: true,
    enable_checkout: false, // Catalogue / WhatsApp mode
    delivery_fee_type: 'flat',
    flat_delivery_fee: 200000, // ₦2,000 in Kobo
    delivery_information: 'Same-day courier within Lagos; 2 days interstate via GIG Logistics.',
    return_policy: 'Size exchange allowed within 48 hours if tags remain intact.',
    privacy_policy: 'Your data is secured.',
    created_at: new Date('2025-01-01').toISOString(),
    updated_at: new Date().toISOString()
  },
  categories: [
    {
      id: 'cat-sneakers',
      business_id: 'demo-lagos-kicks-01',
      name: 'Retro & Casual Sneakers',
      slug: 'sneakers',
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'cat-streetwear',
      business_id: 'demo-lagos-kicks-01',
      name: 'Graphic Streetwear Tees',
      slug: 'streetwear-tees',
      sort_order: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  products: [
    {
      id: 'prod-retro-kicks-1',
      business_id: 'demo-lagos-kicks-01',
      category_id: 'cat-sneakers',
      name: 'Air Vintage Low Retro 85 (White/Navy)',
      slug: 'air-vintage-low-retro-85',
      description: 'Premium leather finish retro low sneaker with cushioned midsole and authentic vintage tint.\n\n• Available in EU 40-45\n• Includes dust bag and replacement laces',
      price: 3500000, // ₦35,000
      compare_at_price: 4200000, // ₦42,000
      stock_quantity: 8,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img-kick-1',
          business_id: 'demo-lagos-kicks-01',
          product_id: 'prod-retro-kicks-1',
          storage_path: 'demo/kick-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Retro Low Sneaker',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'prod-street-tee-1',
      business_id: 'demo-lagos-kicks-01',
      category_id: 'cat-streetwear',
      name: 'Heavyweight Oversized Acid Wash Tee',
      slug: 'oversized-acid-wash-tee',
      description: '280 GSM luxury heavyweight combed cotton oversized tee with custom typography.\n\n• Drop shoulder relaxed fit\n• Unisex sizing S to XXL',
      price: 1650000, // ₦16,500
      stock_quantity: 20,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img-tee-1',
          business_id: 'demo-lagos-kicks-01',
          product_id: 'prod-street-tee-1',
          storage_path: 'demo/tee-1.jpg',
          public_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80',
          alt_text: 'Heavyweight Streetwear Tee',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  stories: [],
  entitlements: {
    max_products: 30,
    can_checkout: false,
    can_remove_branding: false,
    custom_domain_allowed: false,
    advanced_analytics: false
  }
};

export const DEMO_STORES_MAP: Record<string, PublicStorefrontBundle> = {
  'chi-beauty': CHI_BEAUTY_DEMO_STORE,
  'lagos-kicks': LAGOS_KICKS_DEMO_STORE
};

export function isDemoStoreSlug(slug?: string): boolean {
  if (!slug) return false;
  const clean = slug.toLowerCase().trim();
  return clean === 'chi-beauty' || clean === 'lagos-kicks';
}
