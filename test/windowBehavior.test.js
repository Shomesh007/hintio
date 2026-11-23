const test = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    path = require('node:path'),
    vm = require('node:vm');
function windowHarness(sources) {
    let displayHandler;
    const events = new Map(),
        once = new Map(),
        ipc = new Map(),
        messages = new Map();
    let bounds = { width: 1080, height: 560, x: 0, y: 0 };
    let options;
    const methods = [];
    const contents = {
        setWindowOpenHandler() {},
        once(name, fn) {
            once.set(name, fn);
        },
        on() {},
        send() {},
    };
    let window;
    class BrowserWindow {
        constructor(opts) {
            options = opts;
            window = new Proxy(
                {
                    webContents: contents,
                    on(name, fn) {
                        events.set(name, fn);
                    },
                    isDestroyed: () => false,
                    isVisible: () => true,
                    getBounds: () => ({ ...bounds }),
                    getMinimumSize: () => [560, 420],
                    setBounds(next) {
                        bounds = { ...next };
                        methods.push(['setBounds', next]);
                    },
                    setPosition(x, y) {
                        bounds = { ...bounds, x, y };
                        methods.push(['setPosition', x, y]);
                    },
                },
                {
                    get(target, name) {
                        return target[name] || ((...args) => methods.push([name, ...args]));
                    },
                }
            );
            return window;
        }
    }
    const electron = {
        app: { isPackaged: true },
        BrowserWindow,
        screen: {
            getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 }, workArea: { width: 1920, height: 1080, x: 0, y: 0 } }),
            getDisplayMatching: () => ({ workArea: { width: 1600, height: 900, x: -1600, y: 30 } }),
        },
        globalShortcut: { register: () => true, unregisterAll() {} },
        ipcMain: { handle: (name, fn) => ipc.set(name, fn), on: (name, fn) => messages.set(name, fn) },
        session: {
            defaultSession: {
                setDisplayMediaRequestHandler: fn => {
                    displayHandler = fn;
                },
            },
        },
        desktopCapturer: {
            getSources: async () => {
                if (sources instanceof Error) throw sources;
                return sources;
            },
        },
        shell: { openExternal: async () => {} },
    };
    const context = {
        module: { exports: {} },
        require: name => (name === 'electron' ? electron : name === '../storage' ? { getKeybinds: () => null } : require(name)),
        process: { platform: 'win32' },
        console,
        setTimeout() {},
        clearTimeout() {},
        setInterval() {
            throw Error('Unexpected enforcement loop');
        },
        clearInterval() {},
        __dirname: path.resolve(__dirname, '../src/utils'),
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/utils/window.js'), 'utf8'), context);
    context.module.exports.createWindow(() => {}, { current: null });
    return { options, events, methods, displayHandler, ipc, messages, getBounds: () => ({ ...bounds }) };
}

test('navigation preserves the size and position set by a manual resize', () => {
    const h = windowHarness([]);
    h.messages.get('window-manual-resize-start')({}, { edge: 'br', startX: 100, startY: 100 });
    h.messages.get('window-manual-resize-step')({}, { dx: -200, dy: 45 });
    h.messages.get('window-manual-resize-end')();
    const userBounds = h.getBounds();
    assert.equal(userBounds.width, 780);
    assert.equal(userBounds.height, 505);
    h.methods.length = 0;
    for (const view of ['assistant', 'main', 'customize', 'assistant']) h.messages.get('view-changed')({}, view);
    assert.deepEqual(h.getBounds(), userBounds);
    assert.ok(!h.methods.some(([method]) => ['setBounds', 'setSize', 'setPosition'].includes(method)));
});

test('docking only moves the current width and height, and rejects obsolete position hints', async () => {
    const h = windowHarness([]);
    const { width, height } = h.getBounds();
    for (const [destination, x] of [['left', -1600], ['right', -1080], ['default', -1340]]) {
        assert.equal((await h.ipc.get('reposition-window')({}, destination)).success, true);
        assert.deepEqual(h.getBounds(), { x, y: 30, width, height });
    }
    const docked = h.getBounds();
    assert.equal((await h.ipc.get('reposition-window')({}, 'top-left')).success, false);
    assert.deepEqual(h.getBounds(), docked);
});

test('leaving the assistant cancels a drag, and invalid coordinates cannot change bounds', () => {
    const h = windowHarness([]);
    const start = h.messages.get('window-manual-resize-start');
    const move = h.messages.get('window-manual-resize-step');
    const before = h.getBounds();
    start({}, { edge: 'invalid', startX: 0, startY: 0 });
    move({}, { dx: 100, dy: 100 });
    assert.deepEqual(h.getBounds(), before);
    h.messages.get('view-changed')({}, 'assistant');
    start({}, { edge: 'br', startX: 0, startY: 0 });
    move({}, { dx: Infinity, dy: 100 });
    assert.deepEqual(h.getBounds(), before);
    h.messages.get('view-changed')({}, 'main');
    move({}, { dx: 100, dy: 100 });
    assert.deepEqual(h.getBounds(), before);
});
test('desktop window allows normal taskbar and minimize behavior without enforcement loops', () => {
    const h = windowHarness([]);
    assert.equal(h.options.skipTaskbar, false);
    assert.equal(h.events.has('minimize'), false);
    assert.equal(h.events.has('blur'), false);
    assert.ok(!h.methods.some(row => row[0] === 'restore'));
});
test('screen capture handles no sources and capture denial without unhandled errors', async () => {
    for (const sources of [[], new Error('capture denied')]) {
        const h = windowHarness(sources);
        await new Promise(resolve =>
            h.displayHandler({}, value => {
                assert.equal(Object.keys(value).length, 0);
                resolve();
            })
        );
    }
});
test('screen capture selects an available source using the documented loopback API', async () => {
    const h = windowHarness([{ id: 'screen:0' }]);
    await new Promise(resolve =>
        h.displayHandler({ audioRequested: true }, value => {
            assert.equal(value.video.id, 'screen:0');
            assert.equal(value.audio, 'loopback');
            resolve();
        })
    );
});

test('screen-only capture never attaches system loopback audio', async () => {
    const source = { id: 'screen:1' };
    const h = windowHarness([source]);
    const result = await new Promise(resolve => h.displayHandler({ audioRequested: false }, resolve));
    assert.equal(result.video, source);
    assert.equal('audio' in result, false);
});
