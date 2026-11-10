import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { createSandboxBillingService } from "../_shared/billingSandbox.ts";
const env = (name: string) => Deno.env.get(name);
const admin = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async (req: Request) => {
    // Per-request observations: never retain keys, customer details or other users' responses.
    const checks: Record<string, unknown>[] = [];
    const observedFetch: typeof fetch = async (input, init) => {
        const response = await fetch(input, init);
        const route = new URL(String(input)).pathname;
        if (/^\/v1\/subscriptions\/sub_[A-Za-z0-9]+$/.test(route)) {
            const data = await response.clone().json();
            const check: Record<string, unknown> = {httpStatus:response.status,method:init?.method||'GET'};
            for (const field of ['id','status','current_start','current_end','end_at','ended_at','charge_at',
                'paid_count','remaining_count','has_scheduled_changes','change_scheduled_at','cancel_at_cycle_end','cancelled_at'])
                if (Object.hasOwn(data,field)) check[field]=data[field];
            checks.push(check);
        }
        return response;
    };
    const response=await createSandboxBillingService(admin,env,observedFetch).manage(req);
    if (!checks.length) return response;
    return new Response(JSON.stringify({...await response.json(),sandboxProviderChecks:checks}),{
        status:response.status,headers:response.headers
    });
});
