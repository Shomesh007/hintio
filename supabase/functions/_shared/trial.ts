type Dependencies = { admin: any; env: (name: string) => string | undefined };
const origins = new Set(['https://www.hintio.tech', 'https://hintio.tech', 'http://localhost:3000', 'http://localhost:5174']);
export function networkAddress(req: Request): string {
    const value = (req.headers.get('cf-connecting-ip') || '').trim();
    if (!value || value.includes(',') || value.length > 45) throw new Error('network');
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) {
        if (value.split('.').some(v => Number(v) > 255)) throw new Error('network');
        return value
            .split('.')
            .map(v => String(Number(v)))
            .join('.');
    }
    if (!/^[a-f0-9:]+$/i.test(value) || !value.includes(':')) throw new Error('network');
    try {
        return new URL('http://[' + value + ']/').hostname.slice(1, -1).toLowerCase();
    } catch {
        throw new Error('network');
    }
}
export async function keyedHash(secret: string, value: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))))
        .map(v => v.toString(16).padStart(2, '0'))
        .join('');
}
export function createTrialService({ admin, env }: Dependencies) {
    return async (req: Request) => {
        const origin = req.headers.get('origin') || '';
        const cors = {
            'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://www.hintio.tech',
            'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
            'Access-Control-Allow-Methods': 'POST,OPTIONS',
            'Cache-Control': 'no-store',
            Vary: 'Origin',
        };
        const reply = (body: unknown, status = 200) =>
            new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
        if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
        if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
            try {
                networkAddress(req);
                return reply({ ready: true });
            } catch {
                return reply({ ready: false }, 503);
            }
        }
        if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
        if (origin && !origins.has(origin)) return reply({ error: 'Origin not allowed' }, 403);
        const jwt = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')?.[1];
        if (!jwt) return reply({ error: 'Sign in with Google to start your trial.' }, 401);
        try {
            const auth = await admin.auth.getUser(jwt);
            const u = auth.data?.user;
            if (
                auth.error ||
                !u?.id ||
                !u.email ||
                u.is_anonymous ||
                !u.email_confirmed_at ||
                !u.identities?.some((i: { provider: string }) => i.provider === 'google')
            )
                return reply({ error: 'Use a verified Google account to start your trial.' }, 401);
            if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error: 'JSON required' }, 415);
            const reader = req.body?.getReader();
            if (!reader) return reply({ error: 'Device information is required.' }, 400);
            let size = 0;
            let input = '';
            const decoder = new TextDecoder();
            while (true) {
                const chunk = await reader.read();
                if (chunk.done) break;
                size += chunk.value.length;
                if (size > 1024) {
                    await reader.cancel();
                    return reply({ error: 'Request too large' }, 413);
                }
                input += decoder.decode(chunk.value, { stream: true });
            }
            input += decoder.decode();
            let body;
            try {
                body = JSON.parse(input);
            } catch {
                return reply({ error: 'Invalid request' }, 400);
            }
            if (
                !body ||
                Object.keys(body).some(k => k !== 'deviceId') ||
                typeof body.deviceId !== 'string' ||
                !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(body.deviceId)
            )
                return reply({ error: 'Enable browser storage and retry your trial request.' }, 400);
            let ip;
            try {
                ip = networkAddress(req);
            } catch {
                return reply({ error: 'Network verification is unavailable. Please contact admin@builtbygsv.in.' }, 503);
            }
            const secret = env('HINTIO_TRIAL_HASH_SECRET') || env('SUPABASE_SERVICE_ROLE_KEY');
            if (!secret) return reply({ error: 'Trial service is unavailable.' }, 503);
            const ipHash = await keyedHash(secret, 'hintio-trial:ip:' + ip),
                deviceHash = await keyedHash(secret, 'hintio-trial:device:' + body.deviceId.toLowerCase());
            for (const [id, max, window] of [
                ['trial-edge-ip:' + ipHash, 30, 300],
                ['trial-edge-user:' + u.id, 10, 300],
            ] as const) {
                const limit = await admin.rpc('enforce_access_token_rate_limit', { p_identifier: id, p_max_attempts: max, p_window_seconds: window });
                if (limit.error) return reply({ error: 'Trial service is unavailable.' }, 503);
                if (limit.data !== true) return reply({ error: 'Too many requests. Please retry in a few minutes.' }, 429);
            }
            const result = await admin.rpc('claim_trial_access', { p_user_id: u.id, p_ip_hash: ipHash, p_device_hash: deviceHash });
            if (result.error) {
                if (result.error.message?.includes('TRIAL_NETWORK_OR_DEVICE_USED'))
                    return reply(
                        {
                            error: 'A free trial has already been used on this network or browser. Sign in to the original account to recover its key, or contact support if you share a network.',
                            code: 'TRIAL_ALREADY_USED',
                        },
                        409
                    );
                return reply({ error: 'Could not issue your trial key. Please retry or contact support.' }, 503);
            }
            const d = result.data;
            return reply({
                access_key: d.access_key,
                max_interviews: d.max_interviews,
                minutes_per_interview: d.minutes_per_interview,
                is_new: d.is_new,
                expires_at: d.expires_at,
                interviews_remaining: d.interviews_remaining,
            });
        } catch {
            return reply({ error: 'Trial service is unavailable. Please retry.' }, 503);
        }
    };
}
