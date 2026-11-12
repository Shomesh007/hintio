const test = require('node:test'),
    assert = require('node:assert/strict');
const speech = require('../src/utils/speechStt');
test('managed speech runs without a company API key and clears on stop', async () => {
    const original = global.fetch;
    let transportCalls = 0;
    let result = '';
    global.fetch = async () => {
        throw Error('Managed speech must not call provider directly');
    };
    try {
        speech.startSpeechSTT(
            '',
            'en-US',
            text => {
                result = text;
            },
            async (wav, language) => {
                transportCalls++;
                assert.equal(wav.subarray(0, 4).toString(), 'RIFF');
                assert.equal(language, 'en-US');
                return 'Synthetic quality check';
            }
        );
        assert.equal(speech.isSpeechSTTActive(), true);
        const pcm = Buffer.alloc(48000);
        for (let i = 0; i < pcm.length; i += 2) pcm.writeInt16LE(i % 4 === 0 ? 5000 : -5000, i);
        speech.pushAudio(pcm.toString('base64'));
        speech.stopSpeechSTT();
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(transportCalls, 1);
        assert.equal(result, 'Synthetic quality check');
        assert.equal(speech.isSpeechSTTActive(), false);
    } finally {
        speech.stopSpeechSTT();
        global.fetch = original;
    }
});
