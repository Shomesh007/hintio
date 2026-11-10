import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareBillingSignIn } from '../src/lib/billingAccount';
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
