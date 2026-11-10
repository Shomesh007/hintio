const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { compareVersions } = require('../src/utils/updates');

// Exercise the actual app controller with browser rendering and external services stubbed.
const appSource = fs
    .readFileSync(path.join(__dirname, '..', 'src', 'components', 'app', 'HintioApp.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export class HintioApp', 'class HintioApp');

function createApp({ approved = true, token = '', remoteVersion = 'v1.0.2', consent = true } = {}) {
    const calls = [];
    let savedToken = token;
    const hintio = {
        getVersion: async () => '1.0.2',
        updates: {
            getState: async () => ({ currentVersion: '1.0.2', phase: 'idle', required: false }),
            check: async () => {
                calls.push('update-check');
                let available = false;
                try {
                    available = compareVersions(remoteVersion, '1.0.2') > 0;
                } catch {}
                return { currentVersion: '1.0.2', phase: available ? 'available' : 'current', required: false };
            },
        },
        storage: {
            getConfig: async () => ({ onboarded: true, cloudConsent: consent }),
            updateConfig: async (key, value) => {
                calls.push(['config', key, value]);
            },
            async setAccessToken(value) {
                calls.push('save-token');
                savedToken = value;
            },
            async getCredentials() {
                return { cloudToken: savedToken };
            },
        },
        async initializeGemini(profile, language) {
            calls.push(['validate-and-initialize', profile, language]);
            return approved;
        },
        getLastInitError: () => 'Access token is invalid or expired.',
        startCapture: () => calls.push('capture'),
        getSessionLimitMs: () => null,
    };
    const App = vm.runInNewContext(`${appSource}\nHintioApp;`, {
        LitElement: class {},
        css: () => '',
        customElements: { define() {} },
        hintio,
        fetch: async url => {
            calls.push(['update-url', url]);
            return { ok: true, json: async () => ({ tag_name: remoteVersion }) };
        },
    });
    const app = Object.assign(Object.create(App.prototype), {
        currentView: 'main',
        sessionActive: false,
        selectedProfile: 'interview',
        selectedLanguage: 'en-US',
        shadowRoot: { querySelector: () => ({ triggerApiKeyError: message => calls.push(['error', message]) }) },
        _startTimer: () => calls.push('timer'),
        requestUpdate: () => {},
    });
    return { app, calls };
}

test('a first-time user goes straight from an approved key to the assistant without voice setup', async () => {
    const { app, calls } = createApp();
    await app.handleStart('  SKI-test-customer-access-token  ');

    assert.equal(app.currentView, 'assistant');
    assert.equal(app.sessionActive, true);
    assert.deepEqual(calls, ['save-token', ['validate-and-initialize', 'interview', 'en-US'], 'capture', 'timer']);
});

test('desktop update state comes from the main process and recognizes a newer release', async () => {
    const { app, calls } = createApp({ remoteVersion: 'v1.0.3' });
    await app._checkForUpdates();
    assert.equal(app._updateAvailable, true);
    assert.deepEqual(calls, ['update-check']);
});

test('the current release and invalid release tags do not show a false update', async () => {
    for (const remoteVersion of ['v1.0.2', 'invalid']) {
        const { app } = createApp({ remoteVersion });
        await app._checkForUpdates();
        assert.notEqual(app._updateAvailable, true);
    }
});

test('a rejected key stays on the key screen without starting capture or a session', async () => {
    const { app, calls } = createApp({ approved: false });
    await app.handleStart('SKI-test-customer-access-token');

    assert.equal(app.currentView, 'main');
    assert.equal(app.sessionActive, false);
    assert.deepEqual(calls, ['save-token', ['validate-and-initialize', 'interview', 'en-US'], ['error', 'Access token is invalid or expired.']]);
});

test('a missing key cannot start a session', async () => {
    const { app, calls } = createApp();
    await app.handleStart();

    assert.equal(app.currentView, 'main');
    assert.equal(app.sessionActive, false);
    assert.deepEqual(calls, [['error', 'Access token is required.']]);
});

test('a required update prevents initialization and capture', async () => {
    const { app, calls } = createApp();
    app._updateState = { required: true };
    await app.handleStart('test-access-token');
    assert.equal(app.currentView, 'updates');
    assert.equal(app.sessionActive, false);
    assert.deepEqual(calls, ['save-token']);
});

test('withheld cloud consent blocks initialization and capture', async () => {
    const { app, calls } = createApp({ consent: false });
    await app.handleStart('test-access-token');
    assert.equal(app.currentView, 'onboarding');
    assert.equal(app.sessionActive, false);
    assert.deepEqual(calls, ['save-token']);
});

test('withdrawing cloud consent ends an active session and returns to privacy onboarding', async () => {
    const { app, calls } = createApp();
    app.sessionActive = true;
    app._endSessionToHome = async () => {
        calls.push('end-session');
        app.sessionActive = false;
    };
    await app.withdrawCloudConsent();
    assert.equal(app.currentView, 'onboarding');
    assert.equal(app.sessionActive, false);
    assert.deepEqual(calls, [['config', 'cloudConsent', false], 'end-session']);
});
