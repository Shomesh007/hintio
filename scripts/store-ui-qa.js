const fs = require('node:fs'),
    path = require('node:path'),
    http = require('node:http'),
    assert = require('node:assert/strict');
const { chromium } = require('playwright');
const { parseDocument } = require('../src/utils/documentImport');
const root = path.resolve(__dirname, '..'),
    output = path.join(root, 'out', 'store-listing-1.0.5');
async function main() {
    fs.mkdirSync(output, { recursive: true });
    const parsed = await parseDocument(path.join(root, 'test', 'fixtures', 'resume-synthetic.docx'));
    const bridge =
        'window.syntheticDocument=' +
        JSON.stringify(parsed) +
        ';\n' +
        fs.readFileSync(path.join(root, 'test/fixtures/store-browser-bridge.js'), 'utf8');
    const html = fs.readFileSync(path.join(root, 'src/index.html'), 'utf8').replace('src="utils/renderer.js"', 'src="/qa-bridge.js"');
    const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost').pathname;
        if (url === '/qa-bridge.js') {
            res.setHeader('Content-Type', 'text/javascript');
            return res.end(bridge);
        }
        if (url === '/src/index.html') {
            res.setHeader('Content-Type', 'text/html');
            return res.end(html);
        }
        const file = path.resolve(root, '.' + url);
        if (!file.startsWith(path.join(root, 'src') + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
            res.writeHead(404);
            return res.end();
        }
        const ext = path.extname(file);
        res.setHeader(
            'Content-Type',
            ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.png' ? 'image/png' : 'application/octet-stream'
        );
        res.end(fs.readFileSync(file));
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({
            headless: true,
            ...(process.env.HINTIO_TEST_CHROMIUM ? { executablePath: process.env.HINTIO_TEST_CHROMIUM } : {}),
        });
        const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } }),
            errors = [],
            screenshots = [];
        page.on('pageerror', e => errors.push(e.message));
        const base = 'http://127.0.0.1:' + server.address().port;
        await page.route('**/*', route => (route.request().url().startsWith(base) ? route.continue() : route.abort()));
        await page.goto(base + '/src/index.html');
        await page.waitForFunction(() => document.querySelector('hintio-app')?.shadowRoot?.querySelector('main-view'));
        async function shot(file, caption) {
            await page.screenshot({ path: path.join(output, file), animations: 'disabled' });
            screenshots.push({
                file,
                caption,
                width: 1600,
                height: 1000,
                capture: 'Actual app components in browser with test-only native bridge and synthetic data',
            });
        }
        await shot('01-home.png', 'Enter your access token to start a session. Paid access is required.');
        await page.getByRole('button', { name: 'Start Session', exact: true }).click();
        assert.equal(await page.evaluate(() => uiTestState.calls.some(c => c[0] === 'initialize')), false);
        await page.getByPlaceholder('Enter access token', { exact: true }).fill('SKI-synthetic-store-qa-token');
        await page.evaluate(() => {
            uiTestState.approved = false;
        });
        await page.getByRole('button', { name: 'Start Session', exact: true }).click();
        await page.waitForFunction(() => uiTestState.calls.some(c => c[0] === 'initialize'));
        assert.equal(await page.evaluate(() => uiTestState.capture), false);
        await page.getByRole('button', { name: 'AI Context', exact: true }).click();
        await page.evaluate(async () => {
            const v = document.querySelector('hintio-app').shadowRoot.querySelector('ai-customize-view');
            await v.updateComplete;
            await v._handleResumeUpload();
        });
        assert.match(await page.evaluate(() => uiTestState.prefs.resumeText), /Synthetic resume fixture/);
        await shot('02-context.png', 'Add custom instructions and document context. This screen uses a synthetic resume.');
        await page.getByRole('button', { name: 'History', exact: true }).click();
        await page.evaluate(async () => {
            const v = document.querySelector('hintio-app').shadowRoot.querySelector('history-view');
            await v.openSession('1794300000000');
        });
        await page.getByRole('button', { name: 'Save', exact: true }).click();
        assert.match(await page.evaluate(() => uiTestState.exports[0].text), /Example AI draft/);
        await shot('03-history.png', 'Review and export a session. Example content shown; exported files may be unencrypted.');
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByText('Privacy & Data', { exact: true }).evaluate(element => element.scrollIntoView({ block: 'start' }));
        await shot('04-privacy.png', 'Review privacy controls, withdraw cloud consent, or manage local records.');
        await page.getByRole('button', { name: 'Restore settings', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Confirm reset settings', exact: true }).count(), 1);
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await page.evaluate(() => uiTestState.cleared || false), false);
        await page.getByRole('button', { name: 'Delete local data', exact: true }).click();
        assert.equal(await page.getByRole('button', { name: 'Confirm delete local data', exact: true }).count(), 1);
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.equal(await page.evaluate(() => uiTestState.cleared || false), false);
        await page.getByRole('button', { name: 'Home', exact: true }).click();
        await page.evaluate(() => {
            uiTestState.approved = true;
        });
        await page.getByPlaceholder('Enter access token', { exact: true }).fill('SKI-synthetic-store-qa-token');
        await page.getByRole('button', { name: 'Start Session', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('hintio-app').currentView === 'assistant');
        await page.evaluate(async () => {
            const app = document.querySelector('hintio-app');
            app.responses = [
                '### Example AI draft\nTo make a project handoff clearer:\n\n- Name the next owner.\n- Record acceptance criteria.\n- Agree a review date.\n\nThis is synthetic example content.',
            ];
            app.currentResponseIndex = 0;
            await app.updateComplete;
        });
        await shot('05-assistant.png', 'AI-generated responses include a reporting control. Synthetic example content shown.');
        await page.getByRole('button', { name: 'Report response by email', exact: true }).click();
        const reportUrl = await page.evaluate(() => uiTestState.calls.filter(c => c[0] === 'open-external').at(-1)?.[1]);
        assert.ok(reportUrl.startsWith('mailto:admin@builtbygsv.in?'));
        assert.ok(reportUrl.length <= 1900);
        assert.ok(!reportUrl.includes('SKI-synthetic'));
        const sanitization = await page.evaluate(() => {
            const view = document.querySelector('hintio-app').shadowRoot.querySelector('assistant-view');
            return view.renderMarkdown('<img src=x onerror="alert(1)"><script>alert(2)</script>[bad](javascript:alert(3))');
        });
        assert.doesNotMatch(sanitization, /onerror=|<script|href="javascript:/i);
        await page.getByRole('button', { name: 'Stop & withdraw consent', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('hintio-app').currentView === 'onboarding');
        assert.equal(await page.evaluate(() => uiTestState.config.cloudConsent), false);
        assert.equal(await page.evaluate(() => uiTestState.capture), false);
        await page.evaluate(async () => {
            const view = document.querySelector('hintio-app').shadowRoot.querySelector('onboarding-view');
            view.currentSlide = 2;
            await view.updateComplete;
        });
        const continueButton = page.getByRole('button', { name: 'Go to Start Session', exact: true });
        assert.equal(await continueButton.isDisabled(), true);
        await page.getByRole('checkbox').check();
        await continueButton.click();
        await page.waitForFunction(() => uiTestState.config.cloudConsent === true);
        await page.setViewportSize({ width: 560, height: 420 });
        for (const route of ['main', 'ai-customize', 'history', 'customize', 'feedback', 'help', 'updates']) {
            await page.evaluate(async route => {
                const app = document.querySelector('hintio-app');
                app.currentView = route;
                await app.updateComplete;
            }, route);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, route + ' horizontal overflow');
        }
        assert.deepEqual(errors, []);
        fs.writeFileSync(path.join(output, 'SCREENSHOTS.json'), JSON.stringify(screenshots, null, 2) + '\n');
        fs.writeFileSync(
            path.join(output, 'UI-TEST-RESULTS.json'),
            JSON.stringify(
                {
                    realAppComponents: true,
                    nativeBridge: 'test double; not installed-runtime verification',
                    network: 'all non-localhost requests blocked',
                    invalidAndMissingToken: true,
                    documentImportUI: true,
                    historyExport: true,
                    resetAndDeleteConfirmation: true,
                    syntheticSessionStart: true,
                    aiReportingDraft: true,
                    markdownInjectionStripped: true,
                    consentWithdrawalStopsCapture: true,
                    consentReentry: true,
                    smallWindowNoDocumentOverflow: true,
                    rendererErrors: errors,
                    screenshots: screenshots.length,
                },
                null,
                2
            ) + '\n'
        );
        console.log('Store UI tests passed; ' + screenshots.length + ' full-size app screenshots prepared.');
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
