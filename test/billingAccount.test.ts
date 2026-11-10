import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBillingSignIn, completeBillingReturn } from '../src/lib/billingAccount';
test('billing sign-in clears an abandoned checkout and returns through the allowed root URL', () => {
    const removed: string[] = [],
        saved: Record<string, string> = {};
    assert.equal(
        prepareBillingSignIn(
            {
                setItem: (k, v) => {
                    saved[k] = v;
                },
            },
            {
                removeItem: k => {
                    removed.push(k);
                },
            },
            'https://www.hintio.tech'
        ),
        'https://www.hintio.tech/'
    );
    assert.deepEqual(removed, ['hintio_auth_intent']);
    assert.deepEqual(saved, { hintio_billing_return: '1' });
});
test('blocked storage stops billing sign-in rather than resuming a purchase intent', () => {
    let marked = false;
    assert.throws(
        () =>
            prepareBillingSignIn(
                {
                    setItem: () => {
                        marked = true;
                    },
                },
                {
                    removeItem: () => {
                        throw Error('blocked');
                    },
                },
                'https://www.hintio.tech'
            ),
        /blocked/
    );
    assert.equal(marked, false);
});

test('billing return waits for OAuth session parsing before replacing the callback URL', async () => {
    let ready!: () => void,
        removed = false,
        navigated = false;
    const pending = completeBillingReturn(
        {
            getItem: () => '1',
            removeItem: () => {
                removed = true;
            },
        },
        () =>
            new Promise<void>(r => {
                ready = r;
            }),
        () => {
            navigated = true;
        }
    );
    assert.equal(navigated, false);
    assert.equal(removed, false);
    ready();
    await pending;
    assert.equal(navigated, true);
    assert.equal(removed, true);
});
test('ordinary navigation does not initialize billing auth and failed auth remains retryable', async () => {
    let called = false;
    await completeBillingReturn(
        { getItem: () => null, removeItem() {} },
        async () => {
            called = true;
        },
        () => {
            called = true;
        }
    );
    assert.equal(called, false);
    let completed = false;
    await assert.rejects(
        completeBillingReturn(
            { getItem: () => '1', removeItem() {} },
            async () => {
                throw Error('sign-in failed');
            },
            () => {
                completed = true;
            }
        ),
        /sign-in failed/
    );
    assert.equal(completed, true);
});
