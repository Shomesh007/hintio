const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const FORMAT = 'hintio.aes-gcm.v1';
async function openProtectedStorage(directory, safeStorage) {
    if (!(await safeStorage.isAsyncEncryptionAvailable()))
        throw new Error('Windows data protection is unavailable. Hintio will not store unprotected records.');
    const keyPath = path.join(directory, 'storage-key.dpapi');
    let key;
    if (fs.existsSync(keyPath)) {
        const decrypted = await safeStorage.decryptStringAsync(fs.readFileSync(keyPath));
        key = Buffer.from(decrypted.result, 'base64');
        if (key.length !== 32) throw new Error('The protected storage key is invalid');
    } else {
        for (const folder of [directory, path.join(directory, 'history')]) {
            if (!fs.existsSync(folder)) continue;
            for (const name of fs.readdirSync(folder).filter(n => n.endsWith('.json'))) {
                const value = JSON.parse(fs.readFileSync(path.join(folder, name), 'utf8'));
                if (value.format === FORMAT) throw new Error('The protected storage key is missing. Existing records were left unchanged.');
            }
        }
        key = crypto.randomBytes(32);
        const wrapped = await safeStorage.encryptStringAsync(key.toString('base64'));
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(keyPath, wrapped, { flag: 'wx', mode: 0o600 });
    }
    const aad = file => Buffer.from(FORMAT + '|' + path.relative(directory, file));
    return {
        keyPath,
        encode(text, file) {
            const iv = crypto.randomBytes(12),
                cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
            cipher.setAAD(aad(file));
            const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
            return {
                format: FORMAT,
                iv: iv.toString('base64'),
                tag: cipher.getAuthTag().toString('base64'),
                ciphertext: ciphertext.toString('base64'),
            };
        },
        decode(record, file) {
            if (record.format !== FORMAT) throw new Error('Unknown protected storage format');
            const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(record.iv, 'base64'));
            decipher.setAAD(aad(file));
            decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
            return Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]).toString('utf8');
        },
    };
}
module.exports = { openProtectedStorage, FORMAT };
