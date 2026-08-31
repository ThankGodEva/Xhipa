import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { generateSecureRandomHex } from '../lib/crypto';
import { config } from '../config';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  isConfigured: boolean;
}

export interface UploadResult {
  url: string;
  key: string;
  filename: string;
  mimetype: string;
  size: number;
  storage: 'cloudflare-r2' | 'fallback-cache';
  etag?: string;
  uploadedAt: string;
}

// In-memory fallback cache for files if R2 credentials are not yet configured
const fallbackStorage = new Map<string, { buffer: Buffer; mimetype: string; originalname: string }>();

let s3ClientInstance: S3Client | null = null;
let lastConfigHash: string = '';

export function getR2Config(): R2Config {
  const accountId = (
    process.env.CLOUDFLARE_R2_ACCOUNT_ID ||
    process.env.R2_ACCOUNT_ID ||
    process.env.CF_ACCOUNT_ID ||
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.ACCOUNT_ID ||
    (config as any)?.r2AccountId ||
    ''
  ).trim();

  const accessKeyId = (
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
    process.env.R2_ACCESS_KEY_ID ||
    process.env.AWS_ACCESS_KEY_ID ||
    process.env.R2_KEY_ID ||
    process.env.CLOUDFLARE_ACCESS_KEY_ID ||
    (config as any)?.r2AccessKeyId ||
    ''
  ).trim();

  const secretAccessKey = (
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET_ACCESS_KEY ||
    process.env.AWS_SECRET_ACCESS_KEY ||
    process.env.R2_SECRET ||
    process.env.R2_SECRET_KEY ||
    process.env.CLOUDFLARE_SECRET_ACCESS_KEY ||
    (config as any)?.r2SecretAccessKey ||
    ''
  ).trim();

  const bucketName = (
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    process.env.R2_BUCKET_NAME ||
    process.env.CLOUDFLARE_BUCKET_NAME ||
    process.env.BUCKET_NAME ||
    process.env.R2_BUCKET ||
    (config as any)?.r2BucketName ||
    'xhipa-storefront-media'
  ).trim();

  const publicUrl = (
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.R2_PUBLIC_URL ||
    process.env.PUBLIC_R2_URL ||
    process.env.CLOUDFLARE_PUBLIC_URL ||
    process.env.R2_DEV_URL ||
    (config as any)?.r2PublicUrl ||
    ''
  ).trim().replace(/\/$/, '');

  const cleanAccountId = accountId.replace(/^https?:\/\//, '').replace(/\.r2\.cloudflarestorage\.com.*$/, '').trim();
  const isConfigured = Boolean(cleanAccountId && accessKeyId && secretAccessKey && bucketName);

  return {
    accountId: cleanAccountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    publicUrl,
    isConfigured
  };
}

export function getR2Client(): S3Client | null {
  const r2Config = getR2Config();
  if (!r2Config.isConfigured) {
    return null;
  }

  let endpoint = (process.env.CLOUDFLARE_R2_ENDPOINT || process.env.R2_ENDPOINT || '').trim();
  if (!endpoint && r2Config.accountId) {
    endpoint = `https://${r2Config.accountId}.r2.cloudflarestorage.com`;
  } else if (endpoint && !endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }

  const currentConfigHash = `${r2Config.accountId}:${r2Config.accessKeyId}:${r2Config.bucketName}:${endpoint}`;
  if (!s3ClientInstance || lastConfigHash !== currentConfigHash) {
    s3ClientInstance = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey
      }
    });
    lastConfigHash = currentConfigHash;
  }

  return s3ClientInstance;
}

/**
 * Clean and sanitize filename extension
 */
function getExtension(filename: string, mimetype?: string): string {
  if (filename && filename.includes('.')) {
    const ext = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext && ext.length <= 5) return ext;
  }
  if (mimetype) {
    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) return 'jpg';
    if (mimetype.includes('png')) return 'png';
    if (mimetype.includes('webp')) return 'webp';
    if (mimetype.includes('gif')) return 'gif';
    if (mimetype.includes('svg')) return 'svg';
    if (mimetype.includes('mp4')) return 'mp4';
    if (mimetype.includes('webm')) return 'webm';
    if (mimetype.includes('quicktime')) return 'mov';
  }
  return 'jpg';
}

/**
 * Upload buffer or binary stream to Cloudflare R2 bucket
 */
