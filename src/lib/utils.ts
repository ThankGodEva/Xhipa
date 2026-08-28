/**
 * Format monetary amount from minor units (Kobo) to standard currency string (NGN)
 * e.g., 250000 -> "₦2,500"
 */
export function formatCurrency(amountInKobo: number, currency = 'NGN'): string {
  const amount = (amountInKobo || 0) / 100;
  if (currency === 'NGN') {
    const hasDecimals = Math.abs(amount % 1) > 0.001;
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Convert standard unit (e.g. 2,500 NGN) to minor units (Kobo, e.g. 250000)
 */
export function toKobo(amountInNaira: number): number {
  return Math.round((amountInNaira || 0) * 100);
}

/**
 * Convert Kobo to Naira
 */
export function fromKobo(amountInKobo: number): number {
  return (amountInKobo || 0) / 100;
}

export const toNaira = fromKobo;

/**
 * Sanitize strings into valid slugs (lowercase, alphanumeric + hyphens only)
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}

/**
 * Reserved store slugs that merchants are forbidden from claiming
 */
export const RESERVED_SLUGS = [
  'admin',
  'api',
  'app',
  'auth',
  'login',
  'register',
  'signup',
  'signin',
  'dashboard',
  'settings',
  'checkout',
  'products',
  'orders',
  'pricing',
  'support',
  'help',
  'store',
  'stores',
  'cart',
  'payment',
  'paystack',
  'billing',
  'subscription',
  'terms',
  'privacy',
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase().trim());
}

/**
 * Generate human-friendly order number: ORD-YYYYMMDD-XXXXX
 */
export function generateOrderNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `ORD-${dateStr}-${randomSuffix}`;
}

/**
 * Generate properly encoded WhatsApp order message link
 */
export function generateWhatsAppOrderUrl(params: {
  phone: string;
  businessName: string;
  items: Array<{ name: string; quantity: number; unitPriceInKobo: number }>;
  totalInKobo: number;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  storeUrl?: string;
}): string {
  // Format international phone number (clean non-digits, replace leading 0 with 234 for NG)
  let cleanPhone = params.phone.replace(/[^\d+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '234' + cleanPhone.slice(1);
  } else if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('234') && cleanPhone.length === 10) {
    cleanPhone = '234' + cleanPhone;
  }

  let text = `🛍️ *NEW ORDER - ${params.businessName.toUpperCase()}*\n`;
  text += `──────────────────────\n`;
  text += `Hello! I would like to place an order from your online store:\n\n`;

  params.items.forEach((item, index) => {
    const itemTotal = formatCurrency(item.unitPriceInKobo * item.quantity);
    text += `${index + 1}. *${item.name}* × ${item.quantity} (${itemTotal})\n`;
  });

  text += `\n💰 *Total:* ${formatCurrency(params.totalInKobo)}\n`;

  if (params.customerName || params.customerPhone || params.deliveryAddress) {
    text += `\n📦 *Customer Details:*\n`;
    if (params.customerName) text += `• Name: ${params.customerName}\n`;
    if (params.customerPhone) text += `• Phone: ${params.customerPhone}\n`;
    if (params.deliveryAddress) text += `• Delivery Address: ${params.deliveryAddress}\n`;
  }

  if (params.storeUrl) {
    text += `\n🔗 *Store Link:* ${params.storeUrl}\n`;
  }

  text += `\nPlease let me know your account details or payment options to confirm this order. Thank you!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}

/**
 * Format human-readable WhatsApp checkout message
 */
export function formatWhatsAppOrderMessage(params: {
  businessName: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: Array<{ productName: string; quantity: number; unitPriceInKobo: number; subtotalInKobo: number }>;
  subtotalInKobo: number;
  deliveryFeeInKobo: number;
  totalInKobo: number;
  orderNumber: string;
  notes?: string;
}): string {
  let text = `🛍️ *NEW ORDER - #${params.orderNumber}*\n`;
  text += `*Store:* ${params.businessName}\n`;
  text += `──────────────────────\n\n`;
  text += `*Items Ordered:*\n`;

  params.items.forEach((item, idx) => {
    text += `${idx + 1}. ${item.productName} × ${item.quantity} - ${formatCurrency(item.subtotalInKobo)}\n`;
  });

  text += `\n*Subtotal:* ${formatCurrency(params.subtotalInKobo)}\n`;
  text += `*Delivery Fee:* ${params.deliveryFeeInKobo === 0 ? 'FREE / Pickup' : formatCurrency(params.deliveryFeeInKobo)}\n`;
  text += `*Total Due:* ${formatCurrency(params.totalInKobo)}\n\n`;

  text += `*Customer Details:*\n`;
  text += `• Name: ${params.customerName}\n`;
  text += `• Phone: ${params.customerPhone}\n`;
  if (params.customerAddress) {
    text += `• Delivery Address: ${params.customerAddress}\n`;
  }
  if (params.notes) {
    text += `• Delivery Note: ${params.notes}\n`;
  }

  text += `\nPlease reply with confirmation and payment/account details to fulfill this order. Thank you!`;
  return text;
}

