const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the actual app controller with browser rendering and external services stubbed.
const appSource = fs
    .readFileSync(path.join(__dirname, '..', 'src', 'components', 'app', 'HintioApp.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export class HintioApp', 'class HintioApp');

function createApp({ approved = true, token = '', remoteVersion = 'v1.0.2' } = {}) {
    const calls = [];
    let savedToken = token;
    const hintio = {
        getVersion: async () => '1.0.2',
        storage: {
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

test('desktop update checks use Hintio releases and recognize a newer release', async () => {
    const { app, calls } = createApp({ remoteVersion: 'v1.0.3' });
    await app._checkForUpdates();
    assert.equal(app._updateAvailable, true);
    assert.deepEqual(calls, [['update-url', 'https://api.github.com/repos/Shomesh007/hintio/releases/latest']]);
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
