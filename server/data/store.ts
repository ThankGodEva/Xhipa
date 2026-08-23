import {
  Affiliate,
  AffiliateClick,
  AffiliateCommission,
  AffiliatePayout,
  AffiliateReferral,
  AppNotification,
  Business,
  BusinessMember,
  Category,
  Customer,
  Order,
  Payment,
  Product,
  Store,
  StoreSettings,
  Subscription,
  SubscriptionPlan,
  UserProfile,
  StoryHighlightGroup,
  StorySlide,
  PlatformSettings,
} from '../../src/types';

export class MemoryStore {
  profiles: Map<string, UserProfile> = new Map();
  businesses: Map<string, Business> = new Map();
  businessMembers: Map<string, BusinessMember> = new Map();
  stores: Map<string, Store> = new Map();
  storeSettings: Map<string, StoreSettings> = new Map();
  categories: Map<string, Category> = new Map();
  products: Map<string, Product> = new Map();
  customers: Map<string, Customer> = new Map();
  orders: Map<string, Order> = new Map();
  payments: Map<string, Payment> = new Map();
  subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  subscriptions: Map<string, Subscription> = new Map();
  processedWebhooks: Set<string> = new Set();
  storeStories: Map<string, StoryHighlightGroup[]> = new Map();

  // Platform & Affiliate Governance Settings
  platformSettings: PlatformSettings = {
    show_affiliate_button: true,
    affiliate_program_enabled: true,
    maintenance_mode: false,
    updated_at: new Date().toISOString()
  };

  // Affiliate & Referral Program Tables
  affiliates: Map<string, Affiliate> = new Map();
  affiliateReferrals: Map<string, AffiliateReferral> = new Map();
  affiliateClicks: Map<string, AffiliateClick> = new Map();
  affiliateCommissions: Map<string, AffiliateCommission> = new Map();
  affiliatePayouts: Map<string, AffiliatePayout> = new Map();
  notifications: Map<string, AppNotification> = new Map();

  constructor() {
    this.seedDefaults();
  }

