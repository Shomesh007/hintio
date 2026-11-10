const test = require('node:test'),
    assert = require('node:assert/strict'),
    path = require('node:path'),
    fs = require('node:fs'),
    os = require('node:os');
const { parseDocument } = require('../src/utils/documentImport');
test('real PDF and DOCX parsers extract synthetic document text', async () => {
    for (const ext of ['pdf', 'docx']) {
        const parsed = await parseDocument(path.join(__dirname, 'fixtures', 'resume-synthetic.' + ext));
        assert.match(parsed.text, /Synthetic resume fixture/);
        assert.equal(parsed.fileName, 'resume-synthetic.' + ext);
    }
});
test('document importer rejects empty, oversized, spoofed PDF and unsupported files', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hintio-import-'));
    try {
        for (const name of ['empty.pdf', 'spoof.pdf', 'bad.exe', 'large.pdf'])
            fs.writeFileSync(path.join(root, name), name === 'empty.pdf' ? '' : 'not a pdf');
        fs.truncateSync(path.join(root, 'large.pdf'), 10 * 1024 * 1024 + 1);
        for (const name of ['empty.pdf', 'spoof.pdf', 'bad.exe', 'large.pdf']) await assert.rejects(parseDocument(path.join(root, name)));
    } finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
});
