import { createClient } from '@supabase/supabase-js';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!USE_MOCK && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or set VITE_USE_MOCK=true to run with in-memory mock data.'
  );
}

export const supabase = USE_MOCK
  ? null
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });

export const APP_NAME = import.meta.env.VITE_APP_NAME || 'TaskFlow';
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
