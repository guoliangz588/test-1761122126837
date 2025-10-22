import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Exporting a disabled client.');
    const disabled: any = {
      from() {
        throw new Error('Supabase client not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      }
    };
    return disabled;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
})();

// Service client for server-side operations (with elevated permissions)
export const supabaseServiceClient = (() => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found. Service client will be unavailable.');
    return null;
  }

  return createClient(supabaseUrl!, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
})();
