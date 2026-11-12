import test from 'node:test';
import assert from 'node:assert/strict';
import { billingTestUrl, checkoutMatchesEnvironment, createBillingTestFetch } from '../src/lib/billingTestRouting';
const base = 'https://vsybqtunyuanxspxhzue.supabase.co';
test('normal mode never changes a paid endpoint', () =>
    assert.equal(billingTestUrl(base + '/functions/v1/issue-paid-license', false, base), base + '/functions/v1/issue-paid-license'));
test('local sandbox routes checkout, fulfillment, recovery and billing to isolated handlers', () => {
    for (const name of ['create-razorpay-checkout', 'issue-paid-license', 'get-my-license', 'manage-billing'])
        assert.equal(billingTestUrl(base + '/functions/v1/' + name, true, base), base + '/functions/v1/test-' + name);
});
test('sandbox cannot change auth, trials, other projects or already-isolated handlers', () => {
    for (const url of [
        base + '/auth/v1/token',
        base + '/functions/v1/claim-trial-access',
        base + '/functions/v1/test-manage-billing',
        'https://other.example/functions/v1/issue-paid-license',
    ])
        assert.equal(billingTestUrl(url, true, base), url);
});
test('sandbox refuses live and malformed checkout keys', () => {
    assert(checkoutMatchesEnvironment('rzp_test_QA123', true));
    assert(!checkoutMatchesEnvironment('rzp_live_QA123', true));
    assert(!checkoutMatchesEnvironment(undefined, true));
});

test('sandbox rerouting preserves an authenticated Request body, headers and abort signal', async () => {
    const controller = new AbortController();
    const original = new Request(base + '/functions/v1/get-my-license', {
        method: 'POST',
        headers: { authorization: 'Bearer SYNTHETIC-QA', 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'monthly' }),
        signal: controller.signal,
    });
    let received: Request | undefined;
    const fetcher: typeof fetch = async input => {
        received = input as Request;
        return new Response('{}');
    };
    await createBillingTestFetch(fetcher, base)(original);
    assert.equal(received!.url, base + '/functions/v1/test-get-my-license');
    assert.equal(received!.method, 'POST');
    assert.equal(received!.headers.get('authorization'), 'Bearer SYNTHETIC-QA');
    assert.deepEqual(await received!.json(), { plan: 'monthly' });
    controller.abort();
    assert.equal(received!.signal.aborted, true);
});
test('auth Request objects pass through the sandbox adapter unchanged', async () => {
    const original = new Request(base + '/auth/v1/token', { method: 'POST', body: 'SYNTHETIC' });
    let received: unknown;
    const fetcher: typeof fetch = async input => {
        received = input;
        return new Response('{}');
    };
    await createBillingTestFetch(fetcher, base)(original);
    assert.equal(received, original);
});
