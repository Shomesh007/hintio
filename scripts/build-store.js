const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { identityFromEnv } = require('./store-manifest');
const validation = process.argv.includes('--validation');
try {
    identityFromEnv(process.env, validation);
    const env = { ...process.env, HINTIO_DISTRIBUTION: 'store', HINTIO_STORE_VALIDATION: validation ? '1' : '0' };
    const root = path.resolve(__dirname, '..');
    const previous = path.join(root, 'out', 'make', 'msix', 'x64', 'Hintio.msix');
    if (fs.existsSync(previous)) {
        if (fs.realpathSync(previous) !== previous || !fs.statSync(previous).isFile()) throw new Error('Unexpected MSIX output path');
        const digest = crypto.createHash('sha256').update(fs.readFileSync(previous)).digest('hex');
        const history = path.join(root, 'out', 'store-build-history', digest);
        fs.mkdirSync(history, { recursive: true });
        const saved = path.join(history, 'Hintio.msix');
        fs.copyFileSync(previous, saved);
        if (crypto.createHash('sha256').update(fs.readFileSync(saved)).digest('hex') !== digest) throw new Error('Previous MSIX preservation failed');
        fs.unlinkSync(previous);
    }
    const cli = require.resolve('@electron-forge/cli/dist/electron-forge.js');
    const result = spawnSync(
        process.execPath,
        [
            cli,
            'make',
            '--platform=win32',
            '--arch=x64',
            '--targets=@electron-forge/maker-msix',
            ...(process.argv.includes('--skip-package') ? ['--skip-package'] : []),
        ],
        {
            stdio: 'inherit',
            env,
            windowsHide: true,
        }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error('MSIX build failed');
    const final = spawnSync(process.execPath, [require.resolve('./verify-store-package')], { stdio: 'inherit', env, windowsHide: true });
    process.exitCode = final.status || 0;
    if (final.error) throw final.error;
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
