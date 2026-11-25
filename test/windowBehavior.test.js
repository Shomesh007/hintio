const test = require('node:test'),
    assert = require('node:assert/strict'),
    fs = require('node:fs'),
    path = require('node:path'),
    vm = require('node:vm');
function windowHarness(sources, preferences = {}, platform = 'win32') {
    let displayHandler;
    const events = new Map(),
        once = new Map(),
        ipc = new Map();
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
                    getBounds: () => ({ width: 1080, height: 560, x: 0, y: 0 }),
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
        screen: { getPrimaryDisplay: () => ({ workAreaSize: { width: 1920, height: 1080 }, workArea: { width: 1920, height: 1080, x: 0, y: 0 } }) },
        globalShortcut: { register: () => true, unregisterAll() {} },
        ipcMain: { handle: (name, fn) => ipc.set(name, fn), on() {} },
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
        require: name => (name === 'electron' ? electron : name === '../storage' ? { getKeybinds: () => null, getPreferences: () => preferences } : require(name)),
        process: { platform },
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
    return { options, events, methods, displayHandler };
}
test('Windows taskbar visibility follows the saved preference with no enforcement loops', () => {
    const h = windowHarness([]);
    assert.equal(h.options.skipTaskbar, true);
    assert.equal(windowHarness([], { hideFromTaskbar: false }).options.skipTaskbar, false);
    assert.equal(windowHarness([], { hideFromTaskbar: true }, 'linux').options.skipTaskbar, false);
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
test('screen capture includes loopback only when audio was requested', async () => {
    for (const audioRequested of [false, true]) {
        const h = windowHarness([{ id: 'screen:0' }]);
        const chosen = await new Promise(resolve => h.displayHandler({ audioRequested }, resolve));
        assert.equal(chosen.video.id, 'screen:0');
        assert.equal(chosen.audio, audioRequested ? 'loopback' : undefined);
    }
});
