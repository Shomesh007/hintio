const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { identityFromEnv, storeVersion, makeManifest } = require('../scripts/store-manifest');
const { isStoreDistribution, StoreUpdateService } = require('../src/utils/distribution');
test('Store submissions require Partner Center identity; validation is explicitly separate', () => {
    assert.throws(() => identityFromEnv({}), /Partner Center/);
    assert.equal(identityFromEnv({}, true).validationOnly, true);
    const env = {
        HINTIO_STORE_IDENTITY_NAME: '12345.Hintio',
        HINTIO_STORE_PUBLISHER: 'CN=00000000-0000-0000-0000-000000000001',
        HINTIO_STORE_PUBLISHER_DISPLAY_NAME: 'Publisher & team',
    };
    const identity = identityFromEnv(env);
    assert.equal(identity.validationOnly, false);
    assert.match(makeManifest(identity, '1.0.5'), /Publisher &amp; team/);
    assert.throws(() => identityFromEnv({ ...env, HINTIO_STORE_IDENTITY_NAME: '../bad' }), /Invalid/);
});
test('Store manifest uses full trust x64, microphone and Internet without elevation or startup registration', () => {
    const manifest = makeManifest(identityFromEnv({}, true), '1.0.5');
    for (const token of ['Version="1.0.5.0"', 'app\\Hintio.exe', 'runFullTrust', 'microphone', 'internetClient', 'Windows.Desktop'])
        assert.ok(manifest.includes(token));
    assert.doesNotMatch(manifest, /allowElevation|broadFileSystemAccess|startupTask/);
    assert.equal(storeVersion('2.3.4'), '2.3.4.0');
    for (const version of ['1.0.5-beta', '1.0.5.1', '1.02.3', '65536.0.0']) assert.throws(() => storeVersion(version));
});
test('Store updates never use GitHub or block sessions based on EXE policies', async () => {
    const urls = [];
    const service = new StoreUpdateService({
        app: { getVersion: () => '1.0.5' },
        openExternal: async url => {
            urls.push(url);
            await Promise.resolve();
        },
    });
    assert.equal((await service.check()).phase, 'managed');
    assert.equal(service.getState().required, false);
    assert.deepEqual(urls, []);
    await service.assertSessionAllowed();
    await Promise.all([service.openInstaller(), service.openInstaller()]);
    assert.deepEqual(urls, ['ms-windows-store://downloadsandupdates']);
    assert.equal(service.getState().available, false);
    assert.match(service.getState().notice, /Store opened/);
});
test('Store launch failures explain how to open Store manually', async () => {
    const service = new StoreUpdateService({
        app: { getVersion: () => '1.0.5' },
        openExternal: async () => {
            throw new Error('missing Store');
        },
    });
    const state = await service.openInstaller();
    assert.match(state.error, /from Start/);
    assert.equal(state.notice, '');
});
test('Store channel comes from Windows package identity or packaged build metadata', () => {
    assert.equal(isStoreDistribution({}, { windowsStore: true }), true);
    assert.equal(
        isStoreDistribution(
            {
                isPackaged: false,
                getAppPath() {
                    throw new Error('unused');
                },
            },
            {}
        ),
        false
    );
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-distribution-'));
    try {
        const app = { isPackaged: true, getAppPath: () => temp };
        assert.equal(isStoreDistribution(app, {}), false);
        fs.writeFileSync(path.join(temp, 'distribution.json'), '{"channel":"microsoft-store"}');
        assert.equal(isStoreDistribution(app, {}), true);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
});
test('Store storage stays under configured writable data root and leaves legacy data alone', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-store-data-'));
    const storage = require('../src/storage');
    const legacy = path.join(temp, 'legacy');
    fs.mkdirSync(legacy);
    fs.writeFileSync(path.join(legacy, 'keep.json'), 'legacy sentinel');
    try {
        const data = path.join(temp, 'packaged-userData', 'hintio-config');
        storage.configureStorageRoot(data);
        storage.initializeStorage();
        storage.updateConfig('onboarded', true);
        storage.updatePreference('customPrompt', 'synthetic Store test');
        assert.equal(storage.getConfigDir(), data);
        assert.equal(storage.getConfig().onboarded, true);
        assert.equal(storage.getPreferences().customPrompt, 'synthetic Store test');
        storage.clearAllData();
        assert.equal(fs.readFileSync(path.join(legacy, 'keep.json'), 'utf8'), 'legacy sentinel');
        assert.equal(storage.getConfig().onboarded, false);
    } finally {
        fs.rmSync(temp, { recursive: true, force: true });
    }
});

test('validation metadata cannot be mistaken for a production submission identity', () => {
    assert.throws(
        () =>
            identityFromEnv({
                HINTIO_STORE_IDENTITY_NAME: 'Hintio.ValidationOnly',
                HINTIO_STORE_PUBLISHER: 'CN=Hintio Validation Only',
                HINTIO_STORE_PUBLISHER_DISPLAY_NAME: 'Hintio',
            }),
        /real Partner Center/
    );
});

test('Store packaging never requests a development signature or Squirrel installer', () => {
    const { spawnSync } = require('node:child_process');
    const result = spawnSync(
        process.execPath,
        [
            '-e',
            `const assert=require('node:assert/strict');const c=require('./forge.config');assert.equal(c.makers.length,1);assert.equal(c.makers[0].name,'@electron-forge/maker-msix');assert.equal(c.makers[0].config.sign,false);assert.equal(c.packagerConfig.windowsSign,undefined);assert.equal(c.packagerConfig.afterCopy.length,1);`,
        ],
        {
            cwd: path.resolve(__dirname, '..'),
            encoding: 'utf8',
            env: { ...process.env, HINTIO_DISTRIBUTION: 'store', HINTIO_STORE_VALIDATION: '1', HINTIO_REQUIRE_SIGNED_RELEASE: '1' },
        }
    );
    assert.equal(result.status, 0, result.stderr);
});
