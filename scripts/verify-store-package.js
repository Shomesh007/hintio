const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const asar = require('@electron/asar');
const { identityFromEnv, makeManifest } = require('./store-manifest');
const root = path.resolve(__dirname, '..');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
async function inspectZip(file, expectedAsarHash) {
    const script = fs.readFileSync(path.join(__dirname, 'inspect-msix.ps1'), 'utf8');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        encoding: 'utf8',
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, HINTIO_VERIFY_MSIX_FILE: file },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || 'MSIX archive inspection failed');
    const inspected = JSON.parse(result.stdout);
    return { ...inspected, asarMatches: inspected.asarHash === expectedAsarHash };
}
async function main() {
    const validation = process.env.HINTIO_STORE_VALIDATION === '1';
    const identity = identityFromEnv(process.env, validation);
    const version = require('../package.json').version;
    const packaged = path.join(root, 'out', 'Hintio-win32-x64');
    const archive = path.join(packaged, 'resources', 'app.asar');
    assert.equal(JSON.parse(asar.extractFile(archive, 'distribution.json').toString()).channel, 'microsoft-store');
    for (const file of [
        'src/index.js',
        'src/components/views/HelpView.js',
        'src/storage.js',
        'src/utils/distribution.js',
        'src/utils/protectedStorage.js',
        'src/utils/documentImport.js',
        'src/utils/llmProvider.js',
        'src/utils/providerRuntime.js',
        'src/utils/managedGateway.js',
        'src/utils/speechStt.js',
        'src/components/views/UpdatesView.js',
        'src/components/views/OnboardingView.js',
    ])
        assert.deepEqual(asar.extractFile(archive, path.normalize(file)), fs.readFileSync(path.join(root, file)), file + ' is stale');
    const input = path.join(root, 'out', 'make', 'msix', 'x64', 'Hintio-win32-x64-' + version + '.msix');
    const inspected = await inspectZip(input, hash(archive));
    assert.equal(inspected.manifest.replace(/\r/g, '').trim(), makeManifest(identity, version).trim(), 'Manifest must match the validated identity');
    assert.equal(inspected.asarMatches, true);
    for (const needed of [
        'app/Hintio.exe',
        'AppxBlockMap.xml',
        'assets/StoreLogo.png',
        'assets/Square44x44Logo.png',
        'assets/Square150x150Logo.png',
        'app/vcruntime140.dll',
        'app/vcruntime140_1.dll',
        'app/msvcp140.dll',
    ])
        assert.ok(inspected.entries.includes(needed), needed + ' missing');
    assert.ok(
        !inspected.entries.some(name => /onnxruntime-node\/bin\/napi-v3\/(?:darwin|linux|win32\/(?:arm64|x86))\//.test(name)),
        'Foreign native binaries must not ship in x64 Store package'
    );
    assert.ok(!inspected.entries.includes('AppxSignature.p7x'), 'Store upload must not use a development certificate');
    assert.ok(
        !inspected.entries.some(
            n => /^app\/(?:\.git|\.cache|hintio-website|out|test|supabase|packaging)\//.test(n) || /(?:^|\/)\.env(?:$|\.)/.test(n)
        ),
        'Development or secret files found'
    );
    const directory = path.join(root, 'out', (validation ? 'store-validation-' : 'store-submission-') + version);
    fs.mkdirSync(directory, { recursive: true });
    const name = 'Hintio-' + version + '-x64' + (validation ? '.validation' : '') + '.msix';
    const previous = path.join(directory, name);
    if (fs.existsSync(previous) && hash(previous) !== hash(input)) {
        const history = path.join(directory, 'previous-' + hash(previous).slice(0, 12));
        fs.mkdirSync(history, { recursive: true });
        for (const file of [name, 'SHA256SUMS.txt', 'PACKAGE-VERIFICATION.json']) {
            const source = path.join(directory, file);
            if (fs.existsSync(source)) fs.copyFileSync(source, path.join(history, file));
        }
    }
    fs.copyFileSync(input, path.join(directory, name));
    const digest = hash(path.join(directory, name));
    fs.writeFileSync(path.join(directory, 'SHA256SUMS.txt'), digest + '  ' + name + '\n');
    const report = {
        version,
        identity,
        validationOnly: validation,
        package: name,
        sha256: digest,
        packageBytes: fs.statSync(input).size,
        electronVersion: fs.readFileSync(path.join(packaged, 'version'), 'utf8').trim(),
        archiveSourceMatches: true,
        entryCount: inspected.entries.length,
        unsignedForStore: true,
        published: false,
        storeCertified: false,
        installedRuntimeVerified: false,
        limitations: [
            'Store identity ' + (validation ? 'pending' : 'supplied; must be checked in Partner Center'),
            'Certification and Store-delivered installation test pending',
            'Local unsigned MSIX must not be distributed as a trusted installer',
        ],
    };
    fs.writeFileSync(path.join(directory, 'PACKAGE-VERIFICATION.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
}
if (require.main === module)
    main().catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
module.exports = { inspectZip };
