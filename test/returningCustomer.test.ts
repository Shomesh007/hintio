import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { abortable, withDeadline } from '../src/lib/checkoutReliability';

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'App') as ts.FunctionDeclaration;
const declaration = app
    .body!.statements.filter(ts.isVariableStatement)
    .flatMap(node => [...node.declarationList.declarations])
    .find(node => ts.isIdentifier(node.name) && node.name.text === 'handleRecoverLicense')!;
const runnable = ts.transpileModule(`const recover = ${declaration.initializer!.getText(parsed)}; recover;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

let continuation: ts.VariableDeclaration | undefined;
function findContinuation(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'continueIntent') continuation = node;
    ts.forEachChild(node, findContinuation);
}
findContinuation(parsed);
const continueRunnable = ts.transpileModule(`const next = ${continuation!.initializer!.getText(parsed)}; next;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

for (const plan of ['monthly', 'yearly']) {
    test(`OAuth recovery_${plan} continuation retrieves an existing key without purchase or trial claims`, async () => {
        const delivered: string[] = [];
        const next = vm.runInNewContext(continueRunnable, {
            debugLog: () => {},
            clearIntentMarkers: () => {},
            setIsAuthModalOpen: () => {},
            deliverPaidLicense: async (value: string) => {
                delivered.push(value);
            },
            startRazorpayCheckout: () => assert.fail('Recovery OAuth must not start checkout'),
            supabase: { rpc: () => assert.fail('Recovery must not claim a trial key') },
        }) as (intent: string) => Promise<void>;
        await next(`recover_${plan}`);
        assert.deepEqual(delivered, [plan]);
    });
}

function setup(signedIn: boolean, stalled = false) {
    const values: Record<string, unknown> = {};
    const deliveries: string[] = [];
    const context = {
        REQUEST_TIMEOUT_MS: 8000,
        abortable,
        withDeadline,
        supabase: {
            auth: {
                getSession: () =>
                    stalled
                        ? new Promise(() => {})
                        : Promise.resolve({ data: { session: signedIn ? { user: { id: 'DEMO-ACCOUNT' } } : null }, error: null }),
            },
        },
        setAuthError: (value: unknown) => {
            values.error = value;
        },
        setAuthIntent: (value: unknown) => {
            values.intent = value;
        },
        setIsPendingLicenseOpen: (value: unknown) => {
            values.pendingOpen = value;
        },
        setIsAuthModalOpen: (value: unknown) => {
            values.authOpen = value;
        },
        deliverPaidLicense: async (plan: string) => {
            deliveries.push(plan);
        },
        // Any accidental connection to checkout or charging makes the test fail.
        startRazorpayCheckout: () => assert.fail('Recovery must not start checkout'),
    };
    return {
        values,
        deliveries,
        recover: vm.runInNewContext(runnable, context) as (plan: 'monthly' | 'yearly', signal?: AbortSignal) => Promise<void>,
    };
}

for (const plan of ['monthly', 'yearly'] as const) {
    test(`returning signed-in ${plan} customer goes directly to existing-key recovery`, async () => {
        const fake = setup(true);
        await fake.recover(plan);
        assert.deepEqual(fake.deliveries, [plan]);
        assert.equal(fake.values.authOpen, false);
    });
    test(`returning signed-out ${plan} customer signs in for recovery rather than purchase`, async () => {
        const fake = setup(false);
        await fake.recover(plan);
        assert.equal(fake.values.intent, `recover_${plan}`);
        assert.equal(fake.values.authOpen, true);
        assert.deepEqual(fake.deliveries, []);
    });
}

test('closing the returning tab during session restore cannot start a stale recovery loop', async () => {
    const fake = setup(true, true);
    const controller = new AbortController();
    const restoring = fake.recover('monthly', controller.signal);
    controller.abort();
    await restoring;
    assert.deepEqual(fake.deliveries, []);
    assert.equal(fake.values.authOpen, undefined);
});
