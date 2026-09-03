/**
 * XHIPA DOMAIN & HOSTNAME UTILITIES
 * Normalization, validation, security invariants, and DNS helper logic.
 */

// Reserved platform hostnames that merchants cannot claim
export const RESERVED_PLATFORM_HOSTNAMES = new Set([
  'xhipa.com',
  'www.xhipa.com',
  'api.xhipa.com',
  'admin.xhipa.com',
  'app.xhipa.com',
  'mail.xhipa.com',
  'auth.xhipa.com',
  'pay.xhipa.com',
  'checkout.xhipa.com',
  'staging.xhipa.com',
  'dev.xhipa.com',
  'preview.xhipa.com',
  'assets.xhipa.com',
  'cdn.xhipa.com',
  'status.xhipa.com',
  'saas.xhipa.com',
  'fallback.xhipa.com',
  'storefront.ng',
  'www.storefront.ng',
  'api.storefront.ng',
  'localhost'
]);

export const RESERVED_PLATFORM_SUFFIXES = [
  '.xhipa.com',
  '.storefront.ng',
  '.pages.dev',
  '.workers.dev',
  '.run.app'
];

/**
 * Normalizes an arbitrary user-supplied or incoming hostname string.
 * Strips protocols, trailing slashes, paths, ports, query strings, fragments, and converts to lowercase.
 */
export function normalizeHostname(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') {
    return '';
  }

  let cleaned = raw.trim().toLowerCase();

  // Strip protocol if provided (e.g., https://shop.example.com -> shop.example.com)
  cleaned = cleaned.replace(/^https?:\/\//i, '');
  cleaned = cleaned.replace(/^\/\//, '');

  // Strip userinfo if present (e.g., user:pass@host)
  if (cleaned.includes('@')) {
    cleaned = cleaned.split('@').pop() || '';
  }

  // Strip paths, query strings, and hashes
  cleaned = cleaned.split('/')[0];
  cleaned = cleaned.split('?')[0];
  cleaned = cleaned.split('#')[0];

  // Strip port if present (e.g., shop.example.com:3000 -> shop.example.com)
  if (cleaned.includes(':') && !cleaned.includes(']')) {
    cleaned = cleaned.split(':')[0];
  }

  // Strip leading and trailing dots or whitespace
  cleaned = cleaned.replace(/^\.+|\.+$/g, '').trim();

  return cleaned;
}

/**
 * Validates a hostname for custom domain connection.
 */
export function validateHostname(rawHostname: string | null | undefined): {
  isValid: boolean;
  normalized: string;
  error?: string;
  isApex: boolean;
  apexGuidance?: string;
} {
  const normalized = normalizeHostname(rawHostname);

  if (!normalized) {
    return {
      isValid: false,
      normalized: '',
      error: 'Please enter a valid domain name (e.g., shop.yourbrand.com).',
      isApex: false
    };
  }

  // Check total length
  if (normalized.length > 253) {
    return {
      isValid: false,
      normalized,
      error: 'Domain name is too long (maximum 253 characters).',
      isApex: false
    };
  }

  // Check for wildcards
  if (normalized.includes('*')) {
    return {
      isValid: false,
      normalized,
      error: 'Wildcard domains (*.example.com) are not supported. Please enter a specific hostname.',
      isApex: false
    };
  }

  // Check for IP addresses (IPv4 or IPv6)
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(normalized);
  const isIpv6 = normalized.includes(':') || /^[0-9a-f:]+$/i.test(normalized);
  if (isIpv4 || isIpv6 || normalized === '127.0.0.1' || normalized === '0.0.0.0') {
    return {
      isValid: false,
      normalized,
      error: 'IP addresses cannot be used as custom domains. Please use a registered domain name.',
      isApex: false
    };
  }

  // Check for localhost
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    return {
      isValid: false,
      normalized,
      error: 'Localhost cannot be connected as a custom domain.',
      isApex: false
    };
  }

  // Check reserved platform hostnames
  if (RESERVED_PLATFORM_HOSTNAMES.has(normalized)) {
    return {
      isValid: false,
      normalized,
      error: 'This domain is a reserved Xhipa platform domain and cannot be attached.',
      isApex: false
    };
  }

  for (const suffix of RESERVED_PLATFORM_SUFFIXES) {
    if (normalized.endsWith(suffix) && normalized !== suffix.slice(1)) {
      return {
        isValid: false,
        normalized,
        error: `Hostnames ending with ${suffix} are reserved platform addresses.`,
        isApex: false
      };
    }
  }

  // Verify structure: must have at least one dot separating labels
  const labels = normalized.split('.');
  if (labels.length < 2) {
    return {
      isValid: false,
      normalized,
      error: 'Invalid domain format. Domain must include an extension (e.g., .com, .ng, .store).',
      isApex: false
    };
  }

  // Validate each label (1-63 chars, alphanumeric and hyphens, no leading/trailing hyphens)
  for (const label of labels) {
    if (!label || label.length > 63) {
      return {
        isValid: false,
        normalized,
        error: 'Each domain label must be between 1 and 63 characters long.',
        isApex: false
      };
    }

    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(label)) {
      return {
        isValid: false,
        normalized,
        error: `Domain label "${label}" contains invalid characters. Only letters, numbers, and hyphens are allowed.`,
        isApex: false
      };
    }
  }

  // Top level domain (TLD) must be at least 2 alpha characters or valid modern gTLD
  const tld = labels[labels.length - 1];
  if (!/^[a-z]{2,}$/.test(tld)) {
    return {
      isValid: false,
      normalized,
      error: 'Invalid top-level domain extension.',
      isApex: false
    };
  }

  // Determine if it is an apex domain (e.g., example.com vs shop.example.com)
  const isApex = checkIfApexDomain(labels);
  let apexGuidance: string | undefined;

  if (isApex) {
    apexGuidance = `You are connecting an apex domain (${normalized}). For standard CNAME routing, we recommend using a subdomain like shop.${normalized} or www.${normalized}. If you use the root apex domain, ensure your DNS provider supports CNAME flattening or ALIAS/ANAME records.`;
  }

  return {
    isValid: true,
    normalized,
    isApex,
    apexGuidance
  };
}

