import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
import { isAnalyticsAdmin } from './authorize.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const origins = new Set((Deno.env.get('ANALYTICS_WEB_ORIGINS') ?? 'https://www.hintio.tech').split(',').map(origin => origin.trim()));

Deno.serve(async request => {
    const origin = request.headers.get('origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const reply = (status: number) => new Response(null, { status, headers });
    if (origin) {
        if (!origins.has(origin)) return reply(403);
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'authorization');
    }
    if (request.method === 'OPTIONS') return reply(204);
    if (request.method !== 'GET') return reply(405);

    const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
    if (!token) return reply(401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return reply(401);
    if (!isAnalyticsAdmin(user, token)) return reply(403);

    const days = new URL(request.url).searchParams.get('days');
    if (days !== '7' && days !== '30') return reply(400);
    const { data, error } = await admin.rpc('product_analytics_summary', { p_days: Number(days) });
    if (error) return reply(503);

    headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(data), { status: 200, headers });
});
