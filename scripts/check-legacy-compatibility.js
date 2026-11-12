const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const config = require('../src/utils/supabaseConfig');
async function main() {
    const qa = JSON.parse(fs.readFileSync(0, 'utf8'));
    const url = config.url + '/functions/v1/resolve-provider-secrets';
    const mode = process.argv.includes('--consume') ? 'consume' : 'negative';
    async function call(token, consume) {
        return fetch(url, {
            method: 'POST',
            headers: {
                authorization: 'Bearer ' + token,
                apikey: config.anonKey,
                'content-type': 'application/json',
                'x-client-intent': 'desktop-runtime',
            },
            body: JSON.stringify({ accessToken: token, consume }),
            signal: AbortSignal.timeout(30000),
        });
    }
    const report = { mode, checkedAt: new Date().toISOString() };
    const status = await call(qa.qa_token, false);
    const statusText = await status.text();
    assert.equal(status.status, 200, 'non-consuming preflight rejected: ' + status.status);
    assert(!/openaiApiKeys|groqApiKey|sk-|gsk_/.test(statusText), 'preflight returned a provider credential');
    report.preflightNonsecret = true;
    if (mode === 'negative') {
        const r = await call(qa.qa_token, true);
        const text = await r.text();
        assert.equal(r.status, 426, 'unflagged paid QA was not refused');
        assert(!/openaiApiKeys|groqApiKey|sk-|gsk_/.test(text));
        report.unflaggedDenied = true;
        const invalid = await call('SKI-invalid_legacy_qa_1234567890', true);
        assert.equal(invalid.status, 403, 'invalid license was not refused');
        report.invalidDenied = true;
    } else {
        const old = execFileSync('git', ['show', '8f85d84:src/utils/providerRuntime.js'], { encoding: 'utf8', maxBuffer: 4e6 });
        const tail = old.slice(old.indexOf('async function resolveProviderSecrets('));
        const fn = tail.slice(0, tail.indexOf('\nfunction '));
        const pool = { module: { exports: {} }, Date, console };
        vm.runInNewContext(execFileSync('git', ['show', '8f85d84:src/utils/llmKeyPool.js'], { encoding: 'utf8' }), pool);
        const context = {
            parseApiKeys: pool.module.exports.parseApiKeys,
            AbortSignal,
            Date,
            process: { env: {} },
            supabaseConfig: config,
            getCredentials: () => ({ supabaseUrl: config.url, supabaseAnonKey: config.anonKey }),
            runtimeProviderSecrets: null,
            runtimeSecretsToken: '',
            runtimeSecretsResolvedAt: 0,
            PROVIDER_SECRETS_CACHE_TTL_MS: 1800000,
            fetch,
        };
        vm.runInNewContext(fn + '\nglobalThis.resolve = resolveProviderSecrets;', context);
        const resolved = await context.resolve(qa.qa_token, { consume: true });
        assert(resolved.success, 'released resolver rejected response');
        const d = resolved.data;
        assert(d.openaiApiKeys?.length === 1 && d.groqApiKey && d.creditConsumed === true);
        assert.equal(d.interviewsUsed, 1, 'QA credit was not consumed exactly once');
        assert.equal(d.geminiApiKeys?.length || 0, 0);
        report.released104Consumer = true;
        report.accessPlan = d.metadata.plan_type;
        report.appSessionTimeoutMs = d.metadata.sessionTimeoutMs;
        report.maxInterviews = d.maxInterviews;
        report.qaCreditsUsed = d.interviewsUsed;
        const answer = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + d.openaiApiKeys[0], 'content-type': 'application/json' },
            body: JSON.stringify({
                model: d.openaiModel,
                messages: [{ role: 'user', content: 'Reply with exactly HINTIO_LEGACY_OK.' }],
                max_completion_tokens: 128,
                reasoning_effort: 'none',
                temperature: 1,
            }),
            signal: AbortSignal.timeout(60000),
        });
        assert.equal(answer.status, 200, 'OpenAI rejected direct legacy request: ' + answer.status);
        const body = await answer.json();
        assert.match(body.choices?.[0]?.message?.content || '', /HINTIO_LEGACY_OK/);
        report.gptDirectResponse = true;
        report.model = body.model;
        const form = new FormData();
        form.append('file', new Blob([fs.readFileSync('out/billing-lifecycle-2026-11-10/speech-qa.wav')], { type: 'audio/wav' }), 'speech-qa.wav');
        form.append('model', 'whisper-large-v3-turbo');
        form.append('language', 'en');
        const speech = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + d.groqApiKey },
            body: form,
            signal: AbortSignal.timeout(60000),
        });
        assert.equal(speech.status, 200, 'Groq rejected direct legacy request: ' + speech.status);
        const transcription = await speech.json();
        assert.match(transcription.text || '', /quality\s+check/i);
        report.syntheticSpeechRecognized = true;
    }
    report.status = 'passed';
    fs.writeFileSync(
        process.env.HINTIO_LEGACY_QA_REPORT_PATH || 'out/customer-access-2026-11-12/live-legacy-' + mode + '.json',
        JSON.stringify(report, null, 2)
    );
    console.log(JSON.stringify(report, null, 2));
}
main().catch(() => {
    console.error('Legacy QA failed. Provider credentials and response bodies withheld.');
    process.exitCode = 1;
});
