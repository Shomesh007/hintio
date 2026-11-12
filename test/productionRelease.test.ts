import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { productionRelease } from '../src/lib/productionRelease';
const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function actualFunction(name: string, context: Record<string, unknown>) {
    let declaration: ts.VariableDeclaration | undefined;
    function visit(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === name) declaration = node;
        ts.forEachChild(node, visit);
    }
    visit(parsed);
    assert(declaration);
    const compiled = ts.transpileModule(`const fn=${declaration.initializer!.getText(parsed)};fn;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    return vm.runInNewContext(compiled, context);
}
test('public installer stays on official 1.0.4', () => {
    const opened: unknown[][] = [];
    const download = actualFunction('triggerDownload', {
        debugLog: () => {},
        windowsDownloadUrl: productionRelease.windowsDownloadUrl,
        window: { open: (...args: unknown[]) => opened.push(args) },
    });
    download();
    assert.equal(opened.length, 1);
    assert.match(String(opened[0][0]), /\/v1\.0\.4\/Hintio-1\.0\.4\.Setup\.exe$/);
});
test('signed-out trial user is asked to sign in before a key is claimed', async () => {
    let auth = false;
    const click = actualFunction('handleDownloadClick', {
        setAuthError: () => {},
        setAuthIntent: () => {},
        supabase: { auth: { getSession: async () => ({ data: { session: null }, error: null }) } },
        setIsAuthModalOpen: (value: boolean) => (auth = value),
        claimTrialAndDownload: () => assert.fail('Must sign in first'),
    });
    await click();
    assert.equal(auth, true);
});
test('signed-in trial user goes to key issuance', async () => {
    let claims = 0;
    const click = actualFunction('handleDownloadClick', {
        setAuthError: () => {},
        setAuthIntent: () => {},
        supabase: { auth: { getSession: async () => ({ data: { session: {} }, error: null }) } },
        setIsAuthModalOpen: () => assert.fail('Already signed in'),
        claimTrialAndDownload: async () => claims++,
    });
    await click();
    assert.equal(claims, 1);
});
test('OAuth download continuation retrieves a trial key', async () => {
    let claims = 0;
    const next = actualFunction('continueIntent', {
        debugLog: () => {},
        clearIntentMarkers: () => {},
        setIsAuthModalOpen: () => {},
        claimTrialAndDownload: async () => claims++,
    });
    await next('download');
    assert.equal(claims, 1);
});
for (const isNew of [true, false])
    test('trial key shown before download including returning user ' + isNew, async () => {
        const state: Record<string, unknown> = {};
        let requests = 0;
        const claim = actualFunction('claimTrialAndDownload', {
            getTrialDeviceId: () => '11111111-1111-4111-8111-111111111111',
            window: { localStorage: {} },
            supabase: {
                functions: {
                    invoke: async (name: string, options: any) => {
                        assert.equal(name, 'claim-trial-access');
                        assert(options.body.deviceId);
                        requests++;
                        return { data: { access_key: 'SYNTHETIC_TRIAL_KEY', is_new: isNew }, error: null };
                    },
                },
            },
            withDeadline: (fn: Function) => fn({}),
            setAuthError: (v: unknown) => (state.error = v),
            setIsAuthModalOpen: (v: unknown) => (state.auth = v),
            setTrialKey: (v: unknown) => (state.key = v),
            setIsKeyCopied: () => {},
            setIsTrialModalOpen: (v: unknown) => (state.modal = v),
        });
        await claim();
        assert.equal(requests, 1);
        assert.equal(state.key, 'SYNTHETIC_TRIAL_KEY');
        assert.equal(state.modal, true);
        assert.equal(state.auth, false);
    });
test('production and preserved Store candidate remain separate with trials enabled', () => {
    assert.equal(productionRelease.version, '1.0.4');
    assert.equal(productionRelease.storeCandidateVersion, '1.0.6');
    assert.equal(productionRelease.freeTrialsEnabled, true);
});
