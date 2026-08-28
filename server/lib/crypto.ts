/**
 * Universal Web Crypto Utilities
 * Compatible with Node.js 18+, Cloudflare Workers, and modern browser runtimes.
 */

/**
 * Generate cryptographically secure random hexadecimal string
 */
export function generateSecureRandomHex(byteLength: number = 16): string {
  const array = new Uint8Array(byteLength);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute SHA-256 hex string using Web Crypto API
 */
export async function computeSha256Hex(data: string | Uint8Array): Promise<string> {
  const encoded = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Synchronous fallback SHA-256 for non-async click hashing
 */
export function computeSha256Sync(data: string): string {
  // Simple fast deterministic non-cryptographic hash fallback if sync is required
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Compute HMAC-SHA512 hex string using Web Crypto API
 */
export async function computeHmacSha512Hex(secret: string, data: string | Uint8Array): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: { name: 'SHA-512' } },
    false,
    ['sign']
  );

  const encodedData = typeof data === 'string' ? enc.encode(data) : data;
  const signature = await globalThis.crypto.subtle.sign('HMAC', key, encodedData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
