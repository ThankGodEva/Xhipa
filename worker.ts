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
import { setSupabaseAdminClient } from './server/lib/supabase';
import { setServerConfig } from './server/config';
import { handleWorkerApiRoute } from './server/workerRouter';

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
  CLOUDFLARE_R2_PUBLIC_URL?: string;
  ASSETS?: Fetcher;
  [key: string]: any;
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

    // Initialize dynamic environment variables and Supabase Admin client for Worker runtime
    const supabaseKey = (
      env.SUPABASE_SERVICE_ROLE_KEY ||
      env.SUPABASE_ANON_KEY ||
      (env as any).SUPABASE_KEY ||
      (env as any).VITE_SUPABASE_ANON_KEY ||
      (env as any).VITE_SUPABASE_KEY ||
      ''
    ).trim();

    const supabaseUrl = (
      env.SUPABASE_URL ||
      (env as any).VITE_SUPABASE_URL ||
      ''
    ).trim();

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });
      setSupabaseAdminClient(supabase);
    }
    setServerConfig({
      supabaseUrl,
      supabaseServiceRoleKey: supabaseKey,
      supabaseAnonKey: (env.SUPABASE_ANON_KEY || (env as any).VITE_SUPABASE_ANON_KEY || supabaseKey).trim(),
      paystackSecretKey: (env.PAYSTACK_SECRET_KEY || (env as any).PAYSTACK_SECRET || '').trim(),
      paystackPublicKey: (env.PAYSTACK_PUBLIC_KEY || (env as any).VITE_PAYSTACK_PUBLIC_KEY || '').trim(),
      r2AccountId: (env.CLOUDFLARE_R2_ACCOUNT_ID || (env as any).R2_ACCOUNT_ID || (env as any).CF_ACCOUNT_ID || '').trim(),
      r2AccessKeyId: (env.CLOUDFLARE_R2_ACCESS_KEY_ID || (env as any).R2_ACCESS_KEY_ID || (env as any).AWS_ACCESS_KEY_ID || '').trim(),
      r2SecretAccessKey: (env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || (env as any).R2_SECRET_ACCESS_KEY || (env as any).AWS_SECRET_ACCESS_KEY || '').trim(),
      r2BucketName: (env.CLOUDFLARE_R2_BUCKET_NAME || (env as any).R2_BUCKET_NAME || (env as any).BUCKET_NAME || 'xhipa-storefront-media').trim(),
      r2PublicUrl: (env.R2_PUBLIC_URL || (env as any).CLOUDFLARE_R2_PUBLIC_URL || (env as any).PUBLIC_R2_URL || '').trim(),
      appUrl: env.APP_URL || url.origin || 'https://xhipa.com'
    });

    // 1. Handle CORS Preflight
    if (method === 'OPTIONS') {
      return handleCorsOptions();
    }

    // 2. API Root & Health Status
    if (url.pathname === '/' || url.pathname === '/api' || url.pathname === '/api/health' || url.pathname === '/health') {
      return jsonResponse({
        name: 'Xhipa API',
        status: 'online',
        runtime: 'Cloudflare Workers (Edge V8)',
        timestamp: new Date().toISOString(),
        supabase_configured: Boolean(supabaseUrl && supabaseKey),
        paystack_configured: Boolean(env.PAYSTACK_SECRET_KEY),
        r2_configured: Boolean(env.R2_BUCKET),
        website: 'https://xhipa.com'
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

      const r2 = env.R2_BUCKET || (env as any).BUCKET || (env as any).MEDIA_BUCKET || (env as any).STORE_ASSETS || (env as any).R2;
      const publicBaseUrl = (env.CLOUDFLARE_R2_PUBLIC_URL || env.R2_PUBLIC_URL || (env as any).PUBLIC_R2_URL || '').replace(/\/$/, '');

      const keyParts = key.split('/');
      const filename = keyParts[keyParts.length - 1];
      const subpath1 = keyParts.slice(1).join('/');
      const subpath2 = keyParts.slice(2).join('/');

      const candidateKeys = Array.from(
        new Set([
          `/${key}`, // EXACT match for keys stored with leading slash in Cloudflare R2 bucket
          key,       // Key without leading slash
          `/${filename}`,
          filename,
          `/${subpath1}`,
          subpath1,
          `/${subpath2}`,
          subpath2,
          `/branding/${filename}`,
          `branding/${filename}`,
          `/products/${filename}`,
          `products/${filename}`,
          `/uploads/${filename}`,
          `uploads/${filename}`,
          `/general/${filename}`,
          `general/${filename}`,
          `/media/${key}`,
          `media/${key}`,
          `/api/media/${key}`,
          `api/media/${key}`
        ])
      ).filter(Boolean);

      if (r2) {
        for (const candidate of candidateKeys) {
          try {
            const object = await r2.get(candidate);
            if (object) {
              const headers = new Headers();
              object.writeHttpMetadata(headers);
              headers.set('etag', object.httpEtag);
              headers.set('Cache-Control', 'public, max-age=31536000, immutable');
              headers.set('Access-Control-Allow-Origin', '*');

              return new Response(object.body, { headers });
            }
          } catch (err: any) {
            console.warn('[Worker R2] R2 get error for candidate key:', candidate, err);
          }
        }
      }

      // Check if Supabase Storage has this media file across common buckets
      if (supabaseUrl && supabaseKey) {
        const storageBuckets = ['storefront-media', 'branding', 'media', 'products', 'uploads', 'assets', 'public'];
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          for (const bucket of storageBuckets) {
            for (const candidate of candidateKeys) {
              try {
                const { data, error } = await supabase.storage.from(bucket).download(candidate);
                if (data && !error) {
                  const headers = new Headers();
                  headers.set('Content-Type', data.type || 'image/jpeg');
                  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
                  headers.set('Access-Control-Allow-Origin', '*');
                  return new Response(data, { headers });
                }
              } catch {
                // check next candidate
              }
            }
          }
        } catch (err) {
          console.warn('[Worker Media] Supabase storage download error:', err);
        }
      }

      if (publicBaseUrl) {
        return Response.redirect(`${publicBaseUrl}/${key}`, 302);
      }

      // If requested key is an image, provide a clean SVG fallback to prevent broken UI and 404 console errors
      const isImageRequest = /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(key) ||
        key.startsWith('branding/') ||
        key.startsWith('products/') ||
        key.startsWith('uploads/') ||
        key.startsWith('logos/') ||
        key.startsWith('banners/');

      if (isImageRequest) {
        const placeholderSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="none">
  <rect width="600" height="400" fill="#f8fafc"/>
  <rect x="20" y="20" width="560" height="360" rx="16" fill="#f1f5f9" stroke="#e2e8f0" stroke-width="2" stroke-dasharray="8 8"/>
  <circle cx="300" cy="180" r="44" fill="#e2e8f0"/>
  <path d="M284 180h32M300 164v32" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
  <text x="300" y="256" text-anchor="middle" fill="#64748b" font-family="system-ui,-apple-system,sans-serif" font-size="15" font-weight="600">Store Media Asset</text>
</svg>`;
        const headers = new Headers();
        headers.set('Content-Type', 'image/svg+xml; charset=utf-8');
        headers.set('Cache-Control', 'public, max-age=86400');
        headers.set('Access-Control-Allow-Origin', '*');
        return new Response(placeholderSvg, { headers });
      }

      return jsonResponse({ success: false, error: { message: 'Media not found or R2 binding not available' } }, 404);
    }

    // 5. Cloudflare R2 Media Upload (POST /api/media/upload) using Native FormData / ArrayBuffer
    if (url.pathname === '/api/media/upload' && method === 'POST') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();

      let userId = 'demo-merchant';
      let businessId = 'general';

      if (token && token !== 'demo-merchant-token' && env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
          const { data: authData } = await supabase.auth.getUser(token);
          if (authData?.user) {
            userId = authData.user.id;
            const { data: members } = await supabase
              .from('business_members')
              .select('business_id, role')
              .eq('user_id', userId);

            if (members && members.length > 0 && members[0]?.business_id) {
              businessId = members[0].business_id;
            } else {
              const { data: ownedBiz } = await supabase
                .from('businesses')
                .select('id')
                .eq('owner_id', userId)
                .limit(1);
              if (ownedBiz && ownedBiz.length > 0 && ownedBiz[0]?.id) {
                businessId = ownedBiz[0].id;
              }
            }
          }
        } catch (authErr) {
          console.warn('[Worker Upload] Auth token parse fallback:', authErr);
        }
      }

      const contentType = request.headers.get('content-type') || '';
      const r2 = env.R2_BUCKET || (env as any).BUCKET || (env as any).MEDIA_BUCKET || (env as any).STORE_ASSETS || (env as any).R2;

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

        if (r2) {
          const arrayBuffer = await file.arrayBuffer();
          await r2.put(key, arrayBuffer, {
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

        // Supabase storage fallback if R2 binding is not available in current environment
        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            const arrayBuffer = await file.arrayBuffer();
            await supabase.storage.from('storefront-media').upload(key, arrayBuffer, {
              contentType: file.type || 'image/jpeg',
              upsert: true
            });
            return jsonResponse({
              success: true,
              data: {
                url: `/api/media/${key}`,
                key,
                filename: file.name,
                mimetype: file.type,
                size: file.size,
                storage: 'supabase-storage',
                uploadedAt: new Date().toISOString()
              }
            });
          } catch (sbErr) {
            console.warn('[Worker Upload] Supabase storage upload error:', sbErr);
          }
        }

        return jsonResponse({
          success: true,
          data: {
            url: `/api/media/${key}`,
            key,
            filename: file.name,
            mimetype: file.type,
            size: file.size,
            storage: 'proxy-pending',
            uploadedAt: new Date().toISOString()
          }
        });
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

        if (r2) {
          await r2.put(key, bytes.buffer, {
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

        if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
          try {
            const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
            await supabase.storage.from('storefront-media').upload(key, bytes.buffer, {
              contentType: mimetype,
              upsert: true
            });
            return jsonResponse({
              success: true,
              data: {
                url: `/api/media/${key}`,
                key,
                filename,
                mimetype,
                size: bytes.length,
                storage: 'supabase-storage',
                uploadedAt: new Date().toISOString()
              }
            });
          } catch (sbErr) {
            console.warn('[Worker Upload] Supabase storage upload error:', sbErr);
          }
        }

        return jsonResponse({
          success: true,
          data: {
            url: `/api/media/${key}`,
            key,
            filename,
            mimetype,
            size: bytes.length,
            storage: 'proxy-pending',
            uploadedAt: new Date().toISOString()
          }
        });
      }

      return jsonResponse({ success: false, error: { message: 'Unsupported upload format' } }, 400);
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

    // 7. Full API Router Dispatch (Storefront, Orders, Payments, Merchant, Subscriptions, Auth, Affiliate, Admin)
    const apiResponse = await handleWorkerApiRoute(request, url);
    if (apiResponse) {
      return apiResponse;
    }

    // 8. API 404 Handler - strictly ensures /api/* requests return JSON 404 and never SPA index.html
    if (url.pathname.startsWith('/api/')) {
      return jsonResponse({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${method} ${url.pathname} not found.`
        }
      }, 404);
    }

    // 8. Fallback 404 Handler - strictly returns JSON for all unmatched requests on api.xhipa.com
    return jsonResponse({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint ${method} ${url.pathname} not found on Xhipa API.`
      }
    }, 404);
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
