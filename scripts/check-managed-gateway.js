const fs = require('node:fs'),
    assert = require('node:assert/strict'),
    { randomUUID } = require('node:crypto');
async function main() {
    const qa = JSON.parse(fs.readFileSync(0, 'utf8'));
    const config = require('../src/utils/supabaseConfig');
    const url = config.url + '/functions/v1/managed-runtime';
    async function call(credential, p) {
        const r = await fetch(url, {
            method: 'POST',
            headers: { authorization: 'Bearer ' + credential, apikey: config.anonKey, 'content-type': 'application/json' },
            body: JSON.stringify(p),
            signal: AbortSignal.timeout(95000),
        });
        return { status: r.status, text: await r.text() };
    }
    const status = await call(qa.qa_token, { operation: 'status' });
    assert.equal(status.status, 200, status.text);
    assert.ok(!/sk-|gsk_|groqApiKey|openaiApiKeys|geminiApiKey/.test(status.text));
    const requestId = randomUUID();
    const start = await call(qa.qa_token, { operation: 'session', requestId });
    assert.equal(start.status, 200, start.text);
    const session = JSON.parse(start.text).data;
    assert.match(session.gatewayToken, /^HGW-[a-f0-9]{64}$/);
    const retry = await call(qa.qa_token, { operation: 'session', requestId });
    assert.equal(retry.status, 200, retry.text);
    assert.equal(JSON.parse(retry.text).data.gatewayToken, session.gatewayToken);
    const checks = [];
    for (const [name, p, credential, expected] of [
        ['missing session', { operation: 'chat', messages: [] }, qa.qa_token, 401],
        ['forged session', { operation: 'chat', messages: [] }, 'HGW-' + '0'.repeat(64), 403],
        [
            'remote screenshot URL',
            { operation: 'chat', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: 'http://169.254.169.254' } }] }] },
            session.gatewayToken,
            400,
        ],
    ]) {
        const r = await call(credential, p);
        assert.equal(r.status, expected, r.text);
        checks.push({ name, status: r.status });
    }
    const answer = await call(session.gatewayToken, {
        operation: 'chat',
        messages: [{ role: 'user', content: 'Reply with exactly HINTIO_QA_OK and nothing else.' }],
        maxTokens: 128,
        live: true,
    });
    assert.equal(answer.status, 200, answer.text);
    const body = JSON.parse(answer.text);
    assert.equal(body.choices[0].message.content.trim(), 'HINTIO_QA_OK');
    const stream = await call(session.gatewayToken, {
        operation: 'chat',
        messages: [{ role: 'user', content: 'Reply with HINTIO_STREAM_OK only.' }],
        maxTokens: 128,
        live: true,
        stream: true,
    });
    assert.equal(stream.status, 200, stream.text);
    assert.ok(stream.text.includes('[DONE]'));
    const speech = await call(session.gatewayToken, {
        operation: 'transcribe',
        audio: fs.readFileSync('out/billing-lifecycle-2026-11-10/speech-qa.wav').toString('base64'),
        mimeType: 'audio/wav',
        language: 'en',
    });
    assert.equal(speech.status, 200, speech.text);
    assert.match(speech.text, /quality\s+check/i);
    const proof = {
        status: 'passed',
        provider: 'OpenAI',
        model: body.model,
        gptMarkerMatched: true,
        streamCompleted: true,
        syntheticSpeechRecognized: true,
        idempotentSessionCredential: true,
        providerKeysReturned: false,
        negativeChecks: checks,
    };
    fs.writeFileSync('out/security-review-2026-11-12/LIVE-GATEWAY.json', JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof, null, 2));
}
main().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
});
