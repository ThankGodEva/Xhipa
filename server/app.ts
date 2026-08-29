import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import storefrontRoutes from './routes/storefront.routes';
import orderRoutes from './routes/order.routes';
import paymentRoutes from './routes/payment.routes';
import subscriptionRoutes from './routes/subscription.routes';
import merchantRoutes from './routes/merchant.routes';
import adminRoutes from './routes/admin.routes';
import affiliateRoutes from './routes/affiliate.routes';
import mediaRoutes from './routes/media.routes';
import authRoutes from './routes/auth.routes';

export function createApp() {
  const app = express();

  // Basic security and parsing
  app.use(cors());
  app.use(express.static(path.join(process.cwd(), 'public')));
  app.use(express.json({
    limit: '35mb',
    verify: (req: Request, _res: Response, buf: Buffer) => {
      (req as any).rawBody = buf.toString();
    }
  }));
  app.use(express.urlencoded({ extended: true, limit: '35mb' }));

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/storefront', storefrontRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/merchant', merchantRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/affiliate', affiliateRoutes);
  app.use('/api', affiliateRoutes); // For /api/admin/* affiliate management endpoints
  app.use('/api', subscriptionRoutes);

  // Catch-all for undefined /api/* routes to prevent falling through to Vite HTML
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `API route not found: ${req.method} ${req.originalUrl || req.url}`
      }
    });
  });

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, _next: any) => {
    console.error('Unhandled server error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected error occurred.'
      }
    });
  });

  return app;
}
