const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const sharp = require('sharp');
const root = path.resolve(__dirname, '..');
const version = require('../package.json').version;
const out = path.join(root, 'out', 'store-listing-' + version);
const draft = require('../packaging/store/submission.json');
async function main() {
    fs.mkdirSync(out, { recursive: true });
    assert(draft.shortDescription.length <= 100);
    assert(draft.keywords.length <= 7);
    draft.keywords.forEach(s => assert(s.length <= 30));
    draft.features.forEach(s => assert(s.length <= 200));
    assert(draft.usesLiveGenerativeAI === true);
    const screenshots = JSON.parse(fs.readFileSync(path.join(out, 'SCREENSHOTS.json'), 'utf8'));
    for (const item of screenshots) {
        const file = path.join(out, item.file);
        const metadata = await sharp(file).metadata();
        assert(metadata.format === 'png' && metadata.width >= 1366 && metadata.height >= 768);
        assert(fs.statSync(file).size <= 50 * 1024 * 1024);
        assert(item.caption.length <= 200);
    }
    await sharp(path.join(root, 'src/assets/logo.png'))
        .resize(300, 300, { fit: 'contain', background: '#00000000' })
        .png()
        .toFile(path.join(out, 'StoreTile300.png'));
    fs.writeFileSync(path.join(out, 'listing.en-US.json'), JSON.stringify(draft, null, 2) + '\n');
    for (const name of ['REVIEWER-NOTES.md', 'POLICY-REVIEW.md', 'BILLING-AUDIT.md'])
        fs.copyFileSync(path.join(root, 'packaging/store', name), path.join(out, name));
    const files = fs.readdirSync(out).filter(n => /\.(png|json|md)$/.test(n) && n !== 'BUNDLE-REPORT.json');
    const hashes = files.map(name => ({
        file: name,
        sha256: crypto
            .createHash('sha256')
            .update(fs.readFileSync(path.join(out, name)))
            .digest('hex'),
    }));
    const report = {
        version,
        status: 'prepared-not-submitted',
        screenshotChecksPassed: true,
        screenshots: screenshots.length,
        tile: '300x300 PNG',
        files: hashes,
        releaseGates: [
            'Business verification and real Store identity',
            'Deferred live webhook setup, real Test-mode captured checkout and legacy proof review',
            'Working private reviewer token and backend',
            'IARC and generative AI declarations',
            'WACK and signed installed runtime tests',
        ],
    };
    fs.writeFileSync(path.join(out, 'BUNDLE-REPORT.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, screenshots: screenshots.length, files: hashes.length, output: out }, null, 2));
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