/**
 * Checks whether a series of domain labels forms an apex domain or subdomain
 */
function checkIfApexDomain(labels: string[]): boolean {
  if (labels.length === 2) {
    return true; // e.g., example.com, brand.ng
  }

  // Common second-level ccTLDs (e.g., .co.uk, .com.ng, .org.ng, .edu.ng, .net.ng)
  const twoPartTlds = new Set([
    'com.ng', 'org.ng', 'net.ng', 'gov.ng', 'edu.ng',
    'co.uk', 'org.uk', 'me.uk',
    'com.au', 'net.au', 'org.au',
    'co.za', 'org.za',
    'co.ke', 'or.ke',
    'com.gh', 'edu.gh'
  ]);

  if (labels.length === 3) {
    const lastTwo = `${labels[1]}.${labels[2]}`;
    if (twoPartTlds.has(lastTwo)) {
      return true; // e.g., mybrand.com.ng is apex
    }
  }

  return false;
}

/**
 * Checks whether a given hostname is an Xhipa internal platform domain or local development host.
 */
export function isPlatformHostname(hostname: string | null | undefined): boolean {
  const normalized = normalizeHostname(hostname);
  if (!normalized) return true;

  if (
    normalized === 'xhipa.com' ||
    normalized === 'www.xhipa.com' ||
    normalized === 'api.xhipa.com' ||
    normalized === 'admin.xhipa.com' ||
    normalized === 'staging.xhipa.com' ||
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized.endsWith('.run.app') ||
    normalized.endsWith('.pages.dev') ||
    normalized.endsWith('.workers.dev') ||
    normalized.endsWith('.localhost')
  ) {
    return true;
  }

  return false;
}

/**
 * Checks whether the current window location is running on a customer's custom domain
 */
export function isCustomDomainHost(hostname?: string): boolean {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : '');
  return !isPlatformHostname(host);
}
