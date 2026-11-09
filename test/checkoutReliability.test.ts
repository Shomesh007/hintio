import test from 'node:test';
import assert from 'node:assert/strict';
import { abortable, withDeadline, continueAfterSignIn, createCheckoutScriptLoader, recoverLicenseKey } from '../src/lib/checkoutReliability';

test('a stalled request times out and aborts its underlying signal', async () => {
    let receivedSignal: AbortSignal | undefined;
    await assert.rejects(
        withDeadline(signal => {
            receivedSignal = signal;
            return new Promise(() => {});
        }, 10),
        /took too long/
    );
    assert.equal(receivedSignal?.aborted, true);
});

test('a completed request is not cancelled by a leftover deadline', async () => {
    let receivedSignal: AbortSignal | undefined;
    assert.equal(
        await withDeadline(async signal => {
            receivedSignal = signal;
            return 'ready';
        }, 10),
        'ready'
    );
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(receivedSignal?.aborted, false);
});

test('an aborted wait cannot continue when a late request resolves', async () => {
    const controller = new AbortController();
    let finish!: (value: string) => void;
    let continued = false;
    const operation = abortable(
        new Promise<string>(resolve => {
            finish = resolve;
        }),
        controller.signal
    ).then(() => {
        continued = true;
    });
    controller.abort(new Error('cancelled'));
    await assert.rejects(operation, /cancelled/);
    finish('late');
    await Promise.resolve();
    assert.equal(continued, false);
});

test('successful sign-in cancels the false timeout and runs continuation after the callback', async () => {
    let notify!: (session: string) => void;
    const events: string[] = [];
    const stop = continueAfterSignIn<string>({
        subscribe: callback => {
            notify = callback;
            return () => events.push('unsubscribe');
        },
        onSuccess: session => events.push(session),
        onTimeout: () => events.push('timeout'),
        timeoutMs: 10,
    });
    notify('signed-in');
    notify('duplicate');
    assert.deepEqual(events, ['unsubscribe']);
    await new Promise(resolve => setTimeout(resolve, 25));
    assert.deepEqual(events, ['unsubscribe', 'signed-in']);
    stop();
});

test('unmount cancels both the auth continuation and error timeout', async () => {
    let notify!: (session: string) => void;
    let called = false;
    const stop = continueAfterSignIn<string>({
        subscribe: callback => {
            notify = callback;
            return () => {};
        },
        onSuccess: () => {
            called = true;
        },
        onTimeout: () => {
            called = true;
        },
        timeoutMs: 10,
    });
    notify('session');
    stop();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(called, false);
});

test('missing sign-in produces one timeout and unsubscribes', async () => {
    let timeouts = 0;
    let unsubscribed = 0;
    continueAfterSignIn<string>({
        subscribe: () => () => {
            unsubscribed++;
        },
        onSuccess: () => assert.fail('unexpected session'),
        onTimeout: () => {
            timeouts++;
        },
        timeoutMs: 5,
    });
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(timeouts, 1);
    assert.equal(unsubscribed, 1);
});

function scriptEnvironment() {
    let ready = false;
    let appended = 0;
    let removed = 0;
    const listeners = new Map<string, () => void>();
    return {
        environment: {
            isReady: () => ready,
            create: () => ({
                src: '',
                async: false,
                addEventListener: (name: string, cb: () => void) => {
                    listeners.set(name, cb);
                },
                removeEventListener: (name: string) => {
                    listeners.delete(name);
                },
                remove: () => {
                    removed++;
                },
            }),
            append: () => {
                appended++;
            },
        },
        loaded: () => {
            ready = true;
            listeners.get('load')?.();
        },
        state: () => ({ appended, removed }),
    };
}

test('concurrent script requests share one load and successful loads are reused', async () => {
    const fake = scriptEnvironment();
    const load = createCheckoutScriptLoader(fake.environment, 100);
    const first = load();
    const second = load();
    assert.equal(first, second);
    assert.equal(fake.state().appended, 1);
    fake.loaded();
    assert.equal(await first, true);
    assert.equal(await load(), true);
    assert.equal(fake.state().appended, 1);
});

test('a stalled script is removed and can be retried', async () => {
    const fake = scriptEnvironment();
    const load = createCheckoutScriptLoader(fake.environment, 5);
    assert.equal(await load(), false);
    assert.deepEqual(fake.state(), { appended: 1, removed: 1 });
    const retry = load();
    fake.loaded();
    assert.equal(await retry, true);
});

test('license recovery retries the authenticated endpoint with the unchanged selected plan', async () => {
    const plans: string[] = [];
    const key = await recoverLicenseKey(
        'yearly',
        async (plan, signal) => {
            plans.push(plan);
            assert.equal(signal.aborted, false);
            return plans.length === 1
                ? { data: null, error: { context: { status: 404 } } }
                : { data: { licenseKey: 'DEMO-KEY', plan: 'yearly' }, error: null };
        },
        { intervalMs: 1, timeoutMs: 100 }
    );
    assert.equal(key, 'DEMO-KEY');
    assert.deepEqual(plans, ['yearly', 'yearly']);
});

test('recovery rejects a different plan and does not wait after the last attempt', async () => {
    await assert.rejects(
        recoverLicenseKey('monthly', async () => ({ data: { licenseKey: 'WRONG', plan: 'yearly' }, error: null }), {
            attempts: 1,
            intervalMs: 1000,
            timeoutMs: 100,
        }),
        /do not pay again/
    );
});

test('stalled key recovery times out with a paid-customer-safe message', async () => {
    await assert.rejects(
        recoverLicenseKey('monthly', () => new Promise(() => {}), { timeoutMs: 5 }),
        /payment completed.*do not pay again/i
    );
});
