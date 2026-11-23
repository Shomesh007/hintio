const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createUsageAnalytics } = require('../src/utils/usageAnalytics');

test('analytics respects opt-out and sends only allowlisted usage fields', async t => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-usage-'));
    t.after(() => fs.rmSync(directory, { force: true, recursive: true }));

    const preferences = { usageAnalytics: false, audioMode: 'speaker_only', resumeText: 'private', customPrompt: 'private' };
    const events = [];
    let onboarded = false;
    const options = {
        storage: { getConfigDir: () => directory, getPreferences: () => preferences, getConfig: () => ({ onboarded }) },
        endpoint: 'https://example.com/product-analytics',
        version: '1.0.6',
        distribution: 'installer',
        fetchEvent: async (_url, request) => events.push(JSON.parse(request.body)),
    };
    const record = createUsageAnalytics(options);

    await record('session_started');
    assert.equal(events.length, 0);
    assert.deepEqual(fs.readdirSync(directory), []);

    preferences.usageAnalytics = true;
    await record('session_started', 'mic_only');
    await record('feature_used', 'private');
    await record('session_started');
    await createUsageAnalytics(options)('feature_used', 'multi_screenshot');
    const welcome = record('onboarding_step', 'welcome');
    onboarded = true;
    const returning = record('onboarding_step', 'context');
    const completed = record('onboarding_completed', 'blank');
    await Promise.all([welcome, returning, completed]);
    assert.deepEqual(Object.keys(events[0]).sort(), ['actorId', 'distribution', 'event', 'eventId', 'source', 'value', 'version']);
    assert.deepEqual(events.map(event => [event.event, event.value]), [
        ['session_started', 'speaker_only'],
        ['feature_used', 'multi_screenshot'],
        ['onboarding_step', 'welcome'],
        ['onboarding_completed', 'blank'],
    ]);
    assert.equal(events[0].actorId, events[1].actorId);
    assert.notEqual(events[0].eventId, events[1].eventId);

    preferences.usageAnalytics = false;
    await record('feature_used', 'history');
    assert.equal(events.length, 4);
});
