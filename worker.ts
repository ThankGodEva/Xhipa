/**
 * XHIPA CLOUDFLARE WORKER PRODUCTION ENTRYPOINT
 *
 * Fully stateless, serverless HTTP handler running on Cloudflare Workers edge runtime.
 * Integrates directly with:
 *  - Cloudflare R2 (native R2Bucket binding)
 *  - Supabase PostgreSQL (via HTTP REST / PostgREST)
 *  - Paystack Payments (Web Crypto HMAC SHA512)
 */

import { generateSecureRandomHex, timingSafeEqualStrings, computeHmacSha512Hex } from './server/lib/crypto';
import { createClient } from '@supabase/supabase-js';

export interface R2HttpMetadata {
  contentType?: string;
  cacheControl?: string;
}

export interface R2Object {
  key: string;
  httpEtag: string;
  size: number;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
}

export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: { httpMetadata?: R2HttpMetadata; customMetadata?: Record<string, string> }): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
}

export interface Fetcher {
  fetch(input: RequestInfo | URL | string, init?: RequestInit): Promise<Response>;
}

export interface Env {
  ENVIRONMENT?: string;
  APP_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_PUBLIC_KEY?: string;
  R2_BUCKET?: R2Bucket;
  R2_PUBLIC_URL?: string;
  ASSETS?: Fetcher;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

function jsonResponse(body: any, status: number = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, cf-connecting-ip',
      ...headers
    }
  });
}

function handleCorsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, cf-connecting-ip',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // 1. Handle CORS Preflight
    if (method === 'OPTIONS') {
      return handleCorsOptions();
    }

    // 2. Health & Status
    if (url.pathname === '/api/health' || url.pathname === '/health') {
      return jsonResponse({
        status: 'healthy',
        runtime: 'Cloudflare Workers (Edge V8)',
        timestamp: new Date().toISOString(),
        r2_configured: Boolean(env.R2_BUCKET),
        supabase_configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
        paystack_configured: Boolean(env.PAYSTACK_SECRET_KEY),
        assets_configured: Boolean(env.ASSETS)
      });
    }

    // 3. Media Status
    if (url.pathname === '/api/media/status' && method === 'GET') {
      return jsonResponse({
        success: true,
        data: {
          provider: 'Cloudflare R2 Native Edge Binding',
          isConfigured: Boolean(env.R2_BUCKET),
          bucketName: 'xhipa-storefront-media',
          runtime: 'Cloudflare Worker Native API'
        }
      });
    }

    // 4. Cloudflare R2 Media Proxy / Streaming (GET /api/media/*)
    if (url.pathname.startsWith('/api/media/') && method === 'GET') {
      const rawKey = url.pathname.replace('/api/media/', '');
      if (!rawKey || rawKey.includes('//') || rawKey.includes('..') || rawKey.includes('\\')) {
        return jsonResponse({ success: false, error: { message: 'Invalid or missing media key.' } }, 404);
      }

      let key = rawKey.replace(/^\/+/, '');
      try {
        key = decodeURIComponent(key);
      } catch {
        // use key
      }

      if (!key || key.includes('..') || key.includes('\\') || key.includes('//')) {
        return jsonResponse({ success: false, error: { message: 'Invalid or missing media key.' } }, 404);
      }

      if (env.R2_BUCKET) {
        try {
          const object = await env.R2_BUCKET.get(key);
          if (!object) {
            return jsonResponse({ success: false, error: { message: 'Media not found in R2 bucket.' } }, 404);
          }

          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
          headers.set('Access-Control-Allow-Origin', '*');

          return new Response(object.body, { headers });
        } catch (err: any) {
          return jsonResponse({ success: false, error: { message: err.message || 'R2 read error' } }, 500);
        }
      }

      return jsonResponse({ success: false, error: { message: 'R2 bucket binding not configured in Worker' } }, 503);
    }

    // 5. Cloudflare R2 Media Upload (POST /api/media/upload) using Native FormData / ArrayBuffer
    if (url.pathname === '/api/media/upload' && method === 'POST') {
      const authHeader = request.headers.get('Authorization') || '';
      if (!authHeader.startsWith('Bearer ')) {
        return jsonResponse({ success: false, error: { message: 'Unauthorized' } }, 401);
      }

      const token = authHeader.split(' ')[1]?.trim();
      if (!token || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
        return jsonResponse({ success: false, error: { message: 'Invalid session or missing configuration' } }, 401);
      }

      const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
      const { data: authData, error: authErr } = await supabase.auth.getUser(token);
      if (authErr || !authData?.user) {
        return jsonResponse({ success: false, error: { message: 'Invalid or expired session token' } }, 401);
      }

      const userId = authData.user.id;
      const { data: members, error: memberErr } = await supabase
        .from('business_members')
        .select('business_id, role')
        .eq('user_id', userId);

      if (memberErr || !members || members.length === 0 || !members[0]?.business_id) {
        return jsonResponse({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Forbidden: Valid tenant business membership required for media upload.'
          }
        }, 403);
      }

      const businessId = members[0].business_id;

      const contentType = request.headers.get('content-type') || '';

      if (contentType.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = ((formData.get('folder') as string) || 'products').replace(/[^a-zA-Z0-9_-]/g, '');

        if (!file) {
          return jsonResponse({ success: false, error: { message: 'No file provided in form-data' } }, 400);
        }

        const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
        const randomSuffix = generateSecureRandomHex(6);
        const key = `${folder}/${businessId}/${Date.now()}_${randomSuffix}.${ext}`;

        if (env.R2_BUCKET) {
          const arrayBuffer = await file.arrayBuffer();
          await env.R2_BUCKET.put(key, arrayBuffer, {
            httpMetadata: {
              contentType: file.type || 'image/jpeg',
              cacheControl: 'public, max-age=31536000, immutable'
            },
            customMetadata: {
              originalFilename: file.name,
              uploadedAt: new Date().toISOString()
            }
          });

          const publicUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `/api/media/${key}`;

          return jsonResponse({
            success: true,
            data: {
              url: publicUrl,
              key,
              filename: file.name,
              mimetype: file.type,
              size: file.size,
              storage: 'cloudflare-r2',
              uploadedAt: new Date().toISOString()
            }
          });
        }
      }

      // Handle JSON base64 upload
      if (contentType.includes('application/json')) {
        const body = await request.json() as any;
        const dataUrl = body.dataUrl || body.base64;
        const filename = body.filename || `upload_${Date.now()}.jpg`;
        const folder = (body.folder || 'products').toString().replace(/[^a-zA-Z0-9_-]/g, '');

        if (!dataUrl) {
          return jsonResponse({ success: false, error: { message: 'No base64 data provided' } }, 400);
        }

        let cleanData = dataUrl;
        let mimetype = 'image/jpeg';
        if (dataUrl.startsWith('data:')) {
          const matches = dataUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            mimetype = matches[1];
            cleanData = matches[2];
          } else {
            cleanData = dataUrl.replace(/^data:[^;]+;base64,/, '');
          }
        }

        const binaryStr = atob(cleanData);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }

        const ext = filename.includes('.') ? filename.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
        const randomSuffix = generateSecureRandomHex(6);
        const key = `${folder}/${businessId}/${Date.now()}_${randomSuffix}.${ext}`;

        if (env.R2_BUCKET) {
          await env.R2_BUCKET.put(key, bytes.buffer, {
            httpMetadata: {
              contentType: mimetype,
              cacheControl: 'public, max-age=31536000, immutable'
            }
          });

          const publicUrl = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${key}` : `/api/media/${key}`;

          return jsonResponse({
            success: true,
            data: {
              url: publicUrl,
              key,
              filename,
              mimetype,
              size: bytes.length,
              storage: 'cloudflare-r2',
              uploadedAt: new Date().toISOString()
            }
          });
        }
      }

      return jsonResponse({ success: false, error: { message: 'Unsupported upload format or missing R2 binding' } }, 400);
    }

    // 6. Paystack Webhook Handler (POST /api/payments/webhook) with Web Crypto HMAC SHA512
    if (url.pathname === '/api/payments/webhook' && method === 'POST') {
      const signatureHeader = request.headers.get('x-paystack-signature') || '';
      if (!signatureHeader || !env.PAYSTACK_SECRET_KEY) {
        return jsonResponse({ success: false, error: 'Unauthorized webhook' }, 401);
      }

      const rawBody = await request.text();
      const computedHash = await computeHmacSha512Hex(env.PAYSTACK_SECRET_KEY, rawBody);

      if (!timingSafeEqualStrings(computedHash, signatureHeader)) {
        return jsonResponse({ success: false, error: 'Invalid signature' }, 401);
      }

      const payload = JSON.parse(rawBody);
      const event = payload.event;
      const eventData = payload.data || {};
      const reference = eventData.reference;

      if (!reference) {
        return jsonResponse({ success: true, message: 'Event ignored - no reference' });
      }

      if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        // Record in processed_webhooks for idempotency
        const eventId = `webhook_${payload.id || reference}_${event}`;
        const { error: insertErr } = await supabase
          .from('processed_webhooks')
          .insert({
            event_id: eventId,
            event_type: event,
            provider: 'paystack',
            payload
          });

        if (insertErr && insertErr.code === '23505') {
          return jsonResponse({ success: true, message: 'Event already processed' });
        }

        if (event === 'charge.success') {
          if (reference.startsWith('PSTK_')) {
            // Settle order atomically via PostgreSQL RPC
            await supabase.rpc('settle_verified_order_payment', {
              p_provider_reference: reference
            });
          } else if (reference.startsWith('XHIPA_SUB_')) {
            const planId = eventData.metadata?.plan_id || 'starter';
            const businessId = eventData.metadata?.business_id;
            if (businessId) {
              await supabase.rpc('settle_verified_subscription_payment', {
                p_provider_reference: reference,
                p_business_id: businessId,
                p_plan_id: planId,
                p_paystack_customer_code: eventData.customer?.customer_code || null,
                p_paystack_subscription_code: eventData.subscription_code || null
              });
            }
          }
        }
      }

      return jsonResponse({ success: true, message: 'Webhook processed' });
    }

    // 7. API 404 Handler - strictly ensures /api/* requests return JSON 404 and never SPA index.html
    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${method} ${url.pathname} not found.`
        }
      }, 404);
    }

    // 8. Cloudflare Workers Static Assets & React SPA Fallback
    // Serves dist/assets/*, static files, and falls back to dist/index.html for SPA routes (e.g. /, /login, /dashboard, /pricing, /store/*)
    if (env.ASSETS) {
      return await env.ASSETS.fetch(request);
    }

    // Fallback if Worker is invoked without ASSETS binding
    return jsonResponse({
      success: false,
      error: {
        code: 'ASSETS_NOT_CONFIGURED',
        message: 'Static asset binding ASSETS is not configured on this Worker instance.'
      }
    }, 503);
  },

  /**
   * Cloudflare Workers Scheduled Cron Handler
   * Automatically triggered by Cloudflare edge every 15 minutes (crons schedule: star-slash-15)
   */
  async scheduled(controller: { cron: string; scheduledTime: number }, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Worker Cron] Scheduled reconciliation trigger fired (${controller.cron}) at ${new Date(controller.scheduledTime).toISOString()}`);
    ctx.waitUntil(runWorkerPaymentReconciliation(env));
  }
};

/**
 * Executes automated reconciliation directly on Cloudflare Workers edge runtime.
 * Recovers unconfirmed stale pending transactions by verifying with Paystack and
 * invoking the atomic PostgreSQL settlement procedures.
 */
async function runWorkerPaymentReconciliation(env: Env): Promise<{ scanned: number; settled: number; failed: number }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.PAYSTACK_SECRET_KEY) {
    console.warn('[Worker Reconciler] Missing Supabase or Paystack secrets. Skipping reconciliation.');
    return { scanned: 0, settled: 0, failed: 0 };
  }

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const thresholdTime = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes old
  const maxAgeTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(); // 48 hours max

  let scanned = 0;
  let settled = 0;
  let failed = 0;

  try {
    const { data: candidates, error: fetchErr } = await supabase
      .from('payments')
      .select('*')
      .eq('status', 'pending')
      .lte('created_at', thresholdTime)
      .gte('created_at', maxAgeTime)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchErr || !candidates || candidates.length === 0) {
      return { scanned: 0, settled: 0, failed: 0 };
    }

    scanned = candidates.length;

    for (const payment of candidates) {
      const ref = payment.provider_reference;
      if (!ref) continue;

      try {
        const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
          headers: {
            Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        });

        if (!verifyRes.ok) continue;

        const verifyData = await verifyRes.json() as any;
        const tx = verifyData?.data;

        if (tx && tx.status === 'success' && Number(tx.amount) >= payment.amount) {
          if (ref.startsWith('PSTK_')) {
            await supabase.rpc('settle_verified_order_payment', {
              p_provider_reference: ref
            });
            settled++;
            console.log(`[Worker Reconciler] Settled order payment ${ref}`);
          } else if (ref.startsWith('XHIPA_SUB_')) {
            const planId = tx.metadata?.plan_id || payment.metadata?.plan_id || 'starter';
            const businessId = tx.metadata?.business_id || payment.business_id;
            if (businessId) {
              await supabase.rpc('settle_verified_subscription_payment', {
                p_provider_reference: ref,
                p_business_id: businessId,
                p_plan_id: planId,
                p_paystack_customer_code: tx.customer?.customer_code || null,
                p_paystack_subscription_code: tx.subscription_code || null
              });
              settled++;
              console.log(`[Worker Reconciler] Settled subscription payment ${ref}`);
            }
          }
        } else if (tx && (tx.status === 'failed' || tx.status === 'abandoned')) {
          await supabase
            .from('payments')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('id', payment.id);
          failed++;
          console.log(`[Worker Reconciler] Marked payment ${ref} as failed`);
        }
      } catch (itemErr) {
        console.error(`[Worker Reconciler] Error verifying ${ref}:`, itemErr);
      }
    }
  } catch (err) {
    console.error('[Worker Reconciler] Fatal error in reconciliation cycle:', err);
  }

  return { scanned, settled, failed };
}
