const fs = require('node:fs/promises');
const path = require('node:path');
const { ensureFilePath, sanitizeText } = require('./inputValidation');
async function parseDocument(filePath) {
    const safePath = ensureFilePath(filePath, { fieldName: 'document path', allowedExtensions: ['.pdf', '.docx'] });
    const stat = await fs.stat(safePath);
    if (!stat.isFile() || stat.size <= 0 || stat.size > 10 * 1024 * 1024) throw new Error('Only nonempty PDF/DOCX files up to 10MB are allowed.');
    let text;
    const ext = path.extname(safePath).toLowerCase();
    if (ext === '.docx') {
        text = (await require('mammoth').extractRawText({ path: safePath })).value;
    } else {
        const buffer = await fs.readFile(safePath);
        if (buffer.subarray(0, 4).toString() !== '%PDF') throw new Error('Invalid PDF file signature');
        text = (await require('pdf-parse')(new Uint8Array(buffer))).text;
    }
    return {
        text: sanitizeText(String(text || ''), { fieldName: 'document text', maxLength: 250000, allowEmpty: true }),
        fileName: path.basename(safePath),
    };
}
module.exports = { parseDocument };
