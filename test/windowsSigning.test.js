const test = require('node:test');
const assert = require('node:assert/strict');
const { windowsSigningOptions } = require('../scripts/windows-signing');

test('unsigned development builds are explicit and signed releases fail without a signing identity', () => {
    assert.equal(windowsSigningOptions({}), undefined);
    assert.throws(() => windowsSigningOptions({ HINTIO_REQUIRE_SIGNED_RELEASE: '1' }), /trusted Windows code-signing/);
});

test('certificate and service signing use SHA-256 and never continue after a signing error', () => {
    const certificate = windowsSigningOptions({ WIN_CSC_LINK: 'test-cert.pfx', WIN_CSC_KEY_PASSWORD: 'synthetic-test-password' }, () => true);
    assert.equal(certificate.certificateFile, 'test-cert.pfx');
    assert.equal(certificate.continueOnError, false);
    assert.deepEqual(certificate.hashes, ['sha256']);
    const cloud = windowsSigningOptions({ WIN_SIGN_WITH_PARAMS: '/synthetic-test-provider', WIN_SIGNTOOL_PATH: 'test-signer.exe' });
    assert.equal(cloud.signToolPath, 'test-signer.exe');
    assert.equal(cloud.continueOnError, false);
});

test('missing and ambiguous signing identities stop the build', () => {
    assert.throws(() => windowsSigningOptions({ WIN_CSC_LINK: 'missing.pfx' }, () => false), /does not exist/);
    assert.throws(() => windowsSigningOptions({ WIN_CSC_LINK: 'test.pfx', WIN_SIGN_WITH_PARAMS: '/test' }, () => true), /not both/);
});

test('Forge wires the same signing policy to the app and Squirrel installer', () => {
    const helper = require('../scripts/windows-signing');
    const original = helper.windowsSigningOptions;
    const options = { certificateFile: 'synthetic-test.pfx' };
    try {
        helper.windowsSigningOptions = () => options;
        delete require.cache[require.resolve('../forge.config')];
        const config = require('../forge.config');
        assert.equal(config.packagerConfig.windowsSign, options);
        assert.equal(config.makers.find(m => m.name === '@electron-forge/maker-squirrel').config.windowsSign, options);
    } finally {
        helper.windowsSigningOptions = original;
        delete require.cache[require.resolve('../forge.config')];
    }
});
