const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { normalizeProfile } = require('./interviewProfiles');

const valuesByEvent = new Map([
    ['session_started', new Set(['speaker_only', 'mic_only', 'both', 'none'])],
    ['feature_used', new Set(['single_screenshot', 'multi_screenshot', 'debug_screenshot', 'history', 'settings', 'ai_context'])],
    ['onboarding_step', new Set(['welcome', 'context', 'review'])],
    ['onboarding_completed', new Set(['blank', 'provided'])],
    ['session_start_blocked', new Set(['missing_key', 'setup_required', 'update_required', 'initialization_failed'])],
    ['session_profile', new Set(['interview', 'technical-interview', 'sales', 'meeting', 'presentation', 'negotiation', 'exam'])],
    ['session_answered', new Set(['completed'])],
    ['session_ended', new Set(['under_1m', '1_to_5m', '5_to_15m', '15m_plus'])],
    ['app_launched', new Set(['first', 'returning'])],
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// Website hosts that read a one-time link code from the URL fragment.
const linkHosts = new Set(['www.hintio.tech', 'hintio.tech']);
const idFile = 'usage-analytics-id';

function isAllowed(event, value) {
    if (event === 'web_link_opened') return typeof value === 'string' && uuidPattern.test(value);
    return valuesByEvent.get(event)?.has(value) === true;
}

function getInstallId(directory) {
    const idPath = path.join(directory, idFile);
    try {
        const id = fs.readFileSync(idPath, 'utf8').trim();
        return uuidPattern.test(id) ? id : null;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const id = randomUUID();
        fs.writeFileSync(idPath, id, { flag: 'wx', mode: 0o600 });
        return id;
    }
}

// Deletes the random install ID so later reporting, if turned back on, starts as a new install.
function forgetInstallId(directory) {
    try {
        fs.unlinkSync(path.join(directory, idFile));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

function createUsageAnalytics({ storage, endpoint, version, distribution, fetchEvent = fetch }) {
    let queued = 0;
    let pending = Promise.resolve();

    async function record(event, value) {
        try {
            if (!endpoint || queued >= 32) return;
            const preferences = storage.getPreferences();
            if (preferences.usageAnalytics !== true) return;
            if (event === 'onboarding_step' && storage.getConfig().onboarded) return;
            // Linking a website visit to this install also requires the privacy step to be accepted.
            if (event === 'web_link_opened' && !storage.getConfig().cloudConsent) return;
            if (event === 'app_launched') {
                // 'first' or 'returning' is decided when the event is sent, from whether an install ID exists yet.
                if (value !== undefined) return;
            } else if (event === 'session_started') {
                if (value !== undefined) return;
                value = preferences.audioMode;
            } else if (event === 'session_profile' && typeof value === 'string') {
                value = normalizeProfile(value);
            }
            if (event !== 'app_launched' && !isAllowed(event, value)) return;

            queued++;
            // Keep milestone receipt order without blocking the app.
            pending = pending.then(async () => {
                try {
                    if (storage.getPreferences().usageAnalytics !== true) return;
                    const directory = storage.getConfigDir();
                    if (event === 'app_launched') value = fs.existsSync(path.join(directory, idFile)) ? 'returning' : 'first';
                    const actorId = getInstallId(directory);
                    if (!actorId) return;
                    await fetchEvent(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ source: 'desktop', event, value, actorId, eventId: randomUUID(), version, distribution }),
                        redirect: 'error',
                        signal: AbortSignal.timeout(4000),
                    });
                } catch {
                    // Usage reporting is best effort.
                } finally {
                    queued--;
                }
            });
            await pending;
        } catch {
            // Storage and reporting failures must not interrupt an app action.
        }
    }

    // Adds a one-time random link code to a hintio.tech URL opened from the app and reports the same code,
    // so the website visit can be joined to this install. Other URLs are returned unchanged.
    record.linkUrl = function linkUrl(url) {
        try {
            if (!endpoint) return url;
            const parsed = new URL(url);
            if (parsed.protocol !== 'https:' || !linkHosts.has(parsed.hostname) || parsed.hash) return url;
            if (storage.getPreferences().usageAnalytics !== true || !storage.getConfig().cloudConsent) return url;
            const code = randomUUID();
            parsed.hash = `hl=${code}`;
            void record('web_link_opened', code);
            return parsed.toString();
        } catch {
            return url;
        }
    };

    return record;
}

module.exports = { createUsageAnalytics, forgetInstallId };
