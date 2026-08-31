export const config = {
  port: 3000,
  appUrl: (typeof process !== 'undefined' && process.env?.APP_URL) || 'http://localhost:3000',
  nodeEnv: (typeof process !== 'undefined' && process.env?.NODE_ENV) || 'development',
  
  // Supabase
  supabaseUrl: (typeof process !== 'undefined' && (process.env?.SUPABASE_URL || process.env?.VITE_SUPABASE_URL)) || '',
  supabaseAnonKey: (typeof process !== 'undefined' && (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY)) || '',
  supabaseServiceRoleKey: (typeof process !== 'undefined' && (process.env?.SUPABASE_SERVICE_ROLE_KEY || process.env?.SUPABASE_SERVICE_KEY || process.env?.SUPABASE_SECRET_KEY || process.env?.SUPABASE_KEY)) || '',
  
  // Paystack
  paystackSecretKey: (typeof process !== 'undefined' && process.env?.PAYSTACK_SECRET_KEY) || '',
  paystackPublicKey: (typeof process !== 'undefined' && process.env?.VITE_PAYSTACK_PUBLIC_KEY) || '',

  // Cloudflare R2
  r2AccountId: (typeof process !== 'undefined' && (process.env?.CLOUDFLARE_R2_ACCOUNT_ID || process.env?.R2_ACCOUNT_ID)) || '',
  r2AccessKeyId: (typeof process !== 'undefined' && (process.env?.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env?.R2_ACCESS_KEY_ID)) || '',
  r2SecretAccessKey: (typeof process !== 'undefined' && (process.env?.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env?.R2_SECRET_ACCESS_KEY)) || '',
  r2BucketName: (typeof process !== 'undefined' && (process.env?.CLOUDFLARE_R2_BUCKET_NAME || process.env?.R2_BUCKET_NAME)) || '',
  r2PublicUrl: (typeof process !== 'undefined' && (process.env?.CLOUDFLARE_R2_PUBLIC_URL || process.env?.R2_PUBLIC_URL)) || '',
};

export function setServerConfig(overrides: Partial<typeof config>): void {
  Object.assign(config, overrides);
  if (typeof process !== 'undefined' && process.env) {
    if (overrides.r2AccountId) process.env.CLOUDFLARE_R2_ACCOUNT_ID = overrides.r2AccountId;
    if (overrides.r2AccessKeyId) process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = overrides.r2AccessKeyId;
    if (overrides.r2SecretAccessKey) process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = overrides.r2SecretAccessKey;
    if (overrides.r2BucketName) process.env.CLOUDFLARE_R2_BUCKET_NAME = overrides.r2BucketName;
    if (overrides.r2PublicUrl) process.env.CLOUDFLARE_R2_PUBLIC_URL = overrides.r2PublicUrl;
  }
}

