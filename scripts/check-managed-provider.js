const fs = require('node:fs'),
    path = require('node:path'),
    assert = require('node:assert/strict'),
    dotenv = require('dotenv');
async function main() {
    if (!process.argv.includes('--allow-live-providers'))
        throw Error('Explicit --allow-live-providers is required for the tiny GPT and synthetic speech requests.');
    const qa = JSON.parse(fs.readFileSync(0, 'utf8')),
        root = path.resolve(__dirname, '..'),
        out = path.join(root, 'out/billing-lifecycle-2026-11-10');
    const publicEnv = dotenv.parse(fs.readFileSync(path.join(root, 'hintio-website/.env.local')));
    const headers = {
        authorization: 'Bearer ' + qa.qa_token,
        apikey: publicEnv.VITE_SUPABASE_ANON_KEY,
        'content-type': 'application/json',
        'x-client-intent': 'desktop-runtime',
        'user-agent': 'Hintio-QA/1.0',
    };
    const resolve = async consume => {
        const response = await fetch('https://vsybqtunyuanxspxhzue.supabase.co/functions/v1/resolve-provider-secrets', {
            method: 'POST',
            headers,
            body: JSON.stringify({ accessToken: qa.qa_token, consume }),
            signal: AbortSignal.timeout(30000),
        });
        const result = await response.json();
        if (!response.ok) throw Error('Resolver HTTP ' + response.status + '; provider values were not logged');
        return result.data;
    };
    const validation = await resolve(false);
    assert.equal(validation.llmProvider, 'openai');
    assert.equal(validation.providerConfiguration.openaiConfigured, true);
    assert.equal(validation.providerConfiguration.groqConfigured, true);
    assert.equal(validation.groqApiKey, '');
    assert.equal(validation.openaiApiKeys.length, 0);
    assert.equal(validation.creditConsumed, false);
    if(process.argv.includes('--preflight-only')) {
        const result={resolverValidation:true,provider:validation.llmProvider,openaiConfigured:validation.providerConfiguration.openaiConfigured,speechConfigured:validation.providerConfiguration.groqConfigured,secretsIssued:validation.secretsIssued,creditConsumed:validation.creditConsumed,remainingPaidTimeBounded:validation.metadata.sessionTimeoutMs>0&&validation.metadata.sessionTimeoutMs<=120000,qaInterviewsUsed:validation.interviewsUsed};
        assert.equal(result.remainingPaidTimeBounded,true);
        fs.writeFileSync(path.join(out,'LIVE-PREFLIGHT-FINAL.json'),JSON.stringify(result,null,2));
        console.log(JSON.stringify(result,null,2));return;
    }
    const access = await resolve(true);
    assert.equal(access.secretsIssued, true);
    assert.equal(access.creditConsumed, true);
    assert.equal(access.interviewsUsed, 1);
    console.log('Live resolver passed: paid-mode QA access has GPT and speech; only one QA session consumed.');
    const results = await Promise.allSettled([
        (async () => {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { authorization: 'Bearer ' + access.openaiApiKeys[0], 'content-type': 'application/json' },
                body: JSON.stringify({
                    model: access.openaiModel,
                    messages: [{ role: 'user', content: 'Reply with exactly HINTIO_QA_OK and nothing else.' }],
                    max_completion_tokens: 128,
                    reasoning_effort: /gpt-5\.6/.test(access.openaiModel) ? 'none' : 'low',
                }),
                signal: AbortSignal.timeout(35000),
            });
            const body = await response.json();
            return {
                service: 'OpenAI',
                httpStatus: response.status,
                requestedModel: access.openaiModel,
                returnedModel: body.model || null,
                markerMatched: body.choices?.[0]?.message?.content?.trim() === 'HINTIO_QA_OK',
                errorCode: body.error?.code || null,
            };
        })(),
        (async () => {
            const form = new FormData();
            form.append('file', new Blob([fs.readFileSync(path.join(out, 'speech-qa.wav'))], { type: 'audio/wav' }), 'speech-qa.wav');
            form.append('model', 'whisper-large-v3-turbo');
            form.append('language', 'en');
            form.append('response_format', 'json');
            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { authorization: 'Bearer ' + access.groqApiKey },
                body: form,
                signal: AbortSignal.timeout(35000),
            });
            const body = await response.json();
            return {
                service: 'Groq speech-to-text',
                httpStatus: response.status,
                syntheticAudioOnly: true,
                recognizedQualityCheck: /quality\s+check/i.test(body.text || ''),
                errorCode: body.error?.code || null,
            };
        })(),
    ]);
    const providers = results.map((r, i) =>
        r.status === 'fulfilled' ? r.value : { service: i ? 'Groq speech-to-text' : 'OpenAI', transportFailed: true }
    );
    const report = {
        resolverValidation: true,
        secretsHiddenDuringValidation: true,
        qaSessionsConsumed: 1,
        customerSessionsConsumed: 0,
        providers,
        providerSecretsSaved: false,
    };
    fs.writeFileSync(path.join(out, 'LIVE-PROVIDER-CHECK.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    if (providers.some(p => p.httpStatus !== 200) || !providers[0].markerMatched || !providers[1].recognizedQualityCheck) process.exitCode = 1;
}
main().catch(e => {
    console.error(e.message);
    process.exitCode = 1;
});
