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
    },
} as const;

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
    if (!Object.hasOwn(events, event) || !events[event].includes(value)) return null;

    const common = { source, event, value, actorId, eventId };
    if (source === 'web') return Object.keys(data).length === 5 ? { ...common, version: null, distribution: null } : null;
    if (
        Object.keys(data).length !== 7 ||
        typeof data.version !== 'string' ||
        !version.test(data.version) ||
        (distribution !== 'installer' && distribution !== 'store')
    ) return null;
    return { ...common, version: data.version, distribution };
}
