import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { abortable, withDeadline } from '../src/lib/checkoutReliability';

// Run the real checkout controller with fake sessions, requests and Razorpay objects.
// No authentication, network requests, orders or payments are performed.
const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const app = parsed.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'App') as ts.FunctionDeclaration;
const declaration = app
    .body!.statements.filter(ts.isVariableStatement)
    .flatMap(node => [...node.declarationList.declarations])
    .find(node => ts.isIdentifier(node.name) && node.name.text === 'startRazorpayCheckout')!;
const runnable = ts.transpileModule(`const checkout = ${declaration.initializer!.getText(parsed)}; checkout;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(options: { stalledSession?: boolean; stalledScript?: boolean; delayedRequest?: boolean; pendingLicense?: boolean } = {}) {
    const loading: boolean[] = [];
    const plans: string[] = [];
    const deliveries: unknown[][] = [];
    let pendingOpen = false;
    let opened = 0;
    let support = false;
    let finishRequest: (() => void) | undefined;
    let checkoutOptions: Record<string, unknown> = {};
    const lock = { current: false };
    const payload = { data: { keyId: 'DEMO-KEY', orderId: 'DEMO-ORDER', amount: 12345, currency: 'INR', mode: 'order' }, error: null };
    const context = {
        billingTestMode: false,
        checkoutInFlightRef: lock,
        pendingLicense: options.pendingLicense ? { plan: 'monthly', reference: 'DEMO-PAID' } : null,
        setIsPendingLicenseOpen: (value: boolean) => {
            pendingOpen = value;
        },
        handleRecoverLicense: async () => {
            pendingOpen = true;
        },
        deliverPaidLicense: async (...args: unknown[]) => {
            deliveries.push(args);
        },
        setIsCheckoutLoading: (value: boolean) => loading.push(value),
        setIsPaymentModalOpen: (value: boolean) => {
            support = value;
        },
        setAuthError: () => {},
        setIsAuthModalOpen: () => {},
        setAuthIntent: () => {},
        debugLog: () => {},
        missingSupabaseEnvVars: [],
        supabase: {
            auth: {
                getSession: () =>
                    options.stalledSession
                        ? new Promise(() => {})
                        : Promise.resolve({ data: { session: { access_token: 'demo-token' } }, error: null }),
            },
            functions: {
                invoke: (_name: string, args: { body: { plan: string } }) => {
                    plans.push(args.body.plan);
                    return options.delayedRequest
                        ? new Promise(resolve => {
                              finishRequest = () => resolve(payload);
                          })
                        : Promise.resolve(payload);
                },
            },
        },
        window: {
            location: { href: 'https://example.test/access' },
            atob: () => {
                throw new Error('Not a JWT');
            },
            Razorpay: class {
                constructor(value: Record<string, unknown>) {
                    checkoutOptions = value;
                }
                open() {
                    opened++;
                }
            },
        },
        loadRazorpayScript: () => (options.stalledScript ? new Promise(() => {}) : Promise.resolve(true)),
        abortable,
        withDeadline: <T>(operation: (signal: AbortSignal) => PromiseLike<T>) => withDeadline(operation, 15),
        CHECKOUT_TIMEOUT_MS: 15,
        REQUEST_TIMEOUT_MS: 15,
        setTimeout,
        clearTimeout,
        fetch: () => {
            throw new Error('Unexpected real fetch');
        },
    };
    const checkout = vm.runInNewContext(runnable, context) as (plan: 'monthly' | 'yearly') => Promise<void>;
    return {
        checkout,
        loading,
        plans,
        deliveries,
        get pendingOpen() {
            return pendingOpen;
        },
        lock,
        get opened() {
            return opened;
        },
        get support() {
            return support;
        },
        get checkoutOptions() {
            return checkoutOptions;
        },
        finish: () => finishRequest?.(),
    };
}

test('payment success forwards the unchanged plan and payment proof to key delivery', async () => {
    const fake = setup();
    await fake.checkout('yearly');
    const proof = { razorpay_payment_id: 'DEMO-PAID', razorpay_signature: 'DEMO-SIGNATURE' };
    await (fake.checkoutOptions.handler as (proof: object) => Promise<void>)(proof);
    assert.deepEqual(fake.deliveries, [['yearly', proof]]);
});

test('a pending paid key reopens recovery instead of creating another payment', async () => {
    const fake = setup({ pendingLicense: true });
    await fake.checkout('monthly');
    assert.equal(fake.pendingOpen, true);
    assert.equal(fake.opened, 0);
    assert.deepEqual(fake.plans, []);
});

for (const stalled of ['stalledSession', 'stalledScript'] as const) {
    test(`${stalled} clears the spinner and checkout lock instead of hanging`, async () => {
        const fake = setup({ [stalled]: true });
        await fake.checkout('monthly');
        assert.equal(fake.loading.at(-1), false);
        assert.equal(fake.lock.current, false);
        assert.equal(fake.support, true);
        assert.equal(fake.opened, 0);
    });
}

for (const plan of ['monthly', 'yearly'] as const) {
    test(`${plan} preserves its plan, server amount and currency, and ignores duplicate clicks`, async () => {
        const fake = setup();
        await Promise.all([fake.checkout(plan), fake.checkout(plan)]);
        assert.deepEqual(fake.plans, [plan]);
        assert.equal(fake.opened, 1);
        assert.equal(fake.checkoutOptions.amount, 12345);
        assert.equal(fake.checkoutOptions.currency, 'INR');
        assert.equal(fake.checkoutOptions.order_id, 'DEMO-ORDER');
        assert.equal(fake.loading.at(-1), false);
        assert.equal(fake.lock.current, false);
    });
}

test('a late checkout response cannot open Razorpay after the timeout', async () => {
    const fake = setup({ delayedRequest: true });
    await fake.checkout('monthly');
    fake.finish();
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(fake.opened, 0);
    assert.equal(fake.loading.at(-1), false);
    assert.equal(fake.lock.current, false);
});
