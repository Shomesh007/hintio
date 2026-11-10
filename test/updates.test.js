const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { UpdateService, compareVersions, releaseInfo, releaseManifestValid, downloadUrl, RELEASES_URL, POLICY_URL } = require('../src/utils/updates');
const version = '1.0.6';
const pkg = 'Hintio-' + version + '-full.nupkg';
const manifest = 'a'.repeat(40) + ' ' + pkg + ' 100';
function harness(options = {}) {
    const calls = [],
        states = [];
    const updater = new EventEmitter();
    updater.setFeedURL = value => calls.push(['feed', value.url]);
    updater.checkForUpdates = () => {
        calls.push(['download']);
        updater.emit('update-available');
    };
    updater.quitAndInstall = () => calls.push(['install']);
    const release = {
        tag_name: 'v' + version,
        body: 'Test release notes',
        assets: [{ name: 'Hintio-' + version + '.Setup.exe' }, { name: 'RELEASES' }, { name: pkg }],
    };
    const fetchImpl = async url => {
        calls.push(['fetch', url]);
        if (options.offline) throw new Error('offline');
        if (url === RELEASES_URL) return Response.json(options.release || release);
        if (url === POLICY_URL) return Response.json({ schemaVersion: 1, minimumSupportedVersion: options.minimum || '1.0.4' });
        if (url.endsWith('/RELEASES')) return new Response(options.manifest ?? manifest);
        throw new Error('Unexpected URL');
    };
    const service = new UpdateService({
        app: { getVersion: () => '1.0.5', isPackaged: true },
        autoUpdater: updater,
        installed: options.installed ?? true,
        fetchImpl,
        notify: state => states.push(state),
        minimumVersion: '1.0.4',
        cachePath: options.cachePath,
        firstRun: options.firstRun ?? false,
        now: () => 100,
        isSessionActive: async () => Boolean(options.active),
    });
    return { service, updater, calls, states, options };
}

test('versions compare numerically and reject malformed or prerelease values', () => {
    assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
    assert.equal(compareVersions('v1.0.4', '1.0.4'), 0);
    for (const invalid of ['1.2', '1.2.3-beta', '1.02.3', 'https://attacker.invalid']) assert.throws(() => compareVersions(invalid, '1.0.0'));
});

test('release assets cannot redirect installation to another source', () => {
    assert.throws(() => downloadUrl('1.0.6', '../evil.exe'));
    assert.throws(() => releaseInfo({ tag_name: 'v1.0.6', assets: [] }));
    assert.throws(() => releaseInfo({ tag_name: 'v1.0.6', prerelease: true }));
    assert.equal(releaseManifestValid(manifest, version), true);
    assert.equal(releaseManifestValid('a'.repeat(40) + ' https://evil.invalid/file.nupkg 100', version), false);
});

test('checking advertises optional updates without downloading', async () => {
    const { service, calls } = harness();
    const state = await service.check();
    assert.equal(state.phase, 'available');
    assert.equal(state.required, false);
    assert.ok(!calls.some(c => c[0] === 'download'));
    await service.assertSessionAllowed();
});

test('an unsupported version is blocked before a session starts', async () => {
    const { service } = harness({ minimum: '1.0.6' });
    await assert.rejects(service.assertSessionAllowed(), /Update required/);
    assert.equal(service.getState().required, true);
});

test('an unpublished minimum cannot lock out users', async () => {
    const { service } = harness({ minimum: '9.0.0' });
    await service.check();
    assert.equal(service.getState().required, false);
});

test('concurrent checks and download clicks do not duplicate native downloads', async () => {
    const { service, calls } = harness();
    await Promise.all([service.check(), service.check()]);
    assert.equal(calls.filter(c => c[1] === RELEASES_URL).length, 1);
    await Promise.all([service.download(), service.download(), service.download()]);
    await service.download();
    assert.equal(calls.filter(c => c[0] === 'download').length, 1);
    assert.equal(service.getState().phase, 'downloading');
});

test('restart is unavailable before native update-downloaded; active sessions are protected', async () => {
    const h = harness({ active: true });
    await h.service.install();
    assert.ok(!h.calls.some(c => c[0] === 'install'));
    await h.service.download();
    h.updater.emit('update-downloaded');
    assert.equal(h.service.getState().phase, 'ready');
    await h.service.install();
    assert.match(h.service.getState().error, /End your active session/);
    assert.ok(!h.calls.some(c => c[0] === 'install'));
    h.options.active = false;
    await h.service.install();
    assert.equal(h.calls.filter(c => c[0] === 'install').length, 1);
});

test('invalid manifests and first-install locks stop native installation', async () => {
    for (const options of [{ manifest: 'malformed' }, { firstRun: true }]) {
        const h = harness(options);
        await h.service.download();
        assert.equal(h.service.getState().phase, 'error');
        assert.ok(!h.calls.some(c => c[0] === 'download'));
    }
});

test('a failed download can be retried without restarting the application', async () => {
    const h = harness();
    await h.service.download();
    h.updater.emit('error', new Error('connection reset'));
    assert.equal(h.service.getState().phase, 'error');
    await h.service.download();
    assert.equal(h.calls.filter(c => c[0] === 'download').length, 2);
});

test('portable copies retain the trusted installer fallback', async () => {
    const h = harness({ installed: false });
    await h.service.download();
    assert.equal(h.service.getState().supported, false);
    assert.match(h.service.getState().installerUrl, /^https:\/\/github.com\/Shomesh007\/hintio\/releases\/download\//);
    assert.ok(!h.calls.some(c => c[0] === 'download'));
});

test('a cached required version remains enforced while offline and can be rolled back by a valid policy', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-update-test-'));
    const cachePath = path.join(dir, 'cache.json');
    try {
        const first = harness({ cachePath, minimum: '1.0.6' });
        await first.service.check();
        const offline = harness({ cachePath, offline: true });
        await assert.rejects(offline.service.assertSessionAllowed(), /Update required/);
        const recovered = harness({ cachePath, minimum: '1.0.4' });
        await recovered.service.check();
        assert.equal(recovered.service.getState().required, false);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test('concurrent restart clicks invoke the native installer only once', async () => {
    const h = harness();
    await h.service.download();
    h.updater.emit('update-downloaded');
    await Promise.all([h.service.install(), h.service.install()]);
    assert.equal(h.calls.filter(c => c[0] === 'install').length, 1);
});
