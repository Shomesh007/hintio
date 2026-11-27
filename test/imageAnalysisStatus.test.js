const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../src/utils/renderer.js'), 'utf8');
const helpers = source.slice(source.indexOf('function clearImageAnalysisStatus('), source.indexOf('// ============ TELEGRAM MULTI-IMAGE HANDLING'));

function createRenderer(invoke, { sessionActive = true } = {}) {
    const app = { statusText: 'Live', sessionActive, responses: [] };
    const context = vm.createContext({
        console: { log() {}, error() {} },
        ipcRenderer: { invoke },
        hintio: {
            element: () => app,
            setStatus: text => {
                app.statusText = text;
            },
            addNewResponse: text => app.responses.push(text),
        },
        pendingDualScreenshotBase64List: ['a', 'b', 'c'],
        dualScreenshotRequestInFlight: false,
        dualScreenshotTimeoutHandle: null,
        clearTimeout() {},
        clearPendingDualScreenshotState() {},
        recordScreenshotUsage() {},
        DUAL_SCREENSHOT_PROMPT_PREFIX: '',
        MANUAL_SCREENSHOT_PROMPT: '',
    });
    vm.runInContext(helpers, context);
    return { app, context };
}

test('a three-screenshot batch does not leave "Analyzing" on screen after the answer', async () => {
    const seen = [];
    const { app, context } = createRenderer(async () => {
        seen.push(app.statusText);
        return { success: true, model: 'test' };
    });
    await context.sendPendingDualScreenshots('max-captures');
    assert.deepEqual(seen, ['Analyzing 3 screenshots...']);
    assert.equal(app.statusText, 'Live');
});

test('a failed or thrown screenshot request shows an error and clears the status', async () => {
    for (const invoke of [async () => ({ success: false, error: 'OpenAI error 400' }), async () => Promise.reject(new Error('IPC closed'))]) {
        const { app, context } = createRenderer(invoke);
        const result = await context.sendPendingDualScreenshots('max-captures');
        assert.equal(app.statusText, 'Live');
        assert.equal(app.responses.length, 1);
        assert.match(app.responses[0], /^Error: /);
        assert.equal(result, undefined);
        assert.equal(context.dualScreenshotRequestInFlight, false);
    }
});

test('a newer status is kept, and an ended session is left with no status', async () => {
    const { app, context } = createRenderer(async () => {
        app.statusText = 'Reconnecting...';
        return { success: true };
    });
    await context.requestImageAnalysis('Analyzing failed test screenshot...', { data: 'x' });
    assert.equal(app.statusText, 'Reconnecting...');

    const ended = createRenderer(async () => ({ success: true }), { sessionActive: false });
    await ended.context.requestImageAnalysis('Analyzing Telegram image...', { data: 'x' });
    assert.equal(ended.app.statusText, '');
});
