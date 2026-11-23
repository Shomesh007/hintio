const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/utils/renderer.js'), 'utf8');

test('audio input modes only start the requested audio sources on each desktop platform', async () => {
    const startCapture = source.slice(source.indexOf('async function startCapture('), source.indexOf('function setupLinuxMicProcessing('));
    for (const platform of ['win32', 'darwin', 'linux']) {
        for (const audioMode of ['speaker_only', 'mic_only', 'both', 'none']) {
            const speaker = audioMode === 'speaker_only' || audioMode === 'both';
            const microphone = audioMode === 'mic_only' || audioMode === 'both';
            const calls = [];
            const video = { getSettings: () => ({}) };
            const display = { getVideoTracks: () => [video], getAudioTracks: () => [] };
            const context = vm.createContext({
                isMacOS: platform === 'darwin',
                isLinux: platform === 'linux',
                currentImageQuality: null,
                mediaStream: null,
                SAMPLE_RATE: 24000,
                preferencesCache: { audioMode },
                loadPreferencesCache: async () => {},
                console: { log() {}, warn() {}, error: (...args) => { throw Error(args.join(' ')); } },
                ipcRenderer: { invoke: async channel => { calls.push(channel); return { success: true }; } },
                navigator: { mediaDevices: {
                    getDisplayMedia: async ({ audio }) => { calls.push(audio ? 'loopback' : 'screen-only'); return display; },
                    getUserMedia: async () => { calls.push('microphone'); return {}; },
                } },
                setupLinuxMicProcessing() {},
                setupWindowsLoopbackProcessing() {},
                setupLinuxSystemAudioProcessing() {},
            });
            vm.runInContext(startCapture, context);
            await context.startCapture();
            assert.equal(calls.includes('microphone'), microphone, `${platform} ${audioMode}`);
            assert.equal(calls.includes('loopback') || calls.includes('start-macos-audio'), speaker, `${platform} ${audioMode}`);
        }
    }
});

test('stopping capture closes the separate microphone stream and context and is repeatable', () => {
    const calls = [];
    const context = vm.createContext({
        clearPendingDualScreenshotState() {},
        dualScreenshotRequestInFlight: false,
        screenshotInterval: null,
        audioProcessor: null,
        audioContext: null,
        micAudioProcessor: {
            onaudioprocess() {},
            disconnect() {
                calls.push('disconnect');
            },
        },
        microphoneStream: {
            getTracks() {
                return [
                    {
                        stop() {
                            calls.push('mic-stop');
                        },
                    },
                ];
            },
        },
        micAudioContext: {
            close() {
                calls.push('mic-close');
                return Promise.resolve();
            },
        },
        mediaStream: {
            getTracks() {
                return [
                    {
                        stop() {
                            calls.push('display-stop');
                        },
                    },
                ];
            },
        },
        isMacOS: false,
        hiddenVideo: null,
        offscreenCanvas: null,
        offscreenContext: null,
    });
    const body = source.slice(source.indexOf('function stopCapture()'), source.indexOf('// Send text message via active provider runtime'));
    vm.runInContext(body, context);
    const processor = context.micAudioProcessor;
    context.stopCapture();
    assert.deepEqual(calls, ['disconnect', 'mic-stop', 'mic-close', 'display-stop']);
    assert.equal(processor.onaudioprocess, null);
    assert.equal(context.microphoneStream, null);
    assert.equal(context.micAudioContext, null);
    context.stopCapture();
    assert.equal(calls.length, 4);
});
