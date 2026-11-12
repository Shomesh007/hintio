// Legacy clients may validate access, but must upgrade before starting managed sessions.
const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-intent,x-runtime-secret',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Cache-Control': 'no-store',
};
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    const reply = (b: unknown, s: number) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
    if (req.method !== 'POST') return reply({ error: 'Method not allowed' }, 405);
    if (!req.headers.get('content-type')?.includes('application/json')) return reply({ error: 'JSON required' }, 415);
    if (Number(req.headers.get('content-length')) > 1024) return reply({ error: 'Request too large' }, 413);
    try {
        const reader = req.body?.getReader();
        if (!reader) return reply({ error: 'Invalid request' }, 400);
        let text = '';
        let bytes = 0;
        while (true) {
            const r = await reader.read();
            if (r.done) break;
            bytes += r.value.length;
            if (bytes > 1024) {
                await reader.cancel();
                return reply({ error: 'Request too large' }, 413);
            }
            text += new TextDecoder().decode(r.value);
        }
        const p = JSON.parse(text);
        if (p.consume === true || req.headers.has('x-runtime-secret'))
            return reply(
                {
                    error: 'A security update is required. Please install the latest Hintio version from hintio.tech or contact admin@builtbygsv.in.',
                    code: 'UPDATE_REQUIRED',
                    downloadUrl: 'https://www.hintio.tech',
                    secretsIssued: false,
                },
                426
            );
        const response = await fetch((Deno.env.get('SUPABASE_URL') || '') + '/functions/v1/managed-runtime', {
            method: 'POST',
            headers: {
                Authorization: req.headers.get('authorization') || '',
                apikey: req.headers.get('apikey') || '',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ operation: 'status' }),
            signal: AbortSignal.timeout(15000),
        });
        return new Response(response.body, { status: response.status, headers: { ...cors, 'Content-Type': 'application/json' } });
    } catch {
        return reply({ error: 'Invalid request or unavailable access service' }, 400);
    }
});
