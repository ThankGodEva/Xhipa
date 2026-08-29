import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  uploadMediaToR2,
  uploadBase64ToR2,
  getMediaFromR2,
  deleteMediaFromR2,
  getR2Config
} from '../services/r2Storage.service';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { mediaUploadRateLimiter } from '../middleware/rateLimiter';
import { merchantRepository } from '../repositories/merchant.repository';

const router = Router();

// Configure multer memory storage with 30MB max upload limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Allow images, videos, audio, documents
    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      file.mimetype.startsWith('audio/') ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only images, videos, audio, and PDF files are allowed.'));
    }
  }
});

/**
 * GET /api/media/status
 * Check Cloudflare R2 bucket connection status
 */
router.get('/status', (_req: Request, res: Response) => {
  const config = getR2Config();
  res.json({
    success: true,
    data: {
      provider: 'Cloudflare R2 Bucket Storage',
      isConfigured: config.isConfigured,
      bucketName: config.bucketName || 'Not configured',
      publicDomain: config.publicUrl || 'Proxy via /api/media/*',
      endpoint: config.accountId ? `https://${config.accountId}.r2.cloudflarestorage.com` : 'Not configured'
    }
  });
});

/**
 * POST /api/media/upload
 * Authenticated single file upload or base64 upload to Cloudflare R2
 * Enforces businessId derived from authenticated user's tenancy.
 */
router.post('/upload', requireAuth, mediaUploadRateLimiter, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
    if (!membership && !req.user!.is_platform_admin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Valid business membership required for media upload.' }
      });
    }
    const businessId = membership ? membership.business_id : (req.body.businessId || 'platform');
    const folder = (req.body.folder || 'products').toString();

    // 1. Handle multipart file upload
    if (req.file) {
      const result = await uploadMediaToR2({
        buffer: req.file.buffer,
        originalFilename: req.file.originalname,
        mimetype: req.file.mimetype,
        folder,
        businessId
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    }

    // 2. Handle base64 / dataUrl payload in JSON body
    if (req.body.dataUrl || req.body.base64) {
      const data = req.body.dataUrl || req.body.base64;
      const filename = req.body.filename || `upload_${Date.now()}.jpg`;

      const result = await uploadBase64ToR2({
        base64Data: data,
        filename,
        folder,
        businessId
      });

      return res.status(200).json({
        success: true,
        data: result
      });
    }

    return res.status(400).json({
      success: false,
      error: { message: 'No file or base64 data provided for upload.' }
    });
  } catch (err: any) {
    console.error('Error uploading media to Cloudflare R2:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Media upload failed.' }
    });
  }
});

/**
 * POST /api/media/upload-multiple
 * Multiple files upload to Cloudflare R2
 */
router.post('/upload-multiple', requireAuth, mediaUploadRateLimiter, upload.array('files', 10), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No files provided for upload.' }
      });
    }

    const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
    if (!membership && !req.user!.is_platform_admin) {
      return res.status(403).json({
        success: false,
        error: { message: 'Forbidden: Valid business membership required for media upload.' }
      });
    }
    const businessId = membership ? membership.business_id : (req.body.businessId || 'platform');
    const folder = (req.body.folder || 'products').toString();

    const uploadPromises = files.map(file =>
      uploadMediaToR2({
        buffer: file.buffer,
        originalFilename: file.originalname,
        mimetype: file.mimetype,
        folder,
        businessId
      })
    );

    const results = await Promise.all(uploadPromises);

    return res.status(200).json({
      success: true,
      data: results
    });
  } catch (err: any) {
    console.error('Error uploading multiple media items to Cloudflare R2:', err);
    return res.status(500).json({
      success: false,
      error: { message: err.message || 'Multiple media upload failed.' }
    });
  }
});

/**
 * DELETE /api/media/*
 * Delete media from Cloudflare R2 with tenant authorization check
 */
router.delete('/*', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rawKey = req.params[0] || '';
    if (!rawKey || rawKey.includes('//') || rawKey.includes('..') || rawKey.includes('\\')) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or missing media key.' } });
    }

    let key = rawKey.replace(/^\/+/, '');
    try {
      key = decodeURIComponent(key);
    } catch {
      // keep key
    }

    if (!key || key.includes('..') || key.includes('\\') || key.includes('//')) {
      return res.status(400).json({ success: false, error: { message: 'Invalid or missing media key.' } });
    }

    // Tenant isolation: if not admin, verify key strictly belongs to user's business
    if (!req.user!.is_platform_admin) {
      const membership = await merchantRepository.getMembershipByUserId(req.user!.id);
      if (!membership) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to delete this media file.' }
        });
      }
      const keyParts = key.split('/');
      // key format: folder/businessId/filename
      if (keyParts.length < 3 || keyParts[1] !== membership.business_id) {
        return res.status(403).json({
          success: false,
          error: { message: 'You are not authorized to delete this media file.' }
        });
      }
    }

    const deleted = await deleteMediaFromR2(key);
    return res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('Error deleting media from Cloudflare R2:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to delete media.' } });
  }
});

/**
 * GET /api/media/*
 * Proxy / serve media directly from Cloudflare R2
 */
router.get('/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || '';
    if (!rawKey || rawKey.includes('//') || rawKey.includes('..') || rawKey.includes('\\')) {
      return res.status(404).json({ success: false, error: { message: 'File not found or invalid key.' } });
    }

    let key = rawKey.replace(/^\/+/, '');
    try {
      key = decodeURIComponent(key);
    } catch {
      // keep key
    }

    if (!key || key === 'status' || key.includes('..') || key.includes('\\') || key.includes('//')) {
      return res.status(404).json({ success: false, error: { message: 'File not found or invalid key.' } });
    }

    const media = await getMediaFromR2(key);
    if (!media) {
      return res.status(404).json({ success: false, error: { message: 'Media not found in Cloudflare R2 storage.' } });
    }

    res.setHeader('Content-Type', media.mimetype);
    if (media.cacheControl) {
      res.setHeader('Cache-Control', media.cacheControl);
    }
    if (media.size) {
      res.setHeader('Content-Length', media.size);
    }

    if (media.stream) {
      return (media.stream as any).pipe(res);
    } else if (media.buffer) {
      return res.send(media.buffer);
    }

    return res.status(404).json({ success: false, error: { message: 'Empty media content' } });
  } catch (err: any) {
    console.error('Error streaming media from Cloudflare R2:', err);
    return res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve media from storage.' }
    });
  }
});

export default router;
