const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { UpdateService, compareVersions, releaseInfo, downloadUrl, RELEASES_URL, POLICY_URL } = require('../src/utils/updates');
const version = '1.0.6';
function harness(options = {}) {
    const calls = [],
        states = [];
    const release = {
        tag_name: 'v' + version,
        body: 'Test release notes',
        assets: [{ name: 'Hintio-' + version + '.Setup.exe', browser_download_url: 'https://attacker.invalid/evil.exe' }],
    };
    const fetchImpl = async url => {
        calls.push(['fetch', url]);
        if (options.offline) throw new Error('offline');
        if (url === RELEASES_URL) return Response.json(options.release || release);
        if (url === POLICY_URL) return Response.json({ schemaVersion: 1, minimumSupportedVersion: options.minimum || '1.0.4' });
        throw new Error('Unexpected URL');
    };
    const service = new UpdateService({
        app: { getVersion: () => '1.0.5', isPackaged: true },
        openExternal: async url => {
            calls.push(['open', url]);
            if (options.browserError) throw new Error('browser unavailable');
            await Promise.resolve();
        },
        fetchImpl,
        notify: state => states.push(state),
        minimumVersion: '1.0.4',
        cachePath: options.cachePath,
        now: () => 100,
    });
    return { service, calls, states, options };
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
    assert.throws(() => downloadUrl(version, 'RELEASES'));
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

test('concurrent checks and link clicks are deduplicated', async () => {
    const { service, calls } = harness();
    await Promise.all([service.check(), service.check()]);
    assert.equal(calls.filter(c => c[1] === RELEASES_URL).length, 1);
    await Promise.all([service.openInstaller(), service.openInstaller(), service.openInstaller()]);
    assert.equal(calls.filter(c => c[0] === 'open').length, 1);
    assert.equal(service.getState().phase, 'available');
});
test('checking never opens a browser; installer URLs cannot be redirected', async () => {
    const { service, calls } = harness();
    await service.check();
    assert.equal(calls.filter(c => c[0] === 'open').length, 0);
    await service.openInstaller('https://attacker.invalid');
    assert.deepEqual(
        calls.filter(c => c[0] === 'open'),
        [['open', downloadUrl(version, 'Hintio-' + version + '.Setup.exe')]]
    );
    assert.match(service.getState().notice, /Installer link opened/);
});
test('offline without a known installer opens no URL', async () => {
    const { service, calls } = harness({ offline: true });
    await service.openInstaller();
    assert.match(service.getState().error, /link is unavailable/);
    assert.equal(calls.filter(c => c[0] === 'open').length, 0);
});
test('browser failures can be retried', async () => {
    const h = harness({ browserError: true });
    await h.service.openInstaller();
    assert.match(h.service.getState().error, /browser unavailable/);
    h.options.browserError = false;
    await h.service.openInstaller();
    assert.equal(h.service.getState().error, '');
    assert.equal(h.calls.filter(c => c[0] === 'open').length, 2);
});
test('the installed release is current', async () => {
    const { service } = harness({ release: { tag_name: 'v1.0.5', assets: [{ name: 'Hintio-1.0.5.Setup.exe' }] } });
    const state = await service.check();
    assert.equal(state.phase, 'current');
    assert.equal(state.available, false);
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

test('native updater execution and IPC are absent', () => {
    assert.equal(typeof UpdateService.prototype.download, 'undefined');
    assert.equal(typeof UpdateService.prototype.install, 'undefined');
    for (const file of ['src/index.js', 'src/preload.js', 'src/utils/renderer.js', 'src/utils/updates.js']) {
        assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), /autoUpdater|quitAndInstall|updates:download|updates:install/);
    }
});
