const fs = require('node:fs'),
    vm = require('node:vm'),
    assert = require('node:assert/strict'),
    { webcrypto } = require('node:crypto'),
    { execFileSync } = require('node:child_process');
const source = fs
    .readFileSync(require('node:path').join(__dirname, '../supabase/functions/resolve-provider-secrets/index.ts'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '');
const helperSource = require('node:module')
    .stripTypeScriptTypes(fs.readFileSync(require('node:path').join(__dirname, '../supabase/functions/_shared/trialCredentials.ts'), 'utf8'), {
        mode: 'transform',
    })
    .replace(/^export /gm, '');
const helperContext = { Date, Error };
vm.runInNewContext(helperSource + '\nglobalThis.trialPolicy = {selectTrialCredentials,TrialCredentialError};', helperContext);
const token = 'SKI-test_customer_license_1234567890';
const future = new Date(Date.now() + 28 * 86400000).toISOString(),
    deadline = new Date(Date.now() + 7 * 86400000).toISOString();
const base = {
    token_id: 'test-license',
    provider_mode: 'managed',
    expires_at: future,
    max_interviews: 2147483647,
    interviews_used: 18,
    groq_api_key: 'test-managed-row-groq',
    metadata: { issued_for: 'customer', plan_type: 'paid_monthly', legacyDesktopCompatibility: '1.0.4', legacyDesktopCompatibilityUntil: deadline },
};
function harness(options = {}) {
    const row = options.row === null ? null : structuredClone(options.row || base),
        calls = [],
        filters = [],
        env = {
            SUPABASE_URL: 'https://test.invalid',
            SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
            SUPABASE_ANON_KEY: 'test-anon',
            HINTIO_MANAGED_OPENAI_API_KEY: 'test-openai-first,test-openai-second',
            HINTIO_TRIAL_OPENAI_API_KEY: 'test-isolated-trial-openai',
            HINTIO_TRIAL_GROQ_API_KEY: 'test-isolated-trial-groq',
            HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
            HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT: new Date(Date.now() + 3600000).toISOString(),
            ...options.env,
        };
    let handler;
    const query = {
        select() {
            return this;
        },
        eq(...a) {
            filters.push(a);
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
            return options.fallbackError ? { error: {} } : { data: options.fallback ? { groq_api_key: 'test-fallback-groq' } : null };
        },
    };
    const client = {
        from(name) {
            if (name === 'trial_key_claims') {
                return {
                    select() {
                        return this;
                    },
                    eq() {
                        return this;
                    },
                    async maybeSingle() {
                        return options.trialError ? { error: {} } : { data: options.trialClaimed ? { token_id: row.token_id } : null };
                    },
                };
            }
            if (name === 'licenses') {
                return {
                    select() {
                        return this;
                    },
                    eq() {
                        return this;
                    },
                    gt() {
                        return this;
                    },
                    async maybeSingle() {
                        return options.billingError
                            ? { error: {} }
                            : { data: options.billingConfirmed ? { id: row.metadata.billing_license_id } : null };
                    },
                };
            }
            assert.equal(name, 'provider_secrets');
            return query;
        },
        async rpc(name, args) {
            calls.push({ name, args });
            if (name === 'enforce_access_token_rate_limit')
                return options.limitError ? { error: {} } : { data: options.denyLimit !== args.p_identifier.split(':')[0] };
            if (name === 'resolve_provider_secrets') return options.resolveError ? { error: {} } : { data: row ? [row] : [] };
            if (name === 'consume_interview_credit')
                return options.consumeError
                    ? { error: {} }
                    : { data: options.after === null ? [] : [options.after || { ...row, interviews_used: row.interviews_used + 1 }] };
            throw Error('unexpected RPC');
        },
    };
    const context = {
        Response,
        Request,
        Headers,
        TextEncoder,
        TextDecoder,
        Uint8Array,
        AbortSignal,
        crypto: webcrypto,
        Date,
        ...helperContext.trialPolicy,
        createClient: () => client,
        Deno: { env: { get: k => env[k] }, serve: f => (handler = f) },
        fetch: async (url, init) => {
            calls.push({ name: 'fetch', url, init });
            return new Response(
                JSON.stringify(
                    options.upstream || {
                        success: true,
                        data: {
                            providerMode: 'managed',
                            openaiApiKeys: ['must-not-leak'],
                            groqApiKey: 'must-not-leak',
                            metadata: { unsafe: 'must-not-leak' },
                            providerConfiguration: { openaiConfigured: true, groqConfigured: true },
                        },
                    }
                ),
                { status: options.upstreamStatus || 200 }
            );
        },
    };
    vm.runInNewContext(source, context, { filename: 'resolve-provider-secrets/index.ts' });
    async function invoke(body = { accessToken: token, consume: true }, headers = {}, method = 'POST') {
        const r = await handler(
            new Request('https://test.invalid/functions/v1/resolve-provider-secrets', {
                method,
                headers: {
                    authorization: 'Bearer ' + token,
                    apikey: 'test-anon',
                    'content-type': 'application/json',
                    'x-client-intent': 'desktop-runtime',
                    ...headers,
                },
                body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
            })
        );
        return { status: r.status, body: await r.json(), headers: r.headers };
    }
    return { invoke, calls, filters, handler };
}
let count = 0;
async function test(name, fn) {
    await fn();
    count++;
    console.log('PASS ' + name);
}
function noSecrets(result) {
    const s = JSON.stringify(result.body);
    assert(!s.includes('test-openai'));
    assert(!s.includes('test-managed'));
    assert(!s.includes('test-fallback'));
    assert(!s.includes('test-isolated-trial'));
    assert.equal(result.body.secretsIssued ?? result.body.data?.secretsIssued, false);
}
function noConsume(h) {
    assert.equal(h.calls.filter(c => c.name === 'consume_interview_credit').length, 0);
}
(async () => {
    await test('eligible paid monthly legacy response, one credit, first OpenAI key only', async () => {
        const h = harness(),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.data.openaiApiKeys, ['test-openai-first']);
        assert.equal(r.body.data.groqApiKey, 'test-managed-row-groq');
        assert.equal(r.body.data.interviewsUsed, 19);
        assert.equal(h.calls.filter(c => c.name === 'consume_interview_credit').length, 1);
        assert.equal(r.headers.get('cache-control'), 'no-store');
        for (const k of ['geminiApiKey', 'azureApiKey', 'azureEndpoint', 'azureDeployment', 'cloudToken']) assert.equal(r.body.data[k], '');
        assert(r.body.data.metadata.sessionTimeoutMs <= 2147483647);
        assert(r.body.data.metadata.sessionTimeoutMs > 0);
    });
    for (const [name, patch] of [
        ['unflagged', { metadata: { ...base.metadata, legacyDesktopCompatibility: null } }],
        ['wrong version', { metadata: { ...base.metadata, legacyDesktopCompatibility: '1.0.5' } }],
        ['trial', { max_interviews: 3 }],
        ['BYOK', { provider_mode: 'byok' }],
        ['noncustomer', { metadata: { ...base.metadata, issued_for: 'free_download' } }],
        ['nonmonthly', { metadata: { ...base.metadata, plan_type: 'paid_yearly' } }],
        ['expired', { expires_at: new Date(Date.now() - 1000).toISOString() }],
        ['deadline expired', { metadata: { ...base.metadata, legacyDesktopCompatibilityUntil: new Date(Date.now() - 1000).toISOString() } }],
        [
            'deadline after paid expiry',
            { metadata: { ...base.metadata, legacyDesktopCompatibilityUntil: new Date(Date.now() + 90 * 86400000).toISOString() } },
        ],
        ['invalid deadline', { metadata: { ...base.metadata, legacyDesktopCompatibilityUntil: 'invalid' } }],
    ])
        await test(name + ' denied without secrets or consume', async () => {
            const h = harness({ row: { ...base, ...patch } }),
                r = await h.invoke();
            assert.equal(r.status, 426);
            noSecrets(r);
            noConsume(h);
        });
    await test('actual released publishable apikey accepted', async () => {
        const h = harness(),
            r = await h.invoke({ accessToken: token, consume: true }, { apikey: 'sb_publishable_3QAlmxPFz8uNsjg1GaV00A_fznmgMEm' });
        assert.equal(r.status, 200);
        assert.equal(r.body.data.creditConsumed, true);
    });
    for (const plan of ['paid_monthly', 'paid_yearly'])
        await test(plan + ' verified purchase works without per-customer opt-in', async () => {
            const row = { ...base, metadata: { plan_type: plan, billing_license_id: '11111111-1111-4111-8111-111111111111' } };
            const h = harness({ row, billingConfirmed: true }),
                r = await h.invoke();
            assert.equal(r.status, 200);
            assert.equal(r.body.data.metadata.plan_type, plan);
            assert.equal(r.body.data.interviewsUsed, 19);
        });
    await test('billing metadata without matching active paid license is denied', async () => {
        const h = harness({ row: { ...base, metadata: { plan_type: 'paid_yearly', billing_license_id: '11111111-1111-4111-8111-111111111111' } } }),
            r = await h.invoke();
        assert.equal(r.status, 426);
        noSecrets(r);
        noConsume(h);
    });
    await test('billing lookup failure issues no credentials or credit', async () => {
        const h = harness({
                billingError: true,
                row: { ...base, metadata: { plan_type: 'paid_monthly', billing_license_id: '11111111-1111-4111-8111-111111111111' } },
            }),
            r = await h.invoke();
        assert.equal(r.status, 503);
        noSecrets(r);
        noConsume(h);
    });
    await test('free trial never qualifies as production paid access', async () => {
        const h = harness({
                billingConfirmed: true,
                row: {
                    ...base,
                    max_interviews: 3,
                    metadata: { plan_type: 'paid_monthly', billing_license_id: '11111111-1111-4111-8111-111111111111' },
                },
            }),
            r = await h.invoke();
        assert.equal(r.status, 426);
        noSecrets(r);
        noConsume(h);
    });
    const trialRow = { ...base, max_interviews: 3, interviews_used: 0, metadata: { plan_type: 'three_usage', issued_for: 'free_download' } };
    await test('claimed trial works and receives a 15 minute app timer', async () => {
        const h = harness({ row: trialRow, trialClaimed: true }),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.equal(r.body.data.maxInterviews, 3);
        assert.equal(r.body.data.metadata.sessionTimeoutMs, 900000);
        assert.equal(r.body.data.interviewsUsed, 1);
    });
    await test('trial receives only isolated credentials and never queries paid template', async () => {
        const h = harness({ row: trialRow, trialClaimed: true }),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.data.openaiApiKeys, ['test-isolated-trial-openai']);
        assert.equal(r.body.data.groqApiKey, 'test-isolated-trial-groq');
        assert.equal(h.filters.length, 0);
    });
    for (const field of [
        'HINTIO_TRIAL_OPENAI_API_KEY',
        'HINTIO_TRIAL_GROQ_API_KEY',
        'HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT',
        'HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT',
    ])
        await test('missing ' + field + ' fails closed before consuming trial credit', async () => {
            const h = harness({ row: trialRow, trialClaimed: true, env: { [field]: '' } }),
                r = await h.invoke();
            assert.equal(r.status, 503);
            assert.equal(r.body.code, 'TRIAL_CREDENTIALS_UNAVAILABLE');
            noSecrets(r);
            noConsume(h);
        });
    await test('paid path works with every trial setting absent', async () => {
        const h = harness({
                env: {
                    HINTIO_TRIAL_OPENAI_API_KEY: '',
                    HINTIO_TRIAL_GROQ_API_KEY: '',
                    HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: '',
                    HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT: '',
                },
            }),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.deepEqual(r.body.data.openaiApiKeys, ['test-openai-first']);
        assert.equal(r.body.data.groqApiKey, 'test-managed-row-groq');
    });
    await test('trial cannot reuse paid OpenAI key', async () => {
        const h = harness({ row: trialRow, trialClaimed: true, env: { HINTIO_TRIAL_OPENAI_API_KEY: 'test-openai-first' } }),
            r = await h.invoke();
        assert.equal(r.status, 503);
        noSecrets(r);
        noConsume(h);
    });
    await test('trial cannot reuse paid row Groq key', async () => {
        const h = harness({ row: trialRow, trialClaimed: true, env: { HINTIO_TRIAL_GROQ_API_KEY: 'test-managed-row-groq' } }),
            r = await h.invoke();
        assert.equal(r.status, 503);
        noSecrets(r);
        noConsume(h);
    });
    for (const [name, value] of [
        ['expired', new Date(Date.now() - 1000).toISOString()],
        ['too short', new Date(Date.now() + 300000).toISOString()],
        ['unbounded', 'invalid'],
        ['too long', new Date(Date.now() + 8 * 86400000).toISOString()],
    ])
        await test('trial expiry ' + name + ' is rejected without paid fallback', async () => {
            const h = harness({ row: trialRow, trialClaimed: true, env: { HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: value } }),
                r = await h.invoke();
            assert.equal(r.status, 503);
            noSecrets(r);
            noConsume(h);
        });
    await test('owner approved seven day trial credential window works', async () => {
        const expires = new Date(Date.now() + 7 * 86400000 - 60000).toISOString();
        const h = harness({
                row: trialRow,
                trialClaimed: true,
                env: { HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: expires, HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT: expires },
            }),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.equal(r.body.data.openaiModel, 'gpt-6-luna');
        assert.equal(r.body.data.metadata.sessionTimeoutMs, 900000);
    });
    await test('unclaimed trial cannot receive company credentials', async () => {
        const h = harness({ row: trialRow }),
            r = await h.invoke();
        assert.equal(r.status, 426);
        noSecrets(r);
        noConsume(h);
    });
    await test('trial ownership lookup failure fails closed', async () => {
        const h = harness({ row: trialRow, trialError: true }),
            r = await h.invoke();
        assert.equal(r.status, 503);
        noSecrets(r);
        noConsume(h);
    });
    await test('third trial credit remains usable', async () => {
        const h = harness({ row: { ...trialRow, interviews_used: 2 }, trialClaimed: true }),
            r = await h.invoke();
        assert.equal(r.status, 200);
        assert.equal(r.body.data.interviewsRemaining, 0);
        assert.equal(r.body.data.interviewsUsed, 3);
    });
    await test('invalid license denied', async () => {
        const h = harness({ row: null }),
            r = await h.invoke();
        assert.equal(r.status, 403);
        noSecrets(r);
        noConsume(h);
    });
    for (const [name, body, headers, status] of [
        ['body token mismatch', { accessToken: 'other123', consume: true }, {}, 401],
        ['invalid bearer', {}, { authorization: 'Basic invalid' }, 401],
        ['gateway token', {}, { authorization: 'Bearer HGW-1234567' }, 401],
        ['bad token chars', {}, { authorization: 'Bearer bad!123' }, 401],
        ['bad API key', {}, { apikey: 'wrong' }, 401],
        ['invalid intent', {}, { 'x-client-intent': 'anything' }, 403],
        ['internal bypass', { consume: true }, { 'x-runtime-secret': 'test-secret' }, 426],
        ['empty internal header', { consume: true }, { 'x-runtime-secret': '' }, 426],
        ['string consume', { consume: 'true' }, {}, 400],
        ['null JSON', null, {}, 400],
        ['oversized JSON', 'x'.repeat(1025), {}, 413],
    ])
        await test(name, async () => {
            const h = harness(),
                r = await h.invoke(body, headers);
            assert.equal(r.status, status);
            noSecrets(r);
            noConsume(h);
        });
    for (const [name, env] of [
        ['missing OpenAI', { HINTIO_MANAGED_OPENAI_API_KEY: '' }],
        ['ignore plural-only OpenAI', { HINTIO_MANAGED_OPENAI_API_KEY: '', HINTIO_MANAGED_OPENAI_API_KEYS: 'not-allowed' }],
    ])
        await test(name + ' does not consume', async () => {
            const h = harness({ env }),
                r = await h.invoke();
            assert.equal(r.status, 503);
            noSecrets(r);
            noConsume(h);
        });
    await test('missing Groq does not consume', async () => {
        const h = harness({ row: { ...base, groq_api_key: '' } }),
            r = await h.invoke();
        assert.equal(r.status, 503);
        noSecrets(r);
        noConsume(h);
    });
    await test('company env Groq fallback', async () => {
        const h = harness({ row: { ...base, groq_api_key: '' }, env: { HINTIO_MANAGED_GROQ_API_KEY: 'test-env-groq' } }),
            r = await h.invoke();
        assert.equal(r.body.data.groqApiKey, 'test-env-groq');
    });
    await test('fallback selects only managed company free_download records', async () => {
        const h = harness({ row: { ...base, groq_api_key: '' }, fallback: true }),
            r = await h.invoke();
        assert.equal(r.body.data.groqApiKey, 'test-fallback-groq');
        assert.deepEqual(h.filters, [
            ['provider_mode', 'managed'],
            ['metadata->>issued_for', 'free_download'],
        ]);
    });
    for (const prefix of ['gateway-auth-ip', 'gateway-auth', 'legacy-start'])
        await test(prefix + ' durable limit fails closed', async () => {
            const h = harness({ denyLimit: prefix }),
                r = await h.invoke();
            assert.equal(r.status, 429);
            noSecrets(r);
            noConsume(h);
        });
    for (const [name, option] of [
        ['resolver error', { resolveError: true }],
        ['limiter unavailable', { limitError: true }],
        ['consume error', { consumeError: true }],
    ])
        await test(name + ' fails closed', async () => {
            const h = harness(option),
                r = await h.invoke();
            assert.equal(r.status, 503);
            noSecrets(r);
        });
    await test('post-consume eligibility recheck', async () => {
        const h = harness({ after: { ...base, metadata: { ...base.metadata, legacyDesktopCompatibility: null } } }),
            r = await h.invoke();
        assert.equal(r.status, 426);
        noSecrets(r);
    });
    await test('post-consume exhausted/revoked row', async () => {
        const h = harness({ after: null }),
            r = await h.invoke();
        assert.equal(r.status, 426);
        noSecrets(r);
    });
    await test('paid UI timer clamps to signed 32bit', async () => {
        const far = new Date(Date.now() + 90 * 86400000).toISOString();
        const h = harness({ row: { ...base, expires_at: far, metadata: { ...base.metadata, legacyDesktopCompatibilityUntil: far } } }),
            r = await h.invoke();
        assert.equal(r.body.data.metadata.sessionTimeoutMs, 2147483647);
    });
    await test('preflight forwards gateway status but strips every raw secret/metadata', async () => {
        const h = harness(),
            r = await h.invoke({ accessToken: token, consume: false });
        assert.equal(r.status, 200);
        noSecrets(r);
        assert(!JSON.stringify(r.body).includes('must-not-leak'));
        noConsume(h);
        const c = h.calls.find(c => c.name === 'fetch');
        assert.equal(JSON.parse(c.init.body).operation, 'status');
        assert.equal(h.calls.filter(c => c.name === 'resolve_provider_secrets').length, 0);
    });
    await test('preflight upstream rejection sanitized', async () => {
        const h = harness({ upstreamStatus: 403, upstream: { error: 'must-not-leak' } }),
            r = await h.invoke({ consume: false });
        assert.equal(r.status, 403);
        noSecrets(r);
        assert(!JSON.stringify(r.body).includes('must-not-leak'));
    });
    await test('actual released 1.0.4 resolver consumer accepts contract', async () => {
        const old = execFileSync('git', ['show', '8f85d84:src/utils/providerRuntime.js'], {
            cwd: require('node:path').resolve(__dirname, '..'),
            encoding: 'utf8',
            maxBuffer: 4e6,
        });
        const start = old.indexOf('async function resolveProviderSecrets(');
        assert(start > 0);
        const tail = old.slice(start);
        const end = tail.indexOf('\nfunction ');
        assert(end > 0);
        const fn = tail.slice(0, end);
        const h = harness();
        const poolSource = execFileSync('git', ['show', '8f85d84:src/utils/llmKeyPool.js'], {
            cwd: require('node:path').resolve(__dirname, '..'),
            encoding: 'utf8',
        });
        const poolContext = { module: { exports: {} }, Date, console };
        vm.runInNewContext(poolSource, poolContext);
        const context = {
            parseApiKeys: poolContext.module.exports.parseApiKeys,
            AbortSignal,
            Date,
            process: { env: {} },
            supabaseConfig: { url: 'https://test.invalid', anonKey: 'test-anon' },
            getCredentials: () => ({ supabaseUrl: 'https://test.invalid', supabaseAnonKey: 'test-anon' }),
            runtimeProviderSecrets: null,
            runtimeSecretsToken: '',
            runtimeSecretsResolvedAt: 0,
            PROVIDER_SECRETS_CACHE_TTL_MS: 1800000,
            fetch: async (url, init) => {
                const result = await h.handler(new Request(url, init));
                return result;
            },
        };
        vm.runInNewContext(fn + '\nglobalThis.resolve = resolveProviderSecrets;', context);
        const result = await context.resolve(token, { consume: true });
        assert.equal(result.success, true);
        assert.equal(result.data.openaiApiKeys[0], 'test-openai-first');
        assert.equal(result.data.groqApiKey, 'test-managed-row-groq');
        assert.equal(result.data.secretsIssued, true);
    });
    console.log(JSON.stringify({ passed: count, failed: 0, offlineOnly: true }, null, 2));
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
