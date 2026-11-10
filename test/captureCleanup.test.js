const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../src/utils/renderer.js'), 'utf8');
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
