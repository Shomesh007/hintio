const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PROVIDERS, DEFAULT_PROVIDER_ID, getProvider, requestChatCompletion, describeError } = require('../src/utils/llmProvider');
const { LlmKeyPool } = require('../src/utils/llmKeyPool');

const runtime = fs.readFileSync(path.join(__dirname, '../src/utils/providerRuntime.js'), 'utf8');
const start = runtime.indexOf('function getLlmProviders()');
const end = runtime.indexOf('/** True when', start);
function selectProviders(keys, preferred = '') {
    const pools = { openai: new LlmKeyPool(), gemini: new LlmKeyPool() };
    const select = vm.runInNewContext('(' + runtime.slice(start, end).trim() + ')', {
        process: { env: { LLM_PROVIDER: preferred } },
        runtimeProviderSecrets: null,
        PROVIDERS,
        DEFAULT_PROVIDER_ID,
        keyPools: pools,
        getProviderKeys: id => keys[id] || [],
        getProvider,
        getProviderModel: id => getProvider(id).defaultModel,
    });
    return Array.from(select());
}

test('GPT configuration does not include Gemini even when both have credentials', () => {
    assert.deepEqual(
        selectProviders({ openai: ['test-openai'], gemini: ['test-google'] }).map(e => e.provider.id),
        ['openai']
    );
});

test('missing GPT credentials cannot silently select a legacy Gemini key', () => {
    assert.equal(selectProviders({ gemini: ['test-google'] }).length, 0);
});

test('an explicitly selected alternative stays within that provider', () => {
    assert.deepEqual(
        selectProviders({ openai: ['test-openai'], gemini: ['test-google'] }, 'gemini').map(e => e.provider.id),
        ['gemini']
    );
});

test('a GPT rate limit cannot send the request to Google', async () => {
    const originalFetch = global.fetch;
    const urls = [];
    global.fetch = async url => {
        urls.push(url);
        return new Response('{"error":{"code":"rate_limit_exceeded"}}', { status: 429, headers: { 'retry-after': '30' } });
    };
    try {
        await assert.rejects(
            requestChatCompletion({
                providers: selectProviders({ openai: ['test-openai'], gemini: ['test-google'] }),
                messages: [{ role: 'user', content: 'Synthetic test' }],
                hedgeDelayMs: 0,
            }),
            /OpenAI request limit reached/
        );
        assert.equal(urls.length, 1);
        assert.ok(urls.every(url => url.startsWith('https://api.openai.com/')));
    } finally {
        global.fetch = originalFetch;
    }
});

test('a cooling key does not trigger another network request before retry-after', async () => {
    const pool = new LlmKeyPool(['test-key']);
    pool.noteFailure(0, { status: 429, headers: new Headers({ 'retry-after': '30' }) });
    const originalFetch = global.fetch;
    let requests = 0;
    global.fetch = async () => {
        requests++;
        throw new Error('Must not run');
    };
    try {
        await assert.rejects(
            requestChatCompletion({ providers: [{ provider: PROVIDERS.openai, pool }], messages: [], hedgeDelayMs: 0 }),
            error => error.status === 429 && error.retryAfterMs > 0
        );
        assert.equal(requests, 0);
    } finally {
        global.fetch = originalFetch;
    }
});

test('quota failures explain billing instead of claiming a retry is in progress', () => {
    const text = describeError(PROVIDERS.openai, 429, '{"error":{"code":"insufficient_quota"}}');
    assert.match(text, /quota or billing/);
    assert.doesNotMatch(text, /Retrying/);
    assert.doesNotMatch(describeError(PROVIDERS.openai, 429), /Retrying/);
});

test('provider requests include content safety instructions without mutating user messages', async () => {
    const { CONTENT_SAFETY_POLICY } = require('../src/utils/llmProvider');
    const messages = [{ role: 'user', content: 'Synthetic benign test' }];
    const original = global.fetch;
    let sent;
    global.fetch = async (url, init) => {
        sent = JSON.parse(init.body);
        return Response.json({ choices: [{ message: { content: 'Synthetic safe answer' } }] });
    };
    try {
        await requestChatCompletion({ providers: [{ provider: PROVIDERS.openai, apiKey: 'synthetic' }], messages, hedgeDelayMs: 0 });
        assert.equal(sent.messages[0].content, CONTENT_SAFETY_POLICY);
        assert.equal(sent.messages[1].content, messages[0].content);
        assert.equal(messages.length, 1);
    } finally {
        global.fetch = original;
    }
});

test('managed transport bypasses all local key pools and preserves streaming responses', async () => {
    let received;
    const result = await requestChatCompletion({
        providers: [
            {
                provider: PROVIDERS.openai,
                model: 'managed-gpt',
                transport: async opts => {
                    received = opts;
                    return new Response('data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } });
                },
            },
        ],
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
        live: true,
        maxTokens: 600,
    });
    assert.equal(received.stream, true);
    assert.equal(result.provider, 'openai');
    assert.equal(await result.response.text(), 'data: [DONE]\n\n');
});

test('managed expiry errors do not ask customers to replace company provider keys', async () => {
    await assert.rejects(
        requestChatCompletion({
            providers: [
                {
                    provider: PROVIDERS.openai,
                    transport: async () => Response.json({ error: 'Session expired. Start a new session.' }, { status: 403 }),
                },
            ],
            messages: [{ role: 'user', content: 'Hi' }],
        }),
        error => error.status === 403 && error.message === 'Session expired. Start a new session.'
    );
});

for (const effort of ['none', 'low', 'medium']) {
    test('GPT-6 Luna preserves ' + effort + ' reasoning without unsupported temperature', () => {
        const { buildChatBody } = require('../src/utils/llmProvider');
        const body = buildChatBody(PROVIDERS.openai, {
            model: 'gpt-6-luna',
            messages: [{ role: 'user', content: 'Synthetic compatibility check' }],
            temperature: 0.1,
            maxTokens: 600,
            reasoningEffort: effort,
        });
        assert.equal(body.model, 'gpt-6-luna');
        assert.equal(body.reasoning_effort, effort);
        assert.equal(body.max_completion_tokens, 600);
        assert.equal('temperature' in body, false);
    });
}
test('older OpenAI models retain their existing sampling setting', () => {
    const { buildChatBody } = require('../src/utils/llmProvider');
    assert.equal(buildChatBody(PROVIDERS.openai, { model: 'gpt-5-mini', temperature: 1 }).temperature, 1);
});
