const test = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');
const raw = fs.readFileSync(require('node:path').join(__dirname, '../supabase/functions/managed-runtime/index.ts'), 'utf8');
const code = stripTypeScriptTypes(raw.replace(/^import .*;\r?\n/gm, ''), { mode: 'transform' });
function runtime(opts = {}) {
    let handler;
    const calls = [];
    const row = {
        token_id: 'qa-id',
        provider_mode: 'managed',
        groq_api_key: 'SERVER_SPEECH_SECRET',
        expires_at: new Date(Date.now() + 60000).toISOString(),
        max_interviews: 3,
        interviews_used: 0,
    };
    const query = {
        select() {
            return this;
        },
        eq() {
            return this;
        },
        not() {
            return this;
        },
        neq() {
            return this;
        },
        order() {
            return this;
        },
        limit() {
            return this;
        },
        async maybeSingle() {
            return { data: { groq_api_key: 'SERVER_SPEECH_SECRET' }, error: null };
        },
    };
    vm.runInNewContext(code, {
        Deno: {
            env: {
                get: k =>
                    ({
                        SUPABASE_URL: 'https://example.invalid',
                        SUPABASE_SERVICE_ROLE_KEY: 'SERVER_ROLE_SECRET',
                        HINTIO_MANAGED_OPENAI_API_KEY: 'SERVER_OPENAI_SECRET',
                        ...opts.env,
                    })[k],
            },
            serve: fn => (handler = fn),
        },
        createClient: () => ({
            from: () => query,
            rpc: async (name, args) => {
                calls.push([name, args]);
                if (name === 'enforce_access_token_rate_limit' || name === 'enforce_managed_daily_limit') return { data: !opts.limited };
                if (name === 'resolve_provider_secrets') return { data: opts.invalid ? [] : [row] };
                if (name === 'start_managed_runtime') return { data: opts.invalid ? null : { expiresAt: row.expires_at } };
                if (name === 'authorize_managed_runtime') return { data: opts.revoked ? null : 'qa-id' };
            },
        }),
        crypto: webcrypto,
        Request,
        Response,
        TextEncoder,
        TextDecoder,
        Uint8Array,
        Blob,
        FormData,
        AbortSignal,
        atob,
        fetch: async (url, init) => {
            calls.push(['fetch', url, init]);
            return new Response(opts.upstreamError ? 'SERVER_OPENAI_SECRET' : JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), {
                status: opts.upstreamError ? 401 : 200,
            });
        },
    });
    return {
        calls,
        request: (p, credential = 'HGW-' + 'a'.repeat(64)) =>
            handler(
                new Request('https://example.invalid', {
                    method: 'POST',
                    headers: { authorization: 'Bearer ' + credential, 'content-type': 'application/json' },
                    body: JSON.stringify(p),
                })
            ),
    };
}
test('status returns configuration without provider keys or credit consumption', async () => {
    const r = runtime();
    const response = await r.request({ operation: 'status' }, 'SKI-security-test-license');
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(!text.includes('SECRET'));
    assert.ok(!r.calls.some(x => x[0] === 'start_managed_runtime'));
    assert.ok(!r.calls.some(x => x[0] === 'fetch'));
});
test('session returns only scoped credential and hashes it before database storage', async () => {
    const r = runtime();
    const response = await r.request({ operation: 'session', requestId: 'ca6b1b2c-44de-4a8b-b130-9445dc427d00' }, 'SKI-security-test-license');
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(!text.includes('SECRET'));
    const d = JSON.parse(text).data;
    assert.match(d.gatewayToken, /^HGW-[a-f0-9]{64}$/);
    const start = r.calls.find(x => x[0] === 'start_managed_runtime');
    assert.match(start[1].p_session_hash, /^[a-f0-9]{64}$/);
    assert.notEqual(start[1].p_session_hash, d.gatewayToken.slice(4));
});
test('revoked sessions cannot reach provider', async () => {
    const r = runtime({ revoked: true });
    assert.equal((await r.request({ operation: 'chat', messages: [{ role: 'user', content: 'Hi' }] })).status, 403);
    assert.ok(!r.calls.some(x => x[0] === 'fetch'));
});
test('remote image URLs and invalid output limits never reach provider', async () => {
    for (const data of [
        { messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'http://169.254.169.254' } }] }] },
        { messages: [{ role: 'user', content: 'Hi' }], maxTokens: 9000 },
    ]) {
        const r = runtime();
        assert.equal((await r.request({ operation: 'chat', ...data })).status, 400);
        assert.ok(!r.calls.some(x => x[0] === 'fetch'));
    }
});
test('chat uses server model and server credentials, ignoring client URL and model', async () => {
    const r = runtime();
    const response = await r.request({
        operation: 'chat',
        model: 'attacker-model',
        url: 'https://attacker.invalid',
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 100,
    });
    assert.equal(response.status, 200);
    const call = r.calls.find(x => x[0] === 'fetch');
    assert.equal(call[1], 'https://api.openai.com/v1/chat/completions');
    assert.equal(JSON.parse(call[2].body).model, 'gpt-5.6-luna');
    assert.ok(!(await response.text()).includes('SECRET'));
});
test('rate limit rejects before provider call', async () => {
    const r = runtime({ limited: true });
    assert.equal((await r.request({ operation: 'chat', messages: [] })).status, 429);
    assert.ok(!r.calls.some(x => x[0] === 'fetch'));
});
test('provider failures never expose upstream secret or error payload', async () => {
    const r = runtime({ upstreamError: true });
    const response = await r.request({ operation: 'chat', messages: [{ role: 'user', content: 'Hi' }] });
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('SECRET'));
});
test('oversized text and audio are rejected', async () => {
    const r = runtime();
    assert.equal((await r.request({ operation: 'chat', messages: [{ role: 'user', content: 'x'.repeat(64001) }] })).status, 413);
    assert.equal((await r.request({ operation: 'transcribe', audio: 'a'.repeat(2800001), language: 'en', mimeType: 'audio/wav' })).status, 400);
});
test('raw license cannot be used as a provider session', async () => {
    const r = runtime();
    assert.equal((await r.request({ operation: 'chat', messages: [] }, 'SKI-security-test-license')).status, 401);
});

test('rotated canonical OpenAI secret takes priority over a legacy plural setting', async () => {
    const r = runtime({ env: { HINTIO_MANAGED_OPENAI_API_KEYS: 'LEGACY_PLURAL_SECRET' } });
    const response = await r.request({ operation: 'chat', messages: [{ role: 'user', content: 'Hi' }] });
    assert.equal(response.status, 200);
    assert.equal(r.calls.find(x => x[0] === 'fetch')[2].headers.Authorization, 'Bearer SERVER_OPENAI_SECRET');
    const status = await r.request({ operation: 'status' }, 'SKI-security-test-license');
    assert.equal((await status.json()).data.providerConfiguration.openaiCredentialSource, 'HINTIO_MANAGED_OPENAI_API_KEY');
});
test('rotated Groq secret overrides legacy database speech configuration', async () => {
    const r = runtime({ env: { HINTIO_MANAGED_GROQ_API_KEY: 'NEW_SERVER_SPEECH_SECRET' } });
    const response = await r.request({
        operation: 'transcribe',
        audio: Buffer.from('synthetic-audio').toString('base64'),
        mimeType: 'audio/wav',
        language: 'en',
    });
    assert.equal(response.status, 200);
    assert.equal(r.calls.find(x => x[0] === 'fetch')[2].headers.Authorization, 'Bearer NEW_SERVER_SPEECH_SECRET');
});
