const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const source = path.join(root, 'out', 'make', 'squirrel.windows', 'x64', 'Hintio-' + version + ' Setup.exe');
const output = path.join(root, 'out', 'release-manual-' + version);
if (!fs.statSync(source).isFile()) throw new Error('Windows installer is missing');
fs.mkdirSync(output, { recursive: true });
const name = 'Hintio-' + version + '.Setup.exe';
fs.copyFileSync(source, path.join(output, name));
const digest = crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(output, name)))
    .digest('hex');
fs.writeFileSync(path.join(output, 'SHA256SUMS.txt'), digest + '  ' + name + '\n');
fs.writeFileSync(
    path.join(output, 'BUILD-VERIFICATION.json'),
    JSON.stringify({ version, installer: name, sha256: digest, updateMethod: 'browser-installer-link', published: false }, null, 2) + '\n'
);
console.log('Prepared manual installer and checksum in ' + output + '. Nothing was published.');
