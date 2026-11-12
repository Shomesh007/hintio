const config = require('./supabaseConfig');
async function gatewayRequest(credential, payload, timeoutMs = 90000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(config.url.replace(/\/$/, '') + '/functions/v1/managed-runtime', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + credential, apikey: config.anonKey, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}
async function gatewayJson(credential, payload) {
    const response = await gatewayRequest(credential, payload, 20000);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Hintio session service unavailable');
    return body;
}
function gatewayChat(sessionToken, options) {
    return gatewayRequest(
        sessionToken,
        {
            operation: 'chat',
            messages: options.messages,
            stream: Boolean(options.stream),
            maxTokens: options.maxTokens,
            live: Boolean(options.live),
            deeper: Boolean(options.deeper),
        },
        options.timeoutMs || 90000
    );
}
async function gatewayTranscribe(sessionToken, audio, mimeType, language) {
    const response = await gatewayRequest(
        sessionToken,
        { operation: 'transcribe', audio: Buffer.from(audio).toString('base64'), mimeType, language },
        45000
    );
    if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Speech service unavailable');
    }
    return (await response.text()).trim();
}
module.exports = { gatewayRequest, gatewayJson, gatewayChat, gatewayTranscribe };
