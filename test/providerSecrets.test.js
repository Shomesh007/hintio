const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');

const raw = fs.readFileSync(path.join(__dirname, '../supabase/functions/resolve-provider-secrets/index.ts'), 'utf8');
const source = stripTypeScriptTypes(raw.replace(/^import .*;\r?\n/gm, ''), { mode: 'transform' });
function resolver(extraEnv = {}, options = {}) {
    let handler;
    const calls = [];
    const env = { SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-service', SUPABASE_ANON_KEY: 'test-anon', ...extraEnv };
    vm.runInNewContext(source, {
        Deno: {
            env: { get: key => env[key] },
            serve: fn => {
                handler = fn;
            },
        },
        Response,
        Request,
        TextEncoder,
        crypto: webcrypto,
        createClient: () => ({
            from: () => {
                const query = {
                    select() {
                        return query;
                    },
                    eq(k, v) {
                        calls.push([k, v]);
                        return query;
                    },
                    not() {
                        return query;
                    },
                    neq() {
                        return query;
                    },
                    order() {
                        return query;
                    },
                    limit() {
                        return query;
                    },
                    async maybeSingle() {
                        return { data: options.speechFallback ? { groq_api_key: options.speechFallback } : null, error: null };
                    },
                };
                return query;
            },
            rpc: async name => {
                calls.push(name);
                if (name === 'enforce_access_token_rate_limit') return { data: true, error: null };
                if (name === 'consume_interview_credit' && options.expireOnConsume) return { data: [], error: null };
                return {
                    data: [
                        {
                            groq_api_key: 'test-row-speech-key',
                            ...options.row,
                            token_id: 'test-token-id',
                            provider_mode: 'managed',
                            gemini_api_key: 'test-google-key',
                            max_interviews: 3,
                            interviews_used: 1,
                            ...options.row,
                        },
                    ],
                    error: null,
                };
            },
        }),
    });
    return {
        calls,
        request: async (consume = false, expectedStatus = 200) => {
            const response = await handler(
                new Request('https://test.invalid/resolve', {
                    method: 'POST',
                    headers: {
                        authorization: 'Bearer test-access-token',
                        apikey: 'test-anon',
                        'content-type': 'application/json',
                        'x-client-intent': 'desktop-runtime',
                        'user-agent': 'Hintio-test-client',
                    },
                    body: JSON.stringify({ accessToken: 'test-access-token', consume }),
                })
            );
            assert.equal(response.status, expectedStatus);
            return response.json();
        },
    };
}

test('validation reports OpenAI availability without issuing secrets or consuming a credit', async () => {
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai-key' });
    const { data } = await run.request();
    assert.equal(data.llmProvider, 'openai');
    assert.equal(data.providerConfiguration.openaiConfigured, true);
    assert.deepEqual(data.openaiApiKeys, []);
    assert.equal(data.geminiApiKey, '');
    assert.equal(data.secretsIssued, false);
    assert.ok(run.calls.includes('resolve_provider_secrets'));
    assert.ok(!run.calls.includes('consume_interview_credit'));
});

test('session initialization returns managed OpenAI keys and configured model', async () => {
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEYS: 'test-key-one,test-key-two', HINTIO_MANAGED_OPENAI_MODEL: 'test-gpt-model' });
    const { data } = await run.request(true);
    assert.deepEqual(data.openaiApiKeys, ['test-key-one', 'test-key-two']);
    assert.equal(data.openaiModel, 'test-gpt-model');
    assert.equal(data.secretsIssued, true);
    assert.equal(run.calls.filter(name => name === 'consume_interview_credit').length, 1);
});

test('an empty plural secret does not hide the singular OpenAI secret', async () => {
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEYS: '   ', HINTIO_MANAGED_OPENAI_API_KEY: 'test-single-key' });
    assert.deepEqual((await run.request(true)).data.openaiApiKeys, ['test-single-key']);
});

test('standard OPENAI_API_KEY is supported by the managed resolver', async () => {
    const run = resolver({ OPENAI_API_KEY: 'test-standard-key' });
    assert.deepEqual((await run.request(true)).data.openaiApiKeys, ['test-standard-key']);
});

test('missing OpenAI configuration is reported accurately', async () => {
    const run = resolver();
    const { data } = await run.request();
    assert.equal(data.providerConfiguration.openaiConfigured, false);
    assert.deepEqual(data.openaiApiKeys, []);
});

test('new paid access uses managed speech fallback without exposing it during validation', async () => {
    const run = resolver(
        { HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai' },
        { row: { groq_api_key: null, metadata: { plan_type: 'paid_yearly' } }, speechFallback: 'test-company-speech' }
    );
    const { data } = await run.request();
    assert.equal(data.providerConfiguration.groqConfigured, true);
    assert.equal(data.groqApiKey, '');
    assert.ok(run.calls.some(x => Array.isArray(x) && x[0] === 'provider_mode' && x[1] === 'managed'));
    assert.ok(run.calls.some(x => Array.isArray(x) && x[0] === 'metadata->>issued_for' && x[1] === 'free_download'));
    assert.equal(run.calls.includes('consume_interview_credit'), false);
});
test('configured company speech environment takes priority for managed sessions', async () => {
    const run = resolver(
        { HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai', HINTIO_MANAGED_GROQ_API_KEY: 'test-company-env' },
        { row: { groq_api_key: null, metadata: { plan_type: 'paid_monthly' } } }
    );
    assert.equal((await run.request(true)).data.groqApiKey, 'test-company-env');
    assert.equal(run.calls.filter(x => x === 'consume_interview_credit').length, 1);
});
test('unavailable provider configuration does not spend a credit', async () => {
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai' }, { row: { groq_api_key: null, metadata: { plan_type: 'paid_yearly' } } });
    assert.match((await run.request(true, 503)).error, /No session credit/);
    assert.equal(run.calls.includes('consume_interview_credit'), false);
    const absent = resolver();
    await absent.request(true, 503);
    assert.equal(absent.calls.includes('consume_interview_credit'), false);
});
test('BYOK rows cannot borrow another customer or company speech key', async () => {
    const run = resolver(
        { HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai', HINTIO_MANAGED_GROQ_API_KEY: 'test-company-env' },
        { row: { provider_mode: 'byok', groq_api_key: null, metadata: { plan_type: 'paid_yearly' } }, speechFallback: 'test-unselected' }
    );
    assert.equal((await run.request()).data.providerConfiguration.groqConfigured, false);
    assert.equal(
        run.calls.some(x => Array.isArray(x)),
        false
    );
});
test('expiry between validation and atomic consumption returns no provider keys', async () => {
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai' }, { expireOnConsume: true });
    const result = await run.request(true, 403);
    assert.equal(result.data, undefined);
});

test('paid-session timers are bounded by remaining paid access rather than an arbitrary time cap', async () => {
    const expiry = new Date(Date.now() + 60000).toISOString();
    const run = resolver({ HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai' }, { row: { expires_at: expiry, metadata: { plan_type: 'paid_yearly' } } });
    const { data } = await run.request();
    assert.ok(data.metadata.sessionTimeoutMs > 0 && data.metadata.sessionTimeoutMs <= 60000);
    assert.equal(data.metadata.paidAccessExpiresAt, expiry);
});
