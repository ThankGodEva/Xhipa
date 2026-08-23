import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const ipRequestMap = new Map<string, RateLimitRecord>();

export function createRateLimiter(options: { windowMs: number; maxRequests: number; message?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    let record = ipRequestMap.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + options.windowMs
      };
      ipRequestMap.set(ip, record);
      return next();
    }

    record.count += 1;
    if (record.count > options.maxRequests) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'TOO_MANY_REQUESTS',
          message: options.message || 'Too many requests. Please try again in a few moments.'
        }
      });
    }

    next();
  };
}

export const checkoutRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30,
  message: 'Checkout rate limit reached. Please wait a moment before trying again.'
});

export const paymentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 20,
  message: 'Payment verification limit reached. Please wait a moment.'
});
