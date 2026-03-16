import { createClient } from '@supabase/supabase-js';

const defaultSupabaseUrl = 'https://vsybqtunyuanxspxhzue.supabase.co';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const missingSupabaseEnvVars = [
  ...(supabaseUrl ? [] : ['VITE_SUPABASE_URL']),
  ...(supabaseAnonKey ? [] : ['VITE_SUPABASE_ANON_KEY']),
];

export const supabase =
  missingSupabaseEnvVars.length === 0
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
