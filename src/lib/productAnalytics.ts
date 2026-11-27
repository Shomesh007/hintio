import type { WebAnalyticsEvent } from '../../supabase/functions/_shared/analyticsContract';
import { takeDesktopLinkCode } from './desktopLink';

const analyticsOverride = import.meta.env.VITE_PRODUCT_ANALYTICS_ENABLED;
export const analyticsEnabled =
    analyticsOverride === 'true' || (analyticsOverride === undefined && import.meta.env.PROD && window.location.origin === 'https://www.hintio.tech');
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vsybqtunyuanxspxhzue.supabase.co';
export const analyticsFunctionsUrl = `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;

const choiceKey = 'hintio-analytics-choice';
const browserKey = 'hintio-analytics-browser';
const accountKey = 'hintio-analytics-account';
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
        if (choice === 'decline') {
            localStorage.removeItem(browserKey);
            localStorage.removeItem(accountKey);
        }
    } catch {
        // Browsers that block storage cannot send analytics.
    }
}

function canTrack() {
    return analyticsEnabled && !analyticsPrivacySignal() && getAnalyticsChoice() === 'allow';
}

function sendWebEvent(event: string, value: string, accessToken?: string) {
    try {
        let actorId = localStorage.getItem(browserKey);
        if (!actorId) {
            actorId = crypto.randomUUID();
            localStorage.setItem(browserKey, actorId);
        }
        const headers: Record<string, string> = { 'Content-Type': 'text/plain;charset=UTF-8' };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        void fetch(`${analyticsFunctionsUrl}/product-analytics`, {
            method: 'POST',
            headers,
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

// The random ID of this browser, when it has one. Used only to mark the admin's own browser as test traffic.
export function getAnalyticsBrowserId() {
    try {
        return localStorage.getItem(browserKey);
    } catch {
        return null;
    }
}

export function trackWebEvent(...[event, value]: WebAnalyticsEvent) {
    if (canTrack()) sendWebEvent(event, value);
}

// The desktop app adds #hl=<code> when it opens hintio.tech, and reports the same code itself.
// The code is always removed from the address bar, and reported only when analytics is allowed.
export function captureDesktopLink() {
    try {
        const { code, hash } = takeDesktopLinkCode(window.location.hash);
        if (!code) return;
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
        if (canTrack()) sendWebEvent('desktop_linked', code);
    } catch {
        // Linking is optional.
    }
}

// Reports once per account and browser that this browser signed in. The server stores only a keyed hash.
export function linkAnalyticsAccount(session: { access_token: string; user: { id: string } } | null) {
    if (!session || !canTrack()) return;
    try {
        if (localStorage.getItem(accountKey) === session.user.id) return;
        localStorage.setItem(accountKey, session.user.id);
        sendWebEvent('account_linked', 'signed_in', session.access_token);
    } catch {
        // Linking is optional.
    }
}
