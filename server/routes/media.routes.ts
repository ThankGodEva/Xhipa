import { Router, Request, Response } from 'express';
import multer from 'multer';
import {
  uploadMediaToR2,
  uploadBase64ToR2,
  getMediaFromR2,
  deleteMediaFromR2,
  getR2Config
} from '../services/r2Storage.service';
import { db } from '../data/store';

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
 * Single file upload or base64 upload to Cloudflare R2
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const folder = (req.body.folder || 'products').toString();
    const businessId = (req.body.businessId || 'general').toString();

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
router.post('/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No files provided for upload.' }
      });
    }

    const folder = (req.body.folder || 'products').toString();
    const businessId = (req.body.businessId || 'general').toString();

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
 * GET /api/media/:folder/:businessId/:filename
 * Proxy / serve media directly from Cloudflare R2 if accessed locally
 */
router.get('/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || '';
    const key = rawKey.replace(/^\/+/, '');

    if (!key || key === 'status') {
      return res.status(404).json({ success: false, error: { message: 'File key required' } });
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
      // Pipe stream from S3/R2
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

/**
 * DELETE /api/media/*
 * Delete media from Cloudflare R2
 */
router.delete('/*', async (req: Request, res: Response) => {
  try {
    const rawKey = req.params[0] || '';
    const key = rawKey.replace(/^\/+/, '');

    if (!key) {
      return res.status(400).json({ success: false, error: { message: 'Key is required' } });
    }

    const deleted = await deleteMediaFromR2(key);
    return res.json({ success: true, deleted });
  } catch (err: any) {
    console.error('Error deleting media from Cloudflare R2:', err);
    return res.status(500).json({ success: false, error: { message: 'Failed to delete media.' } });
  }
});

export default router;
