import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
import { createTrialService } from '../_shared/trial.ts';
const admin = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '', {
    auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(createTrialService({ admin, env: name => Deno.env.get(name) }));
