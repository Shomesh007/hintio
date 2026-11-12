import { createClient } from '@supabase/supabase-js';
import { createBillingTestFetch } from './billingTestRouting';

const defaultSupabaseUrl = 'https://vsybqtunyuanxspxhzue.supabase.co';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const missingSupabaseEnvVars = [...(supabaseUrl ? [] : ['VITE_SUPABASE_URL']), ...(supabaseAnonKey ? [] : ['VITE_SUPABASE_ANON_KEY'])];

export const billingTestMode = import.meta.env.DEV && import.meta.env.VITE_BILLING_TEST_MODE === 'true';

export const supabase =
    missingSupabaseEnvVars.length === 0
        ? createClient(
              supabaseUrl,
              supabaseAnonKey,
              billingTestMode
                  ? {
                        global: { fetch: createBillingTestFetch(fetch, supabaseUrl) },
                    }
                  : undefined
          )
        : null;
