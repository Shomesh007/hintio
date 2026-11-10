import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { createSandboxBillingService } from "../_shared/billingSandbox.ts";
const env = (name: string) => Deno.env.get(name);
const admin = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createSandboxBillingService(admin, env).issue);
