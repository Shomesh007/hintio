// Dedicated trial credentials only. Provider-side restrictions and expiry must also be configured.
type Environment = (name: string) => string | undefined;
export class TrialCredentialError extends Error {
    readonly code = 'TRIAL_CREDENTIALS_UNAVAILABLE';
    constructor() {
        super('Free trial service is being configured. Please retry later; no trial session was used.');
    }
}
const SESSION_MS = 15 * 60 * 1000;
const START_BUFFER_MS = 60 * 1000;
const MAX_CREDENTIAL_TTL_MS = 24 * 60 * 60 * 1000;
function singleKey(value: string | undefined): string {
    const key = (value || '').trim();
    if (!key || /[\s,;]/.test(key)) throw new TrialCredentialError();
    return key;
}
function expiry(value: string | undefined, now: number): number {
    const text = (value || '').trim();
    if (!/(Z|[+-]\d{2}:\d{2})$/.test(text)) throw new TrialCredentialError();
    const time = Date.parse(text);
    if (!Number.isFinite(time) || time < now + SESSION_MS + START_BUFFER_MS || time > now + MAX_CREDENTIAL_TTL_MS) throw new TrialCredentialError();
    return time;
}
export function selectTrialCredentials(env: Environment, additionalPaidKeys: readonly string[] = [], now = Date.now()) {
    const openai = singleKey(env('HINTIO_TRIAL_OPENAI_API_KEY'));
    const groq = singleKey(env('HINTIO_TRIAL_GROQ_API_KEY'));
    const paid = additionalPaidKeys.concat(
        ...[
            'HINTIO_MANAGED_OPENAI_API_KEY',
            'HINTIO_MANAGED_OPENAI_API_KEYS',
            'OPENAI_API_KEY',
            'OPENAI_API_KEYS',
            'HINTIO_MANAGED_GROQ_API_KEY',
            'GROQ_API_KEY',
        ].map(name => (env(name) || '').split(/[\s,;]+/).filter(Boolean))
    );
    if (paid.includes(openai) || paid.includes(groq) || openai === groq) throw new TrialCredentialError();
    const openaiExpiry = expiry(env('HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT'), now);
    const groqExpiry = expiry(env('HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT'), now);
    const model = (env('HINTIO_TRIAL_OPENAI_MODEL') || 'gpt-5.6-luna').trim();
    if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new TrialCredentialError();
    return { openai, groq, model, expiresAt: Math.min(openaiExpiry, groqExpiry), sessionTimeoutMs: SESSION_MS };
}
