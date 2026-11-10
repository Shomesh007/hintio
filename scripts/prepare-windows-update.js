const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { releaseManifestValid } = require('../src/utils/updates');
const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const source = path.join(root, 'out', 'make', 'squirrel.windows', 'x64');
const output = path.join(root, 'out', 'release-upload-' + version);
const packageName = 'Hintio-' + version + '-full.nupkg';
const manifest = fs.readFileSync(path.join(source, 'RELEASES'), 'utf8');
if (!releaseManifestValid(manifest, version)) throw new Error('RELEASES does not contain the matching full update package');
const entry = manifest
    .trim()
    .split(/\r?\n/)
    .map(line => line.trim().split(/\s+/))
    .find(parts => parts[1] === packageName);
const digest = (file, algorithm) => crypto.createHash(algorithm).update(fs.readFileSync(file)).digest('hex');
const packagePath = path.join(source, packageName);
if (digest(packagePath, 'sha1').toLowerCase() !== entry[0].toLowerCase() || fs.statSync(packagePath).size !== Number(entry[2]))
    throw new Error('Update package does not match RELEASES');
fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(path.join(source, 'Hintio-' + version + ' Setup.exe'), path.join(output, 'Hintio-' + version + '.Setup.exe'));
fs.copyFileSync(packagePath, path.join(output, packageName));
fs.writeFileSync(path.join(output, 'RELEASES'), entry.join(' ') + '\n');
const assets = ['Hintio-' + version + '.Setup.exe', packageName, 'RELEASES'];
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), assets.map(name => digest(path.join(output, name), 'sha256') + '  ' + name).join('\n') + '\n');
fs.writeFileSync(
    path.join(output, 'UPDATE-FEED-VERIFICATION.json'),
    JSON.stringify({ version, assets, manifestMatchesPackage: true, published: false }, null, 2) + '\n'
);
console.log('Prepared installer, full Squirrel package, RELEASES, and checksums in ' + output + '. Nothing was published.');
