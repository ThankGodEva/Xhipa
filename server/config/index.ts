import dotenv from 'dotenv';
dotenv.config();

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
};

export function setServerConfig(overrides: Partial<typeof config>): void {
  Object.assign(config, overrides);
}

