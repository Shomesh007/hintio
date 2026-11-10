const { spawnSync } = require('node:child_process');
const { windowsSigningOptions } = require('./windows-signing');
try {
    if (process.platform !== 'win32') throw new Error('Build and verify the signed Windows release on Windows.');
    const env = { ...process.env, HINTIO_REQUIRE_SIGNED_RELEASE: '1', DEBUG: '' };
    windowsSigningOptions(env);
    if (!process.env.npm_execpath) throw new Error('Run this command through npm run make:win:signed.');
    const build = spawnSync(process.execPath, [process.env.npm_execpath, 'run', 'make:win'], { env, stdio: 'inherit', windowsHide: true });
    if (build.error) throw new Error('The Windows build process could not start.');
    process.exitCode = build.status ?? 1;
} catch (error) {
    console.error('[signed-release] ' + error.message);
    process.exitCode = 1;
}