/**
 * Format relative or standard date
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Extract TikTok video ID from a full video link or short URL
 */
export function extractTikTokVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/\/video\/(\d+)/) ||
                clean.match(/\/v\/(\d+)/) ||
                clean.match(/\/embed\/v2\/(\d+)/) ||
                clean.match(/\/embed\/(\d+)/);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Return a responsive embeddable iframe URL for TikTok videos
 */
export function getTikTokEmbedUrl(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const videoId = extractTikTokVideoId(clean);
  if (videoId) {
    return `https://www.tiktok.com/embed/v2/${videoId}`;
  }
  if (clean.includes('tiktok.com/embed/')) {
    return clean;
  }
  return null;
}

/**
 * Safely resolves an image or media URL (handling absolute URLs, R2 keys, and relative backend proxy routes)
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Already a valid data URL
  if (trimmed.startsWith('data:')) {
    return trimmed;
  }

  // If it's already a full http(s) URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    // If it points to an unconfigured placeholder domain, redirect through the media proxy
    if (trimmed.includes('media.xhipa.com') || trimmed.includes('pub-xxxx') || trimmed.includes('your-bucket')) {
      const match = trimmed.match(/(branding|products|uploads|general)\/.+/);
      if (match) return `/api/media/${match[0]}`;
    }
    return trimmed;
  }

  // If it's already a root-relative path (e.g. /api/media/...)
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // If it starts with media.xhipa.com or similar custom domain without protocol
  if (trimmed.startsWith('media.xhipa.com/')) {
    const key = trimmed.replace(/^media\.xhipa\.com\//, '');
    return `/api/media/${key}`;
  }

  // If it contains a raw .r2.dev domain without protocol
  if (trimmed.includes('.r2.dev/')) {
    const parts = trimmed.split('.r2.dev/');
    if (parts[1]) return `/api/media/${parts[1]}`;
  }

  // If it's a bare storage key like branding/..., products/..., uploads/...
  if (
    trimmed.startsWith('branding/') ||
    trimmed.startsWith('products/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('general/')
  ) {
    return `/api/media/${trimmed}`;
  }

  return trimmed;
}

/**
 * Optimizes an image file in the browser before upload (resizing large dimensions & compressing)
 */
export async function optimizeImageForUpload(
  file: File,
  maxDimension = 1920,
  quality = 0.88
): Promise<File | Blob> {
  // If not an image or is SVG / GIF (preserve animations and vector), return original
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // If file is already small (< 400KB), return as is
  if (file.size < 400 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = Math.round((height * maxDimension) / width);
                width = maxDimension;
              } else {
                width = Math.round((width * maxDimension) / height);
                height = maxDimension;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              return resolve(file);
            }

            // Fill white background for transparent PNGs converted to JPEG
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              (blob) => {
                if (blob && blob.size < file.size) {
                  const optimizedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(optimizedFile);
                } else {
                  resolve(file);
                }
              },
              'image/jpeg',
              quality
            );
          } catch {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    } catch {
      resolve(file);
    }
  });
}

