export const analyticsCatalog = {
    web: {
        page_viewed: ['/', '/workflows', '/shortcuts', '/get-started', '/download', '/access', '/pricing', '/privacy', '/terms', '/contact'],
        download_clicked: ['production', 'preview'],
        trial_clicked: ['free_trial'],
        upgrade_clicked: ['monthly', 'yearly'],
    },
    desktop: {
        session_started: ['speaker_only', 'mic_only', 'both', 'none'],
        onboarding_step: ['welcome', 'context', 'review'],
        onboarding_completed: ['blank', 'provided'],
        session_start_blocked: ['missing_key', 'setup_required', 'update_required', 'initialization_failed'],
        session_profile: ['interview', 'technical-interview', 'sales', 'meeting', 'presentation', 'negotiation', 'exam'],
        session_answered: ['completed'],
        session_ended: ['under_1m', '1_to_5m', '5_to_15m', '15m_plus'],
        feature_used: ['single_screenshot', 'multi_screenshot', 'debug_screenshot', 'history', 'settings', 'ai_context'],
        app_launched: ['first', 'returning'],
    },
} as const;

// Events that join a browser, an install and an account. Their values are not from a fixed list:
// a one-time random link code (UUID) created by the desktop app, or 'signed_in', which the edge
// function replaces with a keyed hash of the account ID before storing it.
export const linkEvents = {
    web: { desktop_linked: 'link_code', account_linked: 'signed_in' },
    desktop: { web_link_opened: 'link_code' },
} as const;

export const linkEventNames: readonly string[] = ['web_link_opened', 'desktop_linked', 'account_linked'];

export type WebAnalyticsEvent = {
    [Event in keyof typeof analyticsCatalog.web]: [event: Event, value: (typeof analyticsCatalog.web)[Event][number]];
}[keyof typeof analyticsCatalog.web];

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const version = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/;

export function parseAnalyticsEvent(input: unknown) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
    const data = input as Record<string, unknown>;
    const { source, event, value, actorId, eventId, distribution } = data;
    if (source !== 'web' && source !== 'desktop') return null;
    if (typeof actorId !== 'string' || !uuid.test(actorId) || typeof eventId !== 'string' || !uuid.test(eventId)) return null;
    if (typeof event !== 'string' || typeof value !== 'string') return null;

    const events: Record<string, readonly string[]> = analyticsCatalog[source];
    const links: Record<string, string> = linkEvents[source];
    const valid = Object.hasOwn(events, event)
        ? events[event].includes(value)
        : Object.hasOwn(links, event) && (links[event] === 'link_code' ? uuid.test(value) : value === links[event]);
    if (!valid) return null;

    const common = { source, event, value, actorId, eventId };
    if (source === 'web') return Object.keys(data).length === 5 ? { ...common, version: null, distribution: null } : null;
    if (
        Object.keys(data).length !== 7 ||
        typeof data.version !== 'string' ||
        !version.test(data.version) ||
        (distribution !== 'installer' && distribution !== 'store')
    )
        return null;
    return { ...common, version: data.version, distribution };
}

// A pseudonymous account reference: the first 128 bits of HMAC-SHA256(key, account ID).
// Without the key the reference cannot be matched to an account.
export async function accountReference(key: string, accountId: string) {
    if (key.length < 32 || !uuid.test(accountId)) return null;
    const encoder = new TextEncoder();
    const hmacKey = await crypto.subtle.importKey('raw', encoder.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const digest = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(accountId)));
    return `acct_${Array.from(digest.subarray(0, 16), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}
