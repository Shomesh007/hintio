import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { recoverLicenseKeyAutomatically } from '../src/lib/checkoutReliability';

async function advance(t: TestContext, milliseconds: number) {
    for (let elapsed = 0; elapsed < milliseconds; elapsed += 1000) {
        t.mock.timers.tick(Math.min(1000, milliseconds - elapsed));
        for (let microtask = 0; microtask < 30; microtask++) await Promise.resolve();
    }
}

test('automatically delivers a five-minute delayed key, retries offline errors, and stops after delivery', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    const controller = new AbortController();
    const checks: number[] = [];
    const recovery = recoverLicenseKeyAutomatically(
        'yearly',
        async plan => {
            assert.equal(plan, 'yearly');
            checks.push(Date.now());
            if (Date.now() < 20_000) throw Error('Offline');
            return Date.now() >= 300_000
                ? { data: { licenseKey: 'DEMO-FIVE-MINUTE-KEY', plan }, error: null }
                : { data: null, error: { status: 404 } };
        },
        controller.signal
    );
    await advance(t, 299_000);
    assert.equal(controller.signal.aborted, false);
    await advance(t, 31_000);
    assert.equal(await recovery, 'DEMO-FIVE-MINUTE-KEY');
    assert.ok(checks.length < 30, 'Long delays must back off instead of hammering the endpoint');
    const count = checks.length;
    await advance(t, 120_000);
    assert.equal(checks.length, count);
});

test('a stalled thirty-second lookup aborts before the next request and recovery continues', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    let calls = 0;
    let stalledSignal: AbortSignal | undefined;
    const controller = new AbortController();
    const recovery = recoverLicenseKeyAutomatically(
        'monthly',
        async (plan, signal) => {
            calls++;
            if (calls === 1) {
                stalledSignal = signal;
                return new Promise(() => {});
            }
            assert.equal(stalledSignal?.aborted, true);
            return { data: { licenseKey: 'DEMO-AFTER-TIMEOUT', plan }, error: null };
        },
        controller.signal
    );
    await advance(t, 8000);
    assert.equal(stalledSignal?.aborted, false);
    await advance(t, 22000);
    assert.equal(stalledSignal?.aborted, true);
    assert.equal(calls, 1);
    await advance(t, 3000);
    assert.equal(await recovery, 'DEMO-AFTER-TIMEOUT');
    assert.equal(calls, 2);
});

test('wrong-plan keys are ignored and aborting the retry delay prevents more requests', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    let calls = 0;
    const controller = new AbortController();
    const recovery = recoverLicenseKeyAutomatically(
        'monthly',
        async () => {
            calls++;
            return { data: { licenseKey: 'WRONG-PLAN', plan: 'yearly' }, error: null };
        },
        controller.signal
    );
    const rejected = assert.rejects(recovery, /abort/i);
    await advance(t, 1000);
    controller.abort();
    await rejected;
    await advance(t, 120_000);
    assert.equal(calls, 1);
});

test('unmount aborts the active lookup immediately and cannot deliver a late result', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    let finish!: (value: { data: { licenseKey: string; plan: string }; error: null }) => void;
    const recovery = recoverLicenseKeyAutomatically(
        'monthly',
        (_plan, signal) => {
            requestSignal = signal;
            return new Promise(resolve => {
                finish = resolve;
            });
        },
        controller.signal
    );
    const rejected = assert.rejects(recovery, /abort/i);
    controller.abort();
    await rejected;
    assert.equal(requestSignal?.aborted, true);
    finish({ data: { licenseKey: 'LATE-RESULT', plan: 'monthly' }, error: null });
    await advance(t, 60_000);
});

test('a valid twelve-second reconciliation delivers its key without being repeatedly aborted', async t => {
    t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
    let calls = 0;
    let lookupSignal: AbortSignal | undefined;
    const controller = new AbortController();
    const result = recoverLicenseKeyAutomatically(
        'monthly',
        (plan, signal) => {
            calls++;
            lookupSignal = signal;
            return new Promise(resolve => setTimeout(() => resolve({ data: { licenseKey: 'DEMO-SLOW-VERIFIED-KEY', plan }, error: null }), 12000));
        },
        controller.signal
    );
    await advance(t, 9000);
    assert.equal(lookupSignal?.aborted, false);
    assert.equal(calls, 1);
    await advance(t, 4000);
    assert.equal(await result, 'DEMO-SLOW-VERIFIED-KEY');
    assert.equal(calls, 1);
});
