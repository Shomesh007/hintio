const fs = require('node:fs'),
    path = require('node:path'),
    http = require('node:http'),
    assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'),
    dist = path.join(root, 'hintio-website/dist'),
    out = path.join(root, 'out/billing-lifecycle-2026-11-10');
async function main() {
    fs.mkdirSync(out, { recursive: true });
    const server = http.createServer((req, res) => {
        let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (!path.extname(name)) name = '/index.html';
        const file = path.resolve(dist, '.' + name);
        if (!file.startsWith(dist + path.sep)) {
            res.writeHead(403);
            res.end();
            return;
        }
        if (!fs.existsSync(file)) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.setHeader(
            'Content-Type',
            file.endsWith('.js')
                ? 'text/javascript'
                : file.endsWith('.css')
                  ? 'text/css'
                  : file.endsWith('.svg')
                    ? 'image/svg+xml'
                    : file.endsWith('.html')
                      ? 'text/html'
                      : 'application/octet-stream'
        );
        res.end(fs.readFileSync(file));
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const base = 'http://127.0.0.1:' + server.address().port;
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.HINTIO_TEST_CHROMIUM, headless: true });
        const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } }),
            page = await context.newPage(),
            errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await context.addInitScript(() => {
            const part = x => btoa(JSON.stringify(x)).replace(/=/g, '');
            const user = {
                id: '11111111-1111-4111-8111-111111111111',
                email: 'synthetic@example.invalid',
                aud: 'authenticated',
                role: 'authenticated',
            };
            const expiry = Math.floor(Date.now() / 1000) + 3600;
            localStorage.setItem(
                'sb-vsybqtunyuanxspxhzue-auth-token',
                JSON.stringify({
                    access_token: part({ alg: 'HS256', typ: 'JWT' }) + '.' + part({ ...user, exp: expiry }) + '.synthetic',
                    refresh_token: 'synthetic',
                    expires_at: expiry,
                    expires_in: 3600,
                    token_type: 'bearer',
                    user,
                })
            );
        });
        let cancelled = false,
            cancelCalls = 0,
            recoveryCalls = 0,
            failNext = false;
        await context.route('**/*', async route => {
            const url = route.request().url();
            if (url.startsWith(base)) {
                await route.continue();
                return;
            }
            if (url.includes('/auth/v1/user')) {
                await route.fulfill({
                    json: {
                        id: '11111111-1111-4111-8111-111111111111',
                        email: 'synthetic@example.invalid',
                        aud: 'authenticated',
                        role: 'authenticated',
                    },
                });
                return;
            }
            if (url.includes('/functions/v1/manage-billing')) {
                const b = route.request().postDataJSON();
                if (failNext) {
                    failNext = false;
                    await route.fulfill({ status: 503, json: { error: 'Synthetic provider sync failed. Please retry.' } });
                    return;
                }
                if (b.action === 'cancel') {
                    assert.equal(b.confirm, true);
                    assert.equal(b.licenseId, 'synthetic-license');
                    cancelCalls++;
                    cancelled = true;
                }
                if (b.action === 'recover') {
                    assert.equal(b.paymentId, 'pay_example');
                    recoveryCalls++;
                }
                await route.fulfill({
                    json: {
                        purchases: [
                            {
                                id: 'synthetic-license',
                                plan: 'monthly',
                                status: 'active',
                                validUntil: '2027-01-10T00:00:00Z',
                                billingStatus: 'active',
                                cancelScheduled: cancelled,
                                autoRenew: !cancelled,
                                needsReview: false,
                            },
                        ],
                        warnings: [],
                    },
                });
                return;
            }
            await route.abort();
        });
        await page.goto(base + '/access');
        await page.getByRole('button', { name: 'Manage my billing', exact: true }).click();
        await page.getByRole('button', { name: 'Cancel monthly renewal', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Cancel monthly renewal', exact: true }).click();
        assert.equal(cancelCalls, 0);
        await page.getByRole('button', { name: 'Keep renewal', exact: true }).click();
        assert.equal(cancelCalls, 0);
        await page.getByRole('button', { name: 'Cancel monthly renewal', exact: true }).click();
        await page.locator('#billing').screenshot({ path: path.join(out, 'billing-confirmation.png'), animations: 'disabled' });
        await page.getByRole('button', { name: 'Confirm end-of-cycle cancellation', exact: true }).click();
        await page.getByText('Renewal stopped. Any remaining paid access is retained.', { exact: true }).waitFor();
        assert.equal(cancelCalls, 1);
        assert.equal(await page.getByRole('button', { name: 'Cancel monthly renewal', exact: true }).count(), 0);
        await page.getByLabel('Have a captured payment reference?').fill('pay_example');
        await page.getByRole('button', { name: 'Verify payment & repair access', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Payment proof verified' }).waitFor();
        assert.equal(recoveryCalls, 1);
        failNext = true;
        await page.getByRole('button', { name: 'Refresh billing', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'Synthetic provider sync failed' }).waitFor();
        await page.getByRole('button', { name: 'Refresh billing', exact: true }).click();
        await page.getByRole('button', { name: 'Refresh billing', exact: true }).waitFor();
        await page.getByRole('button', { name: 'Yearly', exact: true }).click();
        await page.getByText('₹14,000 / 365 days', { exact: true }).waitFor();
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#billing').scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        await page.locator('#billing').screenshot({ path: path.join(out, 'billing-mobile.png'), animations: 'disabled' });
        const signedOut = await browser.newContext({ viewport: { width: 1280, height: 900 } }),
            outPage = await signedOut.newPage();
        await signedOut.route('**/*', route => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
        await signedOut.addInitScript(() => sessionStorage.setItem('hintio_billing_return', '1'));
        await outPage.goto(base + '/');
        await outPage.waitForURL('**/access#billing');
        await outPage.getByRole('button', { name: 'Manage my billing', exact: true }).click();
        await outPage.getByRole('button', { name: 'Sign in with Google', exact: true }).waitFor();
        assert.deepEqual(errors, []);
        fs.writeFileSync(
            path.join(out, 'UI-RESULTS.json'),
            JSON.stringify(
                {
                    actualBuiltWebsite: true,
                    backend: 'test transport only; real SQL tested separately',
                    cancelRequiresConfirmation: true,
                    keepRenewalSendsNoCancellation: true,
                    cancelRequestCount: cancelCalls,
                    paymentReferenceRecovery: true,
                    errorAndRetry: true,
                    yearlyPriceDisplayed: 14000,
                    mobileNoHorizontalOverflow: true,
                    signedOutRequiresSignIn: true,
                    realPaymentsOrCancellations: 0,
                    pageErrors: errors,
                },
                null,
                2
            )
        );
        console.log('Built-site billing UI checks passed. No real payment or subscription was changed.');
    } finally {
        if (browser) await browser.close();
        await new Promise(r => server.close(r));
    }
}
main().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
