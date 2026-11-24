import type { WebAnalyticsEvent } from '../../supabase/functions/_shared/analyticsContract';

const analyticsOverride = import.meta.env.VITE_PRODUCT_ANALYTICS_ENABLED;
export const analyticsEnabled =
    analyticsOverride === 'true' ||
    (analyticsOverride === undefined && import.meta.env.PROD && window.location.origin === 'https://www.hintio.tech');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vsybqtunyuanxspxhzue.supabase.co';
export const analyticsFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

const choiceKey = 'hintio-analytics-choice';
const browserKey = 'hintio-analytics-browser';
export type AnalyticsChoice = 'allow' | 'decline';
let temporaryChoice: AnalyticsChoice | null = null;

export function analyticsPrivacySignal() {
    return navigator.doNotTrack === '1' || (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

export function getAnalyticsChoice(): AnalyticsChoice {
    try {
        const value = localStorage.getItem(choiceKey);
        return value === 'allow' || value === 'decline' ? value : 'allow';
    } catch {
        return temporaryChoice ?? 'allow';
    }
}

export function saveAnalyticsChoice(choice: AnalyticsChoice) {
    temporaryChoice = choice;
    try {
        localStorage.setItem(choiceKey, choice);
        if (choice === 'decline') localStorage.removeItem(browserKey);
    } catch {
        // Browsers that block storage cannot send analytics.
    }
}

export function trackWebEvent(...[event, value]: WebAnalyticsEvent) {
    if (!analyticsEnabled || analyticsPrivacySignal() || getAnalyticsChoice() !== 'allow') return;
    try {
        let actorId = localStorage.getItem(browserKey);
        if (!actorId) {
            actorId = crypto.randomUUID();
            localStorage.setItem(browserKey, actorId);
        }
        void fetch(`${analyticsFunctionsUrl}/product-analytics`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ source: 'web', event, value, actorId, eventId: crypto.randomUUID() }),
            keepalive: true,
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            redirect: 'error',
        }).catch(() => {});
    } catch {
        // Tracking is optional and must not interfere with the action.
    }
}
