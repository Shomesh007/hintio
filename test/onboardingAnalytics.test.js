const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../src/components/views/OnboardingView.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace('export class OnboardingView', 'class OnboardingView');

test('setup reports only the final context outcome for first-time completion', async () => {
    for (const [onboarded, context, expected] of [
        [false, '  \n  ', [['onboarding_completed', 'blank']]],
        [false, 'private resume text', [['onboarding_completed', 'provided']]],
        [true, 'returning private context', []],
    ]) {
        const sent = [];
        const View = vm.runInNewContext(source + '\nOnboardingView;', {
            LitElement: class {},
            css: () => '',
            customElements: { define() {} },
            window: { electronAPI: { invoke: async (_channel, ...args) => sent.push(args) } },
            hintio: { storage: {
                getConfig: async () => ({ onboarded }),
                setConfig: async () => ({ success: true }),
                updatePreference: async () => ({ success: true }),
            } },
        });
        const view = new View();
        view.privacyAccepted = true;
        view.contextText = context;
        await Promise.all([view.completeOnboarding(), view.completeOnboarding()]);
        assert.deepEqual(sent, expected);
    }
});