export async function uploadMediaToR2({
  buffer,
  originalFilename,
  mimetype = 'image/jpeg',
  folder = 'uploads',
  businessId = 'general'
}: {
  buffer: Buffer;
  originalFilename?: string;
  mimetype?: string;
  folder?: string;
  businessId?: string;
}): Promise<UploadResult> {
  const config = getR2Config();
  const client = getR2Client();

  const ext = getExtension(originalFilename || 'media.jpg', mimetype);
  const randomSuffix = generateSecureRandomHex(6);
  const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
  const safeBusiness = businessId.replace(/[^a-zA-Z0-9_-]/g, '');
  const key = `${safeFolder}/${safeBusiness}/${Date.now()}_${randomSuffix}.${ext}`;

  const cleanFilename = originalFilename
    ? originalFilename.replace(/[^a-zA-Z0-9_.-]/g, '_')
    : `media_${Date.now()}.${ext}`;

  if (client && config.isConfigured) {
    try {
      const command = new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        CacheControl: 'public, max-age=31536000, immutable',
        Metadata: {
          originalFilename: cleanFilename,
          uploadedAt: new Date().toISOString()
        }
      });

      const response = await client.send(command);

      // Determine public URL
      let publicUrl = '';
      let cleanPublicBase = (config.publicUrl || '').trim().replace(/\/$/, '');
      if (cleanPublicBase && !cleanPublicBase.startsWith('http://') && !cleanPublicBase.startsWith('https://')) {
        cleanPublicBase = `https://${cleanPublicBase}`;
      }

      if (
        cleanPublicBase &&
        !cleanPublicBase.includes('pub-xxxx') &&
        !cleanPublicBase.includes('example') &&
        !cleanPublicBase.includes('media.xhipa.com')
      ) {
        publicUrl = `${cleanPublicBase}/${key}`;
      } else {
        // Fallback to robust server proxy route
        publicUrl = `/api/media/${key}`;
      }

      // Also keep in memory cache for instant proxying
      fallbackStorage.set(key, {
        buffer,
        mimetype,
        originalname: cleanFilename
      });

      return {
        url: publicUrl,
        key,
        filename: cleanFilename,
        mimetype,
        size: buffer.length,
        storage: 'cloudflare-r2',
        etag: response.ETag?.replace(/"/g, ''),
        uploadedAt: new Date().toISOString()
      };
    } catch (err: any) {
      console.error('Failed to upload to Cloudflare R2, falling back to local proxy cache:', err);
    }
  }

  // Graceful fallback if R2 credentials aren't configured yet
  fallbackStorage.set(key, {
    buffer,
    mimetype,
    originalname: cleanFilename
  });

  return {
    url: `/api/media/${key}`,
    key,
    filename: cleanFilename,
    mimetype,
    size: buffer.length,
    storage: 'fallback-cache',
    uploadedAt: new Date().toISOString()
  };
}

/**
 * Upload base64 or Data URL to Cloudflare R2 bucket
 */
export async function uploadBase64ToR2({
  base64Data,
  filename,
  folder = 'uploads',
  businessId = 'general'
}: {
  base64Data: string;
  filename?: string;
  folder?: string;
  businessId?: string;
}): Promise<UploadResult> {
  let cleanData = base64Data;
  let mimetype = 'image/jpeg';

  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimetype = matches[1];
      cleanData = matches[2];
    } else {
      cleanData = base64Data.replace(/^data:[^;]+;base64,/, '');
    }
  }

  const buffer = Buffer.from(cleanData, 'base64');
  return uploadMediaToR2({
    buffer,
    originalFilename: filename,
    mimetype,
    folder,
    businessId
  });
}

/**
 * Retrieve file from Cloudflare R2 or fallback cache
 */
export async function getMediaFromR2(key: string): Promise<{
  buffer?: Buffer;
  stream?: any;
  mimetype: string;
  size?: number;
  cacheControl?: string;
} | null> {
  const config = getR2Config();
  const client = getR2Client();

  if (client && config.isConfigured) {
    try {
      const command = new GetObjectCommand({
        Bucket: config.bucketName,
        Key: key
      });
      const response = await client.send(command);
      return {
        stream: response.Body,
        mimetype: response.ContentType || 'application/octet-stream',
        size: response.ContentLength,
        cacheControl: response.CacheControl || 'public, max-age=31536000'
      };
    } catch (err: any) {
      if (err.name !== 'NoSuchKey' && err.$metadata?.httpStatusCode !== 404) {
        console.error('Error fetching from Cloudflare R2:', err);
      }
    }
  }

  // Check in-memory fallback storage
  const cached = fallbackStorage.get(key);
  if (cached) {
    return {
      buffer: cached.buffer,
      mimetype: cached.mimetype,
      size: cached.buffer.length,
      cacheControl: 'public, max-age=86400'
    };
  }

  return null;
}

/**
 * Delete a media object from Cloudflare R2
 */
export async function deleteMediaFromR2(key: string): Promise<boolean> {
  const config = getR2Config();
  const client = getR2Client();

  fallbackStorage.delete(key);

  if (client && config.isConfigured) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: config.bucketName,
        Key: key
      });
      await client.send(command);
      return true;
    } catch (err) {
      console.error('Error deleting from Cloudflare R2:', err);
      return false;
    }
  }

  return true;
}

/**
 * Normalizes any stored media URL (resolving custom domains, bare keys, and relative proxy routes)
 */
export function normalizeMediaUrl(url?: string | null): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:')) return trimmed;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (
      trimmed.includes('media.xhipa.com') ||
      trimmed.includes('pub-') ||
      trimmed.includes('your-bucket') ||
      trimmed.includes('.r2.dev') ||
      trimmed.includes('.r2.cloudflarestorage.com')
    ) {
      const match = trimmed.match(/(branding|products|uploads|general|logos|banners|stories|merchants)\/.+/);
      if (match) return `/api/media/${match[0]}`;
    }
    return trimmed;
  }

  if (trimmed.startsWith('/')) return trimmed;

  if (trimmed.startsWith('media.xhipa.com/')) {
    const key = trimmed.replace(/^media\.xhipa\.com\//, '');
    return `/api/media/${key}`;
  }

  if (trimmed.includes('.r2.dev/')) {
    const parts = trimmed.split('.r2.dev/');
    if (parts[1]) return `/api/media/${parts[1]}`;
  }

  if (
    trimmed.startsWith('branding/') ||
    trimmed.startsWith('products/') ||
    trimmed.startsWith('uploads/') ||
    trimmed.startsWith('general/') ||
    trimmed.startsWith('logos/') ||
    trimmed.startsWith('banners/') ||
    trimmed.startsWith('stories/') ||
    trimmed.startsWith('merchants/')
  ) {
    return `/api/media/${trimmed}`;
  }

  return trimmed;
}

