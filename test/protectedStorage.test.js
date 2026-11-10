const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { openProtectedStorage } = require('../src/utils/protectedStorage');
function fakeSafeStorage() {
    const key = crypto.randomBytes(32);
    return {
        isAsyncEncryptionAvailable: async () => true,
        encryptStringAsync: async text => {
            const iv = crypto.randomBytes(12),
                c = crypto.createCipheriv('aes-256-gcm', key, iv);
            return Buffer.concat([iv, c.update(text), c.final(), c.getAuthTag()]);
        },
        decryptStringAsync: async bytes => {
            const d = crypto.createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
            d.setAuthTag(bytes.subarray(-16));
            return { result: Buffer.concat([d.update(bytes.subarray(12, -16)), d.final()]).toString() };
        },
    };
}
test('protected records persist across restart, conceal contents and detect tampering or file swaps', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-protection-'));
    const provider = fakeSafeStorage();
    try {
        const first = await openProtectedStorage(root, provider);
        const file = path.join(root, 'credentials.json');
        const encoded = first.encode('{"private":"synthetic secret"}', file);
        assert.ok(!JSON.stringify(encoded).includes('synthetic secret'));
        const restarted = await openProtectedStorage(root, provider);
        assert.equal(restarted.decode(encoded, file), '{"private":"synthetic secret"}');
        assert.throws(() => restarted.decode(encoded, path.join(root, 'config.json')));
        assert.throws(() => restarted.decode({ ...encoded, tag: Buffer.alloc(16).toString('base64') }, file));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
test('unavailable protection and missing or corrupt wrapping keys never fall back to plaintext', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-key-errors-'));
    const provider = fakeSafeStorage();
    try {
        await assert.rejects(openProtectedStorage(root, { isAsyncEncryptionAvailable: async () => false }), /unavailable/);
        assert.equal(fs.readdirSync(root).length, 0);
        const codec = await openProtectedStorage(root, provider);
        const file = path.join(root, 'config.json');
        fs.writeFileSync(file, JSON.stringify(codec.encode('{"configVersion":1}', file)));
        fs.unlinkSync(codec.keyPath);
        const original = fs.readFileSync(file, 'utf8');
        await assert.rejects(openProtectedStorage(root, provider), /key is missing/);
        assert.equal(fs.readFileSync(file, 'utf8'), original);
        fs.writeFileSync(codec.keyPath, 'corrupted');
        await assert.rejects(openProtectedStorage(root, provider));
        assert.equal(fs.readFileSync(file, 'utf8'), original);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
test('Store storage encrypts credentials and history, and explicit reset preserves key usability', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-encrypted-data-'));
    const provider = fakeSafeStorage();
    delete require.cache[require.resolve('../src/storage')];
    const storage = require('../src/storage');
    try {
        storage.configureStorageRoot(root);
        storage.configureProtection(await openProtectedStorage(root, provider));
        storage.initializeStorage();
        storage.updateConfig('cloudConsent', true);
        storage.setCredentials({ apiKey: 'synthetic-secret-token' });
        storage.saveSession('1794300000000', { conversationHistory: [{ text: 'synthetic private response' }] });
        assert.equal(storage.getCredentials().apiKey, 'synthetic-secret-token');
        assert.equal(storage.getSession('1794300000000').conversationHistory[0].text, 'synthetic private response');
        assert.ok(!fs.readFileSync(path.join(root, 'credentials.json'), 'utf8').includes('synthetic-secret-token'));
        assert.ok(!fs.readFileSync(path.join(root, 'history', '1794300000000.json'), 'utf8').includes('synthetic private response'));
        const wrapped = fs.readFileSync(path.join(root, 'storage-key.dpapi'));
        storage.clearAllData();
        assert.deepEqual(fs.readFileSync(path.join(root, 'storage-key.dpapi')), wrapped);
        storage.configureProtection(await openProtectedStorage(root, provider));
        storage.initializeStorage();
        assert.equal(storage.getConfig().cloudConsent, false);
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
test('unreadable or incompatible local records are not silently wiped during startup', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-preserve-records-'));
    delete require.cache[require.resolve('../src/storage')];
    const storage = require('../src/storage');
    storage.configureStorageRoot(root);
    try {
        storage.initializeStorage();
        const file = path.join(root, 'config.json');
        fs.writeFileSync(file, 'broken json');
        assert.throws(() => storage.initializeStorage(), /left unchanged/);
        assert.equal(fs.readFileSync(file, 'utf8'), 'broken json');
        fs.writeFileSync(file, '{"configVersion":99}');
        assert.throws(() => storage.initializeStorage(), /Unsupported/);
        assert.equal(fs.readFileSync(file, 'utf8'), '{"configVersion":99}');
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
