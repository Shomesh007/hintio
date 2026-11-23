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
]);

function getInstallId(directory) {
    const idPath = path.join(directory, 'usage-analytics-id');
    try {
        const id = fs.readFileSync(idPath, 'utf8').trim();
        return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id) ? id : null;
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        const id = randomUUID();
        fs.writeFileSync(idPath, id, { flag: 'wx', mode: 0o600 });
        return id;
    }
}

function createUsageAnalytics({ storage, endpoint, version, distribution, fetchEvent = fetch }) {
    let queued = 0;
    let pending = Promise.resolve();

    return async function record(event, value) {
        try {
            if (!endpoint || queued >= 32) return;
            const preferences = storage.getPreferences();
            if (preferences.usageAnalytics !== true) return;
            if (event === 'onboarding_step' && storage.getConfig().onboarded) return;
            if (event === 'session_started') {
                if (value !== undefined) return;
                value = preferences.audioMode;
            } else if (event === 'session_profile' && typeof value === 'string') {
                value = normalizeProfile(value);
            }
            if (!valuesByEvent.get(event)?.has(value)) return;

            queued++;
            // Keep milestone receipt order without blocking the app.
            pending = pending.then(async () => {
                try {
                    if (storage.getPreferences().usageAnalytics !== true) return;
                    const actorId = getInstallId(storage.getConfigDir());
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
    };
}

module.exports = { createUsageAnalytics };
