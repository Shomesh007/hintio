const test = require('node:test'),
    assert = require('node:assert/strict'),
    vm = require('node:vm'),
    fs = require('node:fs');
const { stripTypeScriptTypes } = require('node:module');
const source = stripTypeScriptTypes(
    fs.readFileSync(require('node:path').join(__dirname, '../supabase/functions/resolve-provider-secrets/index.ts'), 'utf8'),
    { mode: 'transform' }
);
test('legacy consuming and internal requests cannot obtain company credentials', async () => {
    let handler;
    let forwarded = false;
    vm.runInNewContext(source, {
        Deno: { env: { get: () => 'https://example.invalid' }, serve: fn => (handler = fn) },
        Request,
        Response,
        TextDecoder,
        AbortSignal,
        fetch: async () => {
            forwarded = true;
            throw Error('must not forward');
        },
    });
    for (const internal of [false, true]) {
        const response = await handler(
            new Request('https://example.invalid', {
                method: 'POST',
                headers: { 'content-type': 'application/json', ...(internal ? { 'x-runtime-secret': 'fake' } : {}) },
                body: JSON.stringify({ consume: !internal }),
            })
        );
        assert.equal(response.status, 426);
        assert.equal((await response.json()).secretsIssued, false);
    }
    assert.equal(forwarded, false);
});
