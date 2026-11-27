const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createUsageAnalytics, forgetInstallId } = require('../src/utils/usageAnalytics');

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
    assert.deepEqual(
        events.map(event => [event.event, event.value]),
        [
            ['session_started', 'speaker_only'],
            ['feature_used', 'multi_screenshot'],
            ['onboarding_step', 'welcome'],
            ['onboarding_completed', 'blank'],
        ]
    );
    assert.equal(events[0].actorId, events[1].actorId);
    assert.notEqual(events[0].eventId, events[1].eventId);

    preferences.usageAnalytics = false;
    await record('feature_used', 'history');
    assert.equal(events.length, 4);
});

function setup(t, { usageAnalytics = true, cloudConsent = true, endpoint = 'https://example.com/product-analytics' } = {}) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-usage-'));
    t.after(() => fs.rmSync(directory, { force: true, recursive: true }));
    const preferences = { usageAnalytics, audioMode: 'both' };
    const config = { onboarded: true, cloudConsent };
    const events = [];
    const record = createUsageAnalytics({
        storage: { getConfigDir: () => directory, getPreferences: () => preferences, getConfig: () => config },
        endpoint,
        version: '1.0.13',
        distribution: 'installer',
        fetchEvent: async (_url, request) => events.push(JSON.parse(request.body)),
    });
    return { directory, preferences, config, events, record };
}

test('app launches report first or returning from whether an install ID exists', async t => {
    const { directory, events, record } = setup(t);
    await record('app_launched');
    await record('app_launched');
    await record('app_launched', 'first');
    assert.deepEqual(
        events.map(event => [event.event, event.value]),
        [
            ['app_launched', 'first'],
            ['app_launched', 'returning'],
        ]
    );
    assert.equal(events[0].actorId, events[1].actorId);

    forgetInstallId(directory);
    forgetInstallId(directory);
    await record('app_launched');
    assert.equal(events[2].value, 'first');
    assert.notEqual(events[2].actorId, events[0].actorId, 'a deleted install ID is not reused');
});

test('hintio.tech links carry a one-time code that the install also reports', async t => {
    const { events, record } = setup(t);
    const url = record.linkUrl('https://www.hintio.tech/get-started');
    const code = new URL(url).hash.replace('#hl=', '');
    assert.match(code, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(url, `https://www.hintio.tech/get-started#hl=${code}`);
    assert.notEqual(new URL(record.linkUrl('https://www.hintio.tech/pricing')).hash, `#hl=${code}`, 'each link gets a new code');
    await new Promise(resolve => setImmediate(resolve));
    await record('feature_used', 'history');
    assert.deepEqual(events[0], { ...events[0], event: 'web_link_opened', value: code });
    assert.notEqual(events[0].actorId, code);

    assert.equal(record.linkUrl('https://www.hintio.tech/access#billing'), 'https://www.hintio.tech/access#billing');
    assert.equal(record.linkUrl('https://console.groq.com/keys'), 'https://console.groq.com/keys');
    assert.equal(record.linkUrl('http://www.hintio.tech/pricing'), 'http://www.hintio.tech/pricing');
    assert.equal(record.linkUrl('mailto:support@example.com'), 'mailto:support@example.com');
    await record('web_link_opened', 'person@example.com');
    assert.equal(events.filter(event => event.event === 'web_link_opened').length, 2);
});

test('links are left unchanged without analytics, privacy consent or an endpoint', async t => {
    const url = 'https://www.hintio.tech/pricing';
    const off = setup(t, { usageAnalytics: false });
    assert.equal(off.record.linkUrl(url), url);
    const noConsent = setup(t, { cloudConsent: false });
    assert.equal(noConsent.record.linkUrl(url), url);
    await noConsent.record('web_link_opened', '3f2a9c1d-0000-4000-8000-000000000000');
    assert.equal(noConsent.events.length, 0);
    const local = setup(t, { endpoint: '' });
    assert.equal(local.record.linkUrl(url), url);
});
