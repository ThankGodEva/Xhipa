import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Supabase
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Paystack
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY || '',
  paystackPublicKey: process.env.VITE_PAYSTACK_PUBLIC_KEY || '',
};
