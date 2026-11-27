import { createClient } from 'npm:@supabase/supabase-js@2.99.1';
import { accountReference, parseAnalyticsEvent } from '../_shared/analyticsContract.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
});
const accountKey = Deno.env.get('ANALYTICS_ACCOUNT_KEY') ?? '';
const origins = new Set((Deno.env.get('ANALYTICS_WEB_ORIGINS') ?? 'https://www.hintio.tech').split(',').map(origin => origin.trim()));

async function readEvent(request: Request) {
    if (!request.body) return null;
    const reader = request.body.getReader();
    const buffer = new Uint8Array(1024);
    let size = 0;
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (size + value.length > buffer.length) {
            await reader.cancel();
            return null;
        }
        buffer.set(value, size);
        size += value.length;
    }
    return parseAnalyticsEvent(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size))));
}

Deno.serve(async request => {
    const origin = request.headers.get('origin');
    const headers = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
    const reply = (status: number) => new Response(null, { status, headers });
    if (origin) {
        if (!origins.has(origin)) return reply(403);
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        headers.set('Access-Control-Allow-Headers', 'authorization, content-type');
    }
    if (request.method === 'OPTIONS') return reply(204);
    if (request.method !== 'POST') return reply(405);
    if (origin && (request.headers.get('sec-gpc') === '1' || request.headers.get('dnt') === '1')) return reply(204);

    const event = await readEvent(request).catch(() => null);
    if (!event || Boolean(origin) !== (event.source === 'web')) return reply(400);

    let value: string = event.value;
    if (event.event === 'account_linked') {
        // The account ID never leaves this function; only its keyed hash is stored.
        const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
        if (!token) return reply(401);
        const {
            data: { user },
            error: authError,
        } = await admin.auth.getUser(token);
        if (authError || !user) return reply(401);
        const reference = await accountReference(accountKey, user.id);
        if (!reference) return reply(204);
        value = reference;
    }

    const { data, error } = await admin.rpc('record_product_analytics', {
        p_event_id: event.eventId,
        p_actor_id: event.actorId,
        p_source: event.source,
        p_event_name: event.event,
        p_event_value: value,
        p_app_version: event.version,
        p_distribution: event.distribution,
    });
    if (error) return reply(503);
    return reply(data === true ? 204 : 429);
});