  seedDefaults() {
    // 1. Subscription Plans (including Beginner & WhatsApp Starter Plans)
    const plans: SubscriptionPlan[] = [
      {
        id: 'free',
        name: 'Free Plan',
        description: 'Ideal for hobbyists and early sellers starting out on social media.',
        price_monthly: 0,
        currency: 'NGN',
        max_products: 10,
        can_checkout: false,
        remove_branding: false,
        custom_domain: false,
        advanced_analytics: false,
        is_active: true,
        features: [
          'Up to 10 products',
          'Catalogue Mode & WhatsApp Ordering',
          'Standard Mobile-first Storefront',
          'Basic Order Tracking',
          'Platform Branding'
        ]
      },
      {
        id: 'beginner',
        name: 'Beginner Plan',
        description: 'For growing sellers who need more product catalogue capacity.',
        price_monthly: 135000, // 1,350 NGN in Kobo
        currency: 'NGN',
        max_products: 30, // Updated to 30 products
        can_checkout: false,
        remove_branding: false,
        custom_domain: false,
        advanced_analytics: false,
        is_active: true,
        features: [
          'Up to 30 products',
          'Catalogue Mode & WhatsApp Ordering',
          'Standard Mobile-first Storefront',
          'Customer Directory & Order Logs',
          'Platform Branding'
        ]
      },
      {
        id: 'whatsapp_starter',
        name: 'WhatsApp Starter Plan',
        description: 'For high-volume WhatsApp sellers needing expanded catalogue capacity.',
        price_monthly: 299999, // 2,999.99 NGN in Kobo
        currency: 'NGN',
        max_products: 100,
        can_checkout: false,
        remove_branding: false,
        custom_domain: false,
        advanced_analytics: false,
        is_active: true,
        features: [
          'Up to 100 products',
          'Catalogue Mode & WhatsApp Ordering',
          'Standard Mobile-first Storefront',
          'Customer Directory & Order Logs',
          'Platform Branding'
        ]
      },
      {
        id: 'starter',
        name: 'Starter Plan',
        description: 'For active merchants accepting automated online payments & guest checkout.',
        price_monthly: 500000, // 5,000 NGN in Kobo
        currency: 'NGN',
        max_products: 100,
        can_checkout: true,
        remove_branding: false,
        custom_domain: false,
        advanced_analytics: false,
        is_active: true,
        features: [
          'Up to 100 products',
          'Online Paystack Checkout & Guest Payments',
          'Catalogue & WhatsApp Ordering Option',
          'Customer Order History',
          'Automatic Payment Verification'
        ]
      },
      {
        id: 'business',
        name: 'Business Plan',
        description: 'For established retailers, mini-dropshippers and multi-product stores.',
        price_monthly: 1500000, // 15,000 NGN in Kobo
        currency: 'NGN',
        max_products: -1, // Unlimited
        can_checkout: true,
        remove_branding: true,
        custom_domain: true,
        advanced_analytics: true,
        is_active: true,
        features: [
          'Unlimited products',
          'Online Paystack Checkout & WhatsApp Mode',
          'Remove Platform Branding',
          'Custom Domain Support',
          'Advanced Sales & Conversion Analytics',
          'Priority WhatsApp & Email Support'
        ]
      }
    ];

    plans.forEach(p => this.subscriptionPlans.set(p.id, p));

    // 2. Demo User Profile
    const demoUserId = 'usr_demo_merchant_001';
    const adminUserId = 'usr_demo_admin_001';

    this.profiles.set(demoUserId, {
      id: demoUserId,
      email: 'merchant@chibeauty.ng',
      full_name: 'Chioma Okeke',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      is_platform_admin: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.profiles.set(adminUserId, {
      id: adminUserId,
      email: 'admin@platform.ng',
      full_name: 'Platform Administrator',
      is_platform_admin: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 3. Demo Business: "Chi Beauty & Glow" (Slug: chi-beauty)
    const bizId = 'biz_chi_beauty_001';
    this.businesses.set(bizId, {
      id: bizId,
      name: 'Chi Beauty & Glow',
      slug: 'chi-beauty',
      description: 'Handcrafted natural organic skincare, glow oils, and herbal beauty formulas.',
      logo_url: '/Xhipa.png',
      phone: '08031234567',
      whatsapp_number: '2348031234567',
      email: 'hello@chibeauty.ng',
      country: 'NG',
      currency: 'NGN',
      state: 'Lagos',
      city: 'Ikeja',
      address: '24 Allen Avenue, Ikeja, Lagos',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.businessMembers.set('bm_001', {
      id: 'bm_001',
      business_id: bizId,
      user_id: demoUserId,
      role: 'owner',
      created_at: new Date().toISOString()
    });

    this.stores.set(bizId, {
      id: 'str_chi_beauty_001',
      business_id: bizId,
      slug: 'chi-beauty',
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.storeSettings.set(bizId, {
      id: 'set_chi_beauty_001',
      business_id: bizId,
      theme: 'rose',
      primary_color: '#E11D48',
      show_logo: true,
      show_phone: true,
      show_whatsapp: true,
      show_social_links: true,
      enable_catalogue: true,
      enable_checkout: true,
      delivery_fee_type: 'flat',
      flat_delivery_fee: 150000, // 1,500 NGN
      delivery_information: 'We deliver nationwide across Nigeria via DHL and GIG Logistics. Lagos orders arrive within 24-48 hours. Interstate orders arrive in 3-4 days.',
      return_policy: 'Due to personal hygiene reasons, returns are accepted within 48 hours only if the seal is intact.',
      privacy_policy: 'We strictly protect your contact details and only use them to fulfill your orders.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.subscriptions.set(bizId, {
      id: 'sub_chi_001',
      business_id: bizId,
      plan_id: 'starter',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Categories for Chi Beauty
    const cat1Id = 'cat_skincare_001';
    const cat2Id = 'cat_oils_002';
    const cat3Id = 'cat_cleansers_003';

    this.categories.set(cat1Id, {
      id: cat1Id,
      business_id: bizId,
      name: 'Facial Serums',
      slug: 'facial-serums',
      description: 'Potent vitamin and clarifying serums for radiant skin.',
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.categories.set(cat2Id, {
      id: cat2Id,
      business_id: bizId,
      name: 'Body Glow Oils',
      slug: 'body-glow-oils',
      description: 'Nourishing cold-pressed botanical body oils.',
      sort_order: 2,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.categories.set(cat3Id, {
      id: cat3Id,
      business_id: bizId,
      name: 'Herbal Cleansers',
      slug: 'herbal-cleansers',
      description: 'Gentle pH-balanced daily facial cleansers.',
      sort_order: 3,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Products for Chi Beauty
    const p1: Product = {
      id: 'prod_001',
      business_id: bizId,
      category_id: cat1Id,
      name: '20% Vitamin C Radiance Serum (30ml)',
      slug: 'vitamin-c-radiance-serum',
      description: 'Brightens dark spots, hyperpigmentation, and gives an instant youthful glow. Formulated with pure L-ascorbic acid and hyaluronic acid.',
      price: 850000, // 8,500 NGN
      compare_at_price: 1100000, // 11,000 NGN
      stock_quantity: 45,
      track_inventory: true,
      status: 'published',
      featured: true,
      tiktok_video_url: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
      images: [
        {
          id: 'img_001',
          business_id: bizId,
          product_id: 'prod_001',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_001/img1.jpg',
          public_url: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'img_001_b',
          business_id: bizId,
          product_id: 'prod_001',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_001/img1_b.jpg',
          public_url: 'https://images.unsplash.com/photo-1608248597359-216a6955c4d0?w=600',
          sort_order: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 'img_001_c',
          business_id: bizId,
          product_id: 'prod_001',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_001/img1_c.jpg',
          public_url: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
          sort_order: 2,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const p2: Product = {
      id: 'prod_002',
      business_id: bizId,
      category_id: cat2Id,
      name: 'Organic Golden Marula Glow Body Oil (150ml)',
      slug: 'golden-marula-glow-body-oil',
      description: 'Intense 24-hour hydration with a shimmery, non-greasy glow. Infused with pure African Marula and sweet almond oil.',
      price: 1200000, // 12,000 NGN
      compare_at_price: 1450000, // 14,500 NGN
      stock_quantity: 28,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img_002',
          business_id: bizId,
          product_id: 'prod_002',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_002/img2.jpg',
          public_url: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        },
        {
          id: 'img_002_b',
          business_id: bizId,
          product_id: 'prod_002',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_002/img2_b.jpg',
          public_url: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
          sort_order: 1,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const p3: Product = {
      id: 'prod_003',
      business_id: bizId,
      category_id: cat3Id,
      name: 'Clarifying Tea Tree & Green Tea Face Cleanser (200ml)',
      slug: 'tea-tree-green-tea-cleanser',
      description: 'Unclogs pores, removes excess sebum and makeup without stripping the skin of moisture.',
      price: 650000, // 6,500 NGN
      compare_at_price: 800000,
      stock_quantity: 60,
      track_inventory: true,
      status: 'published',
      featured: false,
      images: [
        {
          id: 'img_003',
          business_id: bizId,
          product_id: 'prod_003',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_003/img3.jpg',
          public_url: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const p4: Product = {
      id: 'prod_004',
      business_id: bizId,
      category_id: cat1Id,
      name: 'Hydrating Rosewater & Niacinamide Toner (120ml)',
      slug: 'rosewater-niacinamide-toner',
      description: 'Refines texture, balances pH, and calms irritated skin. Refreshing floral scent.',
      price: 550000, // 5,500 NGN
      compare_at_price: 700000,
      stock_quantity: 12,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img_004',
          business_id: bizId,
          product_id: 'prod_004',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_004/img4.jpg',
          public_url: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const p5: Product = {
      id: 'prod_005',
      business_id: bizId,
      category_id: cat2Id,
      name: 'Shea Butter & Peppermint Lip Glaze (15ml)',
      slug: 'shea-butter-peppermint-lip-glaze',
      description: 'High-shine plumping lip balm enriched with raw unrefined Nigerian shea butter and vitamin E.',
      price: 350000, // 3,500 NGN
      compare_at_price: 450000,
      stock_quantity: 35,
      track_inventory: true,
      status: 'published',
      featured: false,
      images: [
        {
          id: 'img_005',
          business_id: bizId,
          product_id: 'prod_005',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_005/img5.jpg',
          public_url: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const p6: Product = {
      id: 'prod_006',
      business_id: bizId,
      category_id: cat1Id,
      name: 'Invisible Glow SPF 50+ Sunscreen Mist (100ml)',
      slug: 'invisible-glow-spf-50-sunscreen',
      description: 'Zero white cast, ultra-lightweight broad spectrum UV protection with aloe vera infusion.',
      price: 950000, // 9,500 NGN
      compare_at_price: 1200000,
      stock_quantity: 22,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img_006',
          business_id: bizId,
          product_id: 'prod_006',
          storage_path: 'businesses/biz_chi_beauty_001/products/prod_006/img6.jpg',
          public_url: 'https://images.unsplash.com/photo-1567928815104-b7980ee5032e?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.products.set(p1.id, p1);
    this.products.set(p2.id, p2);
    this.products.set(p3.id, p3);
    this.products.set(p4.id, p4);
    this.products.set(p5.id, p5);
    this.products.set(p6.id, p6);

    // Initial Demo Customer & Orders for Chi Beauty
    const custId = 'cust_001';
    this.customers.set(custId, {
      id: custId,
      business_id: bizId,
      name: 'Amara Nwosu',
      phone: '08129876543',
      email: 'amara@example.com',
      total_orders: 2,
      total_spent: 2900000,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });

    const ord1Id = 'ord_demo_001';
    this.orders.set(ord1Id, {
      id: ord1Id,
      business_id: bizId,
      customer_id: custId,
      order_number: 'ORD-20260815-00101',
      status: 'shipped',
      payment_status: 'paid',
      currency: 'NGN',
      subtotal: 2050000, // 20,500 NGN
      delivery_fee: 150000, // 1,500 NGN
      total: 2200000, // 22,000 NGN
      customer_name_snapshot: 'Amara Nwosu',
      customer_phone_snapshot: '08129876543',
      customer_email_snapshot: 'amara@example.com',
      delivery_address_snapshot: 'Plot 12, Lekki Phase 1, Lagos State',
      delivery_notes: 'Please call before arrival.',
      order_source: 'direct_checkout',
      items: [
        {
          id: 'item_001',
          order_id: ord1Id,
          product_id: p1.id,
          product_name_snapshot: p1.name,
          unit_price: p1.price,
          quantity: 1,
          subtotal: p1.price,
          product_image_url: p1.images[0]?.public_url,
          created_at: new Date().toISOString()
        },
        {
          id: 'item_002',
          order_id: ord1Id,
          product_id: p2.id,
          product_name_snapshot: p2.name,
          unit_price: p2.price,
          quantity: 1,
          subtotal: p2.price,
          product_image_url: p2.images[0]?.public_url,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });

    // 4. Second Demo Business: "Lagos Kicks & Streetwear" (Catalogue Mode on Beginner Plan)
    const biz2Id = 'biz_lagos_kicks_002';
    this.businesses.set(biz2Id, {
      id: biz2Id,
      name: 'Lagos Kicks & Streetwear',
      slug: 'lagos-kicks',
      description: 'Exclusive sneakers, hype footwear, vintage tees, and luxury street apparel.',
      logo_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=200',
      phone: '08023456789',
      whatsapp_number: '2348023456789',
      email: 'orders@lagoskicks.ng',
      country: 'NG',
      currency: 'NGN',
      state: 'Lagos',
      city: 'Victoria Island',
      address: 'Shop 4, Silverbird Galleria, Ahmadu Bello Way, VI, Lagos',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.stores.set(biz2Id, {
      id: 'str_lagos_kicks_002',
      business_id: biz2Id,
      slug: 'lagos-kicks',
      status: 'published',
      published_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.storeSettings.set(biz2Id, {
      id: 'set_lagos_kicks_002',
      business_id: biz2Id,
      theme: 'amber',
      primary_color: '#D97706',
      show_logo: true,
      show_phone: true,
      show_whatsapp: true,
      show_social_links: true,
      enable_catalogue: true,
      enable_checkout: false, // Catalogue only
      delivery_fee_type: 'flat',
      flat_delivery_fee: 250000, // 2,500 NGN
      delivery_information: 'Same day dispatch within Lagos Island and Mainland. Pickup available at our VI store.',
      return_policy: '7 days exchange on unworn sneakers with tags intact.',
      privacy_policy: 'Your contact details are used strictly for order confirmation.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    this.subscriptions.set(biz2Id, {
      id: 'sub_kicks_002',
      business_id: biz2Id,
      plan_id: 'beginner',
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const kickCat1 = 'cat_sneakers_001';
    this.categories.set(kickCat1, {
      id: kickCat1,
      business_id: biz2Id,
      name: 'Retro Highs',
      slug: 'retro-highs',
      description: 'Limited edition high-top basketball classics.',
      sort_order: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const kick1: Product = {
      id: 'prod_kick_001',
      business_id: biz2Id,
      category_id: kickCat1,
      name: 'Air Heritage 1 Retro OG "Shadow"',
      slug: 'air-heritage-1-retro-og-shadow',
      description: 'Premium soft tumbled leather upper with classic shadow grey overlays. 100% authentic with original box.',
      price: 6500000, // 65,000 NGN
      compare_at_price: 7800000,
      stock_quantity: 8,
      track_inventory: true,
      status: 'published',
      featured: true,
      images: [
        {
          id: 'img_kick_001',
          business_id: biz2Id,
          product_id: 'prod_kick_001',
          storage_path: 'businesses/biz_lagos_kicks_002/products/prod_kick_001/img1.jpg',
          public_url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600',
          sort_order: 0,
          created_at: new Date().toISOString()
        }
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.products.set(kick1.id, kick1);

    // 5. Seed Affiliate Program Demo Data
    const demoAffiliateId = 'aff_demo_chioma_001';
    this.affiliates.set(demoAffiliateId, {
      id: demoAffiliateId,
      user_id: demoUserId,
      affiliate_code: 'STF-CHIOMA42',
      status: 'active',
      payout_details: {
        bank_name: 'GTBank (Guaranty Trust Bank)',
        account_number: '0123456789',
        account_name: 'Chioma Okeke'
      },
      created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    });

    // Seed some initial clicks for STF-CHIOMA42
    const click1: AffiliateClick = {
      id: 'clk_001',
      affiliate_id: demoAffiliateId,
      referral_code: 'STF-CHIOMA42',
      anonymous_identifier: 'anon_hash_a1b2c3d4e5',
      landing_page: '/register',
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    };
    const click2: AffiliateClick = {
      id: 'clk_002',
      affiliate_id: demoAffiliateId,
      referral_code: 'STF-CHIOMA42',
      anonymous_identifier: 'anon_hash_f6g7h8i9j0',
      landing_page: '/register',
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    };
    const click3: AffiliateClick = {
      id: 'clk_003',
      affiliate_id: demoAffiliateId,
      referral_code: 'STF-CHIOMA42',
      anonymous_identifier: 'anon_hash_k1l2m3n4o5',
      landing_page: '/',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.affiliateClicks.set(click1.id, click1);
    this.affiliateClicks.set(click2.id, click2);
    this.affiliateClicks.set(click3.id, click3);

    // Seed referred business: Lagos Kicks
    const ref1: AffiliateReferral = {
      id: 'ref_demo_kicks_001',
      affiliate_id: demoAffiliateId,
      referred_user_id: 'usr_demo_kicks_owner',
      business_id: biz2Id,
      status: 'converted',
      fraud_status: 'normal',
      fraud_score: 0,
      attributed_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      converted_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };
    this.affiliateReferrals.set(ref1.id, ref1);

    // Commission for ref1 (Eligible because holding period >= 7 days)
    const comm1: AffiliateCommission = {
      id: 'comm_demo_001',
      affiliate_id: demoAffiliateId,
      referral_id: ref1.id,
      amount: 80000, // ₦800 NGN in kobo
      currency: 'NGN',
      status: 'eligible', // Matured past 7 days
      trigger: 'first_successful_paid_subscription',
      eligible_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };
    this.affiliateCommissions.set(comm1.id, comm1);

    // Seed another pending referral
    const ref2: AffiliateReferral = {
      id: 'ref_demo_boutique_002',
      affiliate_id: demoAffiliateId,
      referred_user_id: 'usr_demo_boutique_owner',
      business_id: 'biz_demo_boutique_003',
      status: 'signed_up',
      fraud_status: 'normal',
      fraud_score: 0,
      attributed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    };
    this.affiliateReferrals.set(ref2.id, ref2);

    // Seed in-app notification
    const notif1: AppNotification = {
      id: 'notif_demo_001',
      user_id: demoUserId,
      type: 'commission_earned',
      title: '💰 Commission Earned (₦800)',
      message: '💰 You just earned ₦800! Lagos Kicks & Streetwear upgraded to a paid Xhipa plan.',
      data: { referralId: ref1.id, amount: 80000 },
      is_read: false,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.notifications.set(notif1.id, notif1);

    // Seed default 5 stories for demo business
    this.storeStories.set(bizId, this.getDefaultStoriesForBusiness(bizId));
  }

  getDefaultStoriesForBusiness(businessId: string): StoryHighlightGroup[] {
    const products = Array.from(this.products.values()).filter(p => p.business_id === businessId);
    const p1 = products[0];
    const p2 = products[1];
    const p3 = products[2];

    return [
      {
        id: 'reviews',
        business_id: businessId,
        title: 'Reviews',
        coverImage: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=200',
        unread: true,
        slides: [
          {
            id: 'rev-1',
            title: '⭐️⭐️⭐️⭐️⭐️ "My skin is glowing!"',
            subtitle: 'Amara from Lekki: "Within 2 weeks of using the Vitamin C serum, my dark spots visibly cleared up."',
            image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
            tag: 'Customer Glow',
            product_id: p1?.id,
            product: p1
          },
          {
            id: 'rev-2',
            title: 'Pure Hydration Glow ✨',
            subtitle: 'Blessing from Abuja: "The Marula body oil is light, non-sticky and smells so divine!"',
            image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800',
            tag: 'Real Results',
            product_id: p2?.id,
            product: p2
          }
        ]
      },
      {
        id: 'unboxing',
        business_id: businessId,
        title: 'Packaging',
        coverImage: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=200',
        unread: true,
        slides: [
          {
            id: 'unbox-1',
            title: 'Eco-Luxury Packaging 🌿',
            subtitle: 'Every order is carefully bubble-wrapped with aesthetic satin ribbons & surprise samples.',
            image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800',
            tag: 'Behind The Scenes'
          },
          {
            id: 'unbox-2',
            title: 'Same Day Dispatch in Lagos 🚚',
            subtitle: 'Orders placed before 2 PM are packed and handed to dispatchers immediately.',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
            tag: 'Fast Delivery'
          }
        ]
      },
      {
        id: 'bestsellers',
        business_id: businessId,
        title: 'Top Drops',
        coverImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=200',
        unread: false,
        slides: [
          {
            id: 'best-1',
            title: 'Viral 20% Vitamin C Serum 🍊',
            subtitle: 'Formulated with L-ascorbic acid, ferulic acid & pure hyaluronic booster.',
            image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
            tag: 'Most Popular',
            product_id: p1?.id,
            product: p1
          },
          {
            id: 'best-2',
            title: 'Golden Marula Body Oil ✨',
            subtitle: 'Cold-pressed wild harvested botanical oil for silky 24hr moisture.',
            image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?w=800',
            tag: 'Trending',
            product_id: p2?.id,
            product: p2
          }
        ]
      },
      {
        id: 'routine',
        business_id: businessId,
        title: 'How To Use',
        coverImage: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200',
        unread: false,
        slides: [
          {
            id: 'rout-1',
            title: 'Step 1: Gentle Cleanser',
            subtitle: 'Wash with lukewarm water and our Tea Tree cleanser for 60 seconds.',
            image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800',
            tag: 'Morning Routine',
            product_id: p3?.id,
            product: p3
          },
          {
            id: 'rout-2',
            title: 'Step 2: 3 Drops of Radiance',
            subtitle: 'Pat gently onto damp face & neck before moisturizer and sunscreen.',
            image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=800',
            tag: 'Pro Tip',
            product_id: p1?.id,
            product: p1
          }
        ]
      },
      {
        id: 'shipping',
        business_id: businessId,
        title: 'FAQs & Delivery',
        coverImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=200',
        unread: false,
        slides: [
          {
            id: 'faq-1',
            title: 'Nationwide Delivery Timeline 📦',
            subtitle: 'Lagos: 24–48 Hours. Other States: 2–4 Business Days via DHL / GIG Logistics.',
            image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800',
            tag: 'Delivery Info'
          },
          {
            id: 'faq-2',
            title: 'Payment & Guarantees 🛡️',
            subtitle: 'Pay via Card, Bank Transfer, or request payment on dispatch confirmation.',
            image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800',
            tag: 'Safe Shopping'
          }
        ]
      }
    ];
  }

  getStoriesForBusiness(businessId: string): StoryHighlightGroup[] {
    const existing = this.storeStories.get(businessId);
    if (existing && existing.length > 0) {
      // Re-hydrate products on slides if product_id is specified
      return existing.map(group => ({
        ...group,
        slides: group.slides.map(slide => ({
          ...slide,
          product: slide.product_id ? this.products.get(slide.product_id) : slide.product
        }))
      }));
    }

    const defaultStories = this.getDefaultStoriesForBusiness(businessId);
    this.storeStories.set(businessId, defaultStories);
    return defaultStories;
  }

  setStoriesForBusiness(businessId: string, stories: StoryHighlightGroup[]): StoryHighlightGroup[] {
    const updated = stories.map(group => ({
      ...group,
      business_id: businessId,
      updated_at: new Date().toISOString(),
      slides: group.slides.map(slide => ({
        ...slide,
        product: slide.product_id ? this.products.get(slide.product_id) : slide.product
      }))
    }));

    this.storeStories.set(businessId, updated);
    return updated;
  }

  getPlatformSettings(): PlatformSettings {
    return this.platformSettings;
  }

  updatePlatformSettings(updates: Partial<PlatformSettings>): PlatformSettings {
    this.platformSettings = {
      ...this.platformSettings,
      ...updates,
      updated_at: new Date().toISOString()
    };
    return this.platformSettings;
  }

  getAllSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values());
  }

  getActiveSubscriptionPlans(): SubscriptionPlan[] {
    return Array.from(this.subscriptionPlans.values()).filter(p => p.is_active !== false);
  }

  updateSubscriptionPlan(planId: string, updates: Partial<SubscriptionPlan>): SubscriptionPlan | null {
    const plan = this.subscriptionPlans.get(planId);
    if (!plan) return null;

    const updated = {
      ...plan,
      ...updates
    };

    this.subscriptionPlans.set(planId, updated);
    return updated;
  }
}

export const db = new MemoryStore();
