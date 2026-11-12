const fs = require('node:fs');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const config = require('../src/utils/supabaseConfig');
let stage = 'initialization';
async function main() {
    if (!process.argv.includes('--allow-live-providers')) throw Error('Live providers require explicit flag');
    const qa = JSON.parse(fs.readFileSync(0, 'utf8'));
    const call = async (token, consume) => {
        const r = await fetch(config.url + '/functions/v1/resolve-provider-secrets', {
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
        return { status: r.status, body: await r.json() };
    };
    const report = { checkedAt: new Date().toISOString(), customerSessionsConsumed: 0, providerKeysSaved: false };
    stage = 'nonsecret trial preflight';
    const preflight = await call(qa.trialToken, false);
    assert.equal(preflight.status, 200);
    assert(!/openaiApiKeys|groqApiKey|gsk_|sk-proj-/.test(JSON.stringify(preflight.body)));
    report.nonsecretPreflight = true;
    stage = 'released 1.0.4 consumer';
    const old = execFileSync('git', ['show', '8f85d84:src/utils/providerRuntime.js'], { encoding: 'utf8', maxBuffer: 4e6 });
    const tail = old.slice(old.indexOf('async function resolveProviderSecrets('));
    const fn = tail.slice(0, tail.indexOf('\nfunction '));
    const pool = { module: { exports: {} }, Date, console: { log() {}, warn() {}, error() {} } };
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
    vm.runInNewContext(fn + '\nglobalThis.resolve=resolveProviderSecrets;', context);
    const result = await context.resolve(qa.trialToken, { consume: true });
    assert(result.success);
    const trial = result.data;
    assert.equal(trial.interviewsUsed, 1);
    assert.equal(trial.maxInterviews, 3);
    assert.equal(trial.metadata.sessionTimeoutMs, 900000);
    assert.equal(trial.openaiModel, 'gpt-6-luna');
    assert.equal(trial.openaiApiKeys.length, 1);
    assert(trial.groqApiKey);
    assert.equal(trial.geminiApiKeys.length, 0);
    report.released104Consumer = true;
    report.trialSessionMinutes = 15;
    report.trialModel = trial.openaiModel;
    stage = 'paid regression and credential separation';
    const paid = await call(qa.paidToken, true);
    assert.equal(paid.status, 200);
    assert.equal(paid.body.data.interviewsUsed, 1);
    assert.notEqual(paid.body.data.openaiApiKeys[0], trial.openaiApiKeys[0]);
    assert.notEqual(paid.body.data.groqApiKey, trial.groqApiKey);
    assert(paid.body.data.metadata.sessionTimeoutMs > 900000);
    report.trialAndPaidKeysDistinct = true;
    report.paidQaStartSucceeded = true;
    stage = 'trial GPT request';
    const chat = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + trial.openaiApiKeys[0], 'content-type': 'application/json' },
        body: JSON.stringify({
            model: trial.openaiModel,
            messages: [{ role: 'user', content: 'Reply with exactly HINTIO_TRIAL_OK.' }],
            max_completion_tokens: 128,
            reasoning_effort: 'none',
            temperature: 1,
        }),
        signal: AbortSignal.timeout(60000),
    });
    assert.equal(chat.status, 200);
    const answer = await chat.json();
    assert.match(answer.choices?.[0]?.message?.content || '', /HINTIO_TRIAL_OK/);
    report.trialGptResponse = true;
    report.returnedModel = answer.model;
    stage = 'trial synthetic speech';
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync('out/billing-lifecycle-2026-11-10/speech-qa.wav')], { type: 'audio/wav' }), 'speech-qa.wav');
    form.append('model', 'whisper-large-v3-turbo');
    form.append('language', 'en');
    const speech = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + trial.groqApiKey },
        body: form,
        signal: AbortSignal.timeout(60000),
    });
    assert.equal(speech.status, 200);
    assert.match((await speech.json()).text || '', /quality\s+check/i);
    report.syntheticSpeechRecognized = true;
    stage = 'trial OpenAI restricted endpoints';
    const files = await fetch('https://api.openai.com/v1/files?limit=1', {
        headers: { authorization: 'Bearer ' + trial.openaiApiKeys[0] },
        signal: AbortSignal.timeout(30000),
    });
    assert.equal(files.status, 403);
    await files.body?.cancel();
    report.openaiFilesDenied = true;
    stage = 'trial Groq model restriction';
    const blocked = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + trial.groqApiKey, 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: 'Hi' }], max_tokens: 1 }),
        signal: AbortSignal.timeout(30000),
    });
    assert.equal(blocked.status, 403);
    await blocked.body?.cancel();
    report.groqChatModelDenied = true;
    stage = 'remaining trial starts';
    for (let expected = 2; expected <= 3; expected++) {
        const r = await call(qa.trialToken, true);
        assert.equal(r.status, 200);
        assert.equal(r.body.data.interviewsUsed, expected);
    }
    const exhausted = await call(qa.trialToken, true);
    assert.equal(exhausted.status, 403);
    assert(!exhausted.body.data?.openaiApiKeys?.length);
    report.threeTrialStartsSucceeded = true;
    report.fourthStartDenied = true;
    report.status = 'passed';
    fs.writeFileSync('out/trial-isolation-2026-11-12/LIVE-TRIAL-ISOLATION.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
}
main().catch(() => {
    console.error('Trial isolation QA failed at: ' + stage + '. Credential values and response bodies withheld.');
    process.exitCode = 1;
});
