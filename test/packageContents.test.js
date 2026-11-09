const test = require('node:test');
const assert = require('node:assert/strict');
const { packagerConfig } = require('../forge.config');

test('desktop release excludes the website, local data, credentials, and development artifacts', () => {
    const ignored = file => packagerConfig.ignore.some(pattern => pattern.test(file));
    for (const file of [
        '/hintio-website',
        '/hintio-website/.env.local',
        '/design',
        '/src/data',
        '/src/profiles/customer.local.js',
        '/.env',
        '/.env.production',
        '/.git',
        '/supabase',
        '/test',
        '/scripts',
        '/signing.pfx',
    ]) {
        assert.equal(ignored(file), true, `${file} must not ship`);
    }
    for (const file of [
        '/src/index.js',
        '/src/preload.js',
        '/src/storage.js',
        '/src/components/app/HintioApp.js',
        '/node_modules/dotenv/lib/main.js',
        '/src/assets/logo.ico',
        '/package.json',
        '/LICENSE',
    ]) {
        assert.equal(ignored(file), false, `${file} is required by the app`);
    }
});
