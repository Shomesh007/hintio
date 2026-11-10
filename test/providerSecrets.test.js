const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const { webcrypto } = require('node:crypto');

const raw = fs.readFileSync(path.join(__dirname, '../supabase/functions/resolve-provider-secrets/index.ts'), 'utf8');
const source = stripTypeScriptTypes(raw.replace(/^import .*;\r?\n/gm, ''), { mode: 'transform' });
function resolver(extraEnv = {}) {
    let handler;
    const calls = [];
    const env = { SUPABASE_URL: 'https://test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'test-service', SUPABASE_ANON_KEY: 'test-anon', ...extraEnv };
    vm.runInNewContext(source, {
        Deno: { env: { get: key => env[key] }, serve: fn => { handler = fn; } },
        Response, Request, TextEncoder, crypto: webcrypto,
        createClient: () => ({ rpc: async name => {
            calls.push(name);
            if (name === 'enforce_access_token_rate_limit') return { data: true, error: null };
            return { data: [{ token_id: 'test-token-id', provider_mode: 'managed', gemini_api_key: 'test-google-key', max_interviews: 3, interviews_used: 1 }], error: null };
        } }),
    });
    return { calls, request: async (consume = false) => {
        const response = await handler(new Request('https://test.invalid/resolve', {
            method: 'POST', headers: { authorization: 'Bearer test-access-token', apikey: 'test-anon', 'content-type': 'application/json', 'x-client-intent': 'desktop-runtime', 'user-agent': 'Hintio-test-client' },
            body: JSON.stringify({ accessToken: 'test-access-token', consume }),
        }));
        assert.equal(response.status, 200);
        return response.json();
    } };
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
