import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { REQUEST_TIMEOUT_MS, CHECKOUT_TIMEOUT_MS, KEY_RECOVERY_TIMEOUT_MS } from '../src/lib/checkoutReliability';

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'App') as ts.FunctionDeclaration;
const declaration = app
    .body!.statements.filter(ts.isVariableStatement)
    .flatMap(node => [...node.declarationList.declarations])
    .find(node => ts.isIdentifier(node.name) && node.name.text === 'deliverPaidLicense')!;
const runnable = ts.transpileModule(`const deliver = ${declaration.initializer!.getText(parsed)}; deliver;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(issue: () => Promise<string>, recover: (plan: string) => Promise<string>) {
    const values: Record<string, unknown> = {};
    const storage = new Map<string, string>();
    const context: Record<string, unknown> = {
        pendingLicense: { plan: 'yearly', reference: 'PAID-REFERENCE' },
        licenseRecoveryInFlightRef: { current: false },
        window: { sessionStorage: { setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) } },
        issuePaidLicenseKey: issue,
        fetchPaidLicenseKey: recover,
    };
    for (const name of [
        'PendingLicense',
        'IsPendingLicenseOpen',
        'IsRecoveringLicense',
        'IsCheckoutLoading',
        'PaidLicensePlan',
        'PaidLicenseKey',
        'IsPaidLicenseCopied',
        'IsPaidLicenseModalOpen',
    ]) {
        context[`set${name}`] = (value: unknown) => {
            values[name] = value;
        };
    }
    return {
        values,
        storage,
        deliver: vm.runInNewContext(runnable, context) as (plan: string, response?: { razorpay_payment_id: string }) => Promise<void>,
    };
}

test('payment feedback and download panel appear immediately; a delayed issued key is still delivered', async () => {
    let finish!: (key: string) => void;
    let issues = 0;
    const fake = setup(
        () => {
            issues++;
            return new Promise(resolve => {
                finish = resolve;
            });
        },
        async () => assert.fail('Unexpected fallback')
    );
    const first = fake.deliver('yearly', { razorpay_payment_id: 'PAID-REFERENCE' });
    assert.equal(fake.values.IsPendingLicenseOpen, true);
    assert.equal(fake.values.IsCheckoutLoading, false);
    assert.equal(fake.values.IsRecoveringLicense, true);
    await fake.deliver('yearly', { razorpay_payment_id: 'PAID-REFERENCE' });
    assert.equal(issues, 1);
    finish('DEMO-ISSUED-KEY');
    await first;
    assert.equal(fake.values.PaidLicenseKey, 'DEMO-ISSUED-KEY');
    assert.equal(fake.values.PaidLicensePlan, 'yearly');
    assert.equal(fake.values.IsPaidLicenseModalOpen, true);
    assert.equal(fake.values.IsPendingLicenseOpen, false);
    assert.equal(fake.storage.size, 0);
});

test('issuer failure recovers the selected-plan key without starting another payment', async () => {
    const fake = setup(
        async () => {
            throw Error('Timeout');
        },
        async plan => {
            assert.equal(plan, 'monthly');
            return 'DEMO-RECOVERED';
        }
    );
    await fake.deliver('monthly', { razorpay_payment_id: 'PAID-REFERENCE' });
    assert.equal(fake.values.PaidLicenseKey, 'DEMO-RECOVERED');
});

test('failed recovery keeps the reference; retry/resume only reads the existing license', async () => {
    let issues = 0;
    let reads = 0;
    const fake = setup(
        async () => {
            issues++;
            throw Error('Offline');
        },
        async () => {
            reads++;
            if (reads === 1) throw Error('Not ready');
            return 'DEMO-LATE-KEY';
        }
    );
    await fake.deliver('yearly', { razorpay_payment_id: 'PAID-REFERENCE' });
    assert.equal(fake.values.IsRecoveringLicense, false);
    assert.equal(fake.values.IsPendingLicenseOpen, true);
    assert.match(fake.storage.get('hintio_pending_license')!, /PAID-REFERENCE/);
    assert.equal(fake.values.PaidLicenseKey, undefined);
    await fake.deliver('yearly');
    assert.equal(issues, 1);
    assert.equal(reads, 2);
    assert.equal(fake.values.PaidLicenseKey, 'DEMO-LATE-KEY');
    assert.equal(fake.storage.size, 0);
});

test('shorter checkout deadlines preserve the longer nonblocking key recovery window', () => {
    assert.equal(REQUEST_TIMEOUT_MS, 8000);
    assert.equal(CHECKOUT_TIMEOUT_MS, 15000);
    assert.equal(KEY_RECOVERY_TIMEOUT_MS, 30000);
});
