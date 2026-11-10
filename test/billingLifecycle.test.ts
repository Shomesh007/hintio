import test from 'node:test';
import assert from 'node:assert/strict';
import { createBillingService, hmac, TERMS } from '../supabase/functions/_shared/billing.ts';
const owner = '11111111-1111-4111-8111-111111111111',
    other = '22222222-2222-4222-8222-222222222222';
const start = Date.UTC(2026, 10, 10) / 1000,
    now = () => start * 1000 + 3600000;
function setup(o: any = {}) {
    const calls: any[] = [],
        rows: Record<string, any[]> = { licenses: o.licenses || [], billing_webhook_events: [] };
    const notes = { user_id: owner, plan_type: o.plan || 'yearly', source: 'hintio_website', terms_version: TERMS.version, ...o.notes };
    const payment = {
        id: 'pay_example',
        status: 'captured',
        amount: o.plan === 'monthly' ? TERMS.monthlyAmount : TERMS.yearlyAmount,
        currency: 'INR',
        order_id: 'order_example',
        created_at: start,
        email: 'owner@example.test',
        ...o.payment,
    };
    const sub = {
        id: 'sub_example',
        plan_id: 'plan_verified',
        quantity: 1,
        status: 'active',
        current_start: start,
        current_end: start + 30 * 86400,
        notes: { ...notes, plan_type: 'monthly' },
        ...o.sub,
    };
    const invoice = {
        id: 'inv_example',
        subscription_id: 'sub_example',
        payment_id: 'pay_example',
        status: 'paid',
        amount_due: 0,
        amount_paid: TERMS.monthlyAmount,
        paid_at: start,
        billing_start: start,
        billing_end: start + 30 * 86400,
        ...o.invoice,
    };
    const order = { id: 'order_example', amount: payment.amount, currency: 'INR', notes, ...o.order };
    const env = (n: string) =>
        ({
            RAZORPAY_KEY_ID: 'rzp_test_fake',
            RAZORPAY_KEY_SECRET: 'test-secret',
            RAZORPAY_WEBHOOK_SECRET: 'webhook-secret',
            RAZORPAY_MONTHLY_PLAN_ID: 'plan_verified',
            RAZORPAY_YEARLY_AMOUNT_PAISE: '9900',
        })[n];
    const admin: any = {
        auth: {
            getUser: async (j: string) => (j === 'valid' ? { data: { user: { id: owner, email: 'owner@example.test' } } } : { error: true }),
            admin: { getUserById: async (id: string) => ({ data: { user: { id, email: 'owner@example.test' } } }) },
        },
        rpc: async (name: string, args: any) => {
            calls.push({ rpc: name, args });
            return {
                data:
                    name === 'enforce_access_token_rate_limit'
                        ? o.rateAllowed !== false
                        : {
                              licenseKey: 'SKI-SYNTHETICKEY',
                              licenseId: 'license_example',
                              plan: notes.plan_type,
                              validUntil: new Date((start + 365 * 86400) * 1000).toISOString(),
                          },
            };
        },
        from(table: string) {
            let action = 'select',
                payload: any;
            const filters: Array<(x: any) => boolean> = [];
            const q: any = {
                select() {
                    return q;
                },
                update(p: any) {
                    action = 'update';
                    payload = p;
                    return q;
                },
                insert(p: any) {
                    action = 'insert';
                    payload = p;
                    return q;
                },
                eq(k: string, v: any) {
                    filters.push(x => x[k] === v);
                    return q;
                },
                gt(k: string, v: any) {
                    filters.push(x => x[k] > v);
                    return q;
                },
                not(k: string, _op: string, v: any) {
                    filters.push(x => x[k] !== v);
                    return q;
                },
                order() {
                    return q;
                },
                limit() {
                    return q;
                },
                maybeSingle() {
                    return q.then((r: any) => ({ ...r, data: r.data[0] || null }));
                },
                then(resolve: any, reject: any) {
                    try {
                        const selected = (rows[table] || []).filter(x => filters.every(f => f(x)));
                        if (action === 'update') {
                            selected.forEach(x => Object.assign(x, payload));
                            calls.push({ update: table, payload });
                        }
                        if (action === 'insert') {
                            (rows[table] ||= []).push(payload);
                            calls.push({ insert: table, payload });
                        }
                        return Promise.resolve({ data: selected }).then(resolve, reject);
                    } catch (e) {
                        return Promise.reject(e).then(resolve, reject);
                    }
                },
            };
            return q;
        },
    };
    const fetcher: any = async (url: string, init: any) => {
        const route = url.split('/v1/')[1],
            body = init.body ? JSON.parse(init.body) : undefined;
        calls.push({ route, method: init.method, body });
        if (o.down) throw Error('private transport details');
        let d: any;
        if (route === 'payments/pay_example') d = payment;
        else if (route === 'orders/order_example') d = order;
        else if (route === 'invoices/inv_example') d = invoice;
        else if (route === 'subscriptions/sub_example' || route === 'subscriptions/sub_example/cancel') d = sub;
        else if (route.startsWith('invoices?') || route.startsWith('payments?')) d = { items: [] };
        else if (route === 'plans/plan_verified')
            d = { item: { amount: TERMS.monthlyAmount, currency: 'INR' }, period: 'monthly', interval: 1, ...o.remotePlan };
        else if (route === 'subscriptions') d = { id: 'sub_created' };
        else if (route === 'orders') d = { id: 'order_created', amount: body.amount, currency: body.currency };
        else return new Response('{}', { status: 404 });
        return new Response(JSON.stringify(d));
    };
    const service = createBillingService({ admin, env, fetcher, now });
    const req = (b: any, token = 'valid') =>
        new Request('https://example.test/billing', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
            body: JSON.stringify(b),
        });
    const issue = async (b: any = {}) =>
        service.issue(
            req({
                plan: notes.plan_type,
                paymentId: 'pay_example',
                orderId: 'order_example',
                signature: await hmac('test-secret', 'order_example|pay_example'),
                ...b,
            })
        );
    const webhook = async (event: any, id = 'evt_example') => {
        const raw = JSON.stringify(event);
        return service.webhook(
            new Request('https://example.test/webhook', {
                method: 'POST',
                headers: { 'x-razorpay-signature': await hmac('webhook-secret', raw), 'x-razorpay-event-id': id },
                body: raw,
            })
        );
    };
    return { service, calls, rows, req, issue, webhook };
}
test('public pricing is INR 2049/month and 14000/year with no order side effects', async () => {
    const s = setup();
    const d = await (await s.service.checkout(new Request('https://example.test/pricing'))).json();
    assert.equal(d.monthlyAmount, 204900);
    assert.equal(d.yearlyAmount, 1400000);
    assert.equal(d.yearlyMode, 'order');
    assert.equal(s.calls.length, 0);
});
test('yearly order ignores stale legacy environment pricing', async () => {
    const s = setup();
    const r = await s.service.checkout(s.req({ plan: 'yearly' }));
    assert.equal(r.status, 200);
    assert.equal(s.calls.find(x => x.route === 'orders').body.amount, 1400000);
    assert.match((await r.json()).terms.yearlyRenewal, /365 days/);
});
test('monthly checks real plan before creating recurring subscription', async () => {
    const s = setup();
    assert.equal((await s.service.checkout(s.req({ plan: 'monthly' }))).status, 200);
    assert.equal(s.calls.find(x => x.route === 'subscriptions').body.total_count, 120);
    assert.equal(
        s.calls.some(x => x.route === 'orders'),
        false
    );
});
test('mismatched monthly plan cannot create checkout', async () => {
    const s = setup({ remotePlan: { item: { amount: 205000, currency: 'INR' } } });
    assert.equal((await s.service.checkout(s.req({ plan: 'monthly' }))).status, 503);
    assert.equal(
        s.calls.some(x => x.route === 'subscriptions'),
        false
    );
});
test('authentication and rate limits run before provider requests', async () => {
    const s = setup();
    assert.equal((await s.service.checkout(s.req({ plan: 'yearly' }, 'invalid'))).status, 401);
    assert.equal(s.calls.length, 0);
    const t = setup({ rateAllowed: false });
    assert.equal((await t.service.checkout(t.req({ plan: 'yearly' }))).status, 429);
    assert.equal(
        t.calls.some(x => x.route),
        false
    );
});
test('captured purchase is verified before atomic grant', async () => {
    const s = setup();
    assert.equal((await s.issue()).status, 200);
    assert.equal(s.calls.find(x => x.rpc === 'record_billing_payment').args.p.user_id, owner);
});
test('authorization or failed payment never grants paid access', async () => {
    for (const status of ['authorized', 'created', 'failed']) {
        const s = setup({ payment: { status } });
        assert.equal((await s.issue()).status, 202);
        assert.equal(
            s.calls.some(x => x.rpc === 'record_billing_payment'),
            false
        );
    }
});
test('bad checkout signature fails before provider calls', async () => {
    const s = setup();
    assert.equal((await s.issue({ signature: '0'.repeat(64) })).status, 403);
    assert.equal(
        s.calls.some(x => x.route),
        false
    );
});
test('cross-account payment replay cannot grant access', async () => {
    const s = setup({ notes: { user_id: other } });
    assert.equal((await s.issue()).status, 403);
    assert.equal(
        s.calls.some(x => x.rpc === 'record_billing_payment'),
        false
    );
});
test('wrong amount or currency in new purchase is rejected', async () => {
    for (const payment of [{ amount: 1005000 }, { currency: 'USD' }]) {
        const s = setup({ payment });
        assert.ok([400, 409].includes((await s.issue()).status));
        assert.equal(
            s.calls.some(x => x.rpc === 'record_billing_payment'),
            false
        );
    }
});
test('verified old checkout amounts remain recoverable', async () => {
    const s = setup({ notes: { terms_version: undefined }, payment: { amount: 1005000 } });
    assert.equal((await s.issue()).status, 200);
});
test('monthly invoice proves owner and billing dates', async () => {
    const s = setup({ plan: 'monthly', payment: { invoice_id: 'inv_example' } });
    const d = await s.service.verifiedPayment('pay_example', owner, { subscriptionId: 'sub_example' });
    assert.equal(Date.parse(d.period_end) - Date.parse(d.period_start), 30 * 86400000);
});
test('small mandate amount is not a full monthly charge', async () => {
    const s = setup({ plan: 'monthly', payment: { invoice_id: 'inv_example', amount: 100 } });
    await assert.rejects(s.service.verifiedPayment('pay_example', owner), /amount/);
});
test('unpaid invoice and foreign subscription are rejected', async () => {
    const s = setup({ plan: 'monthly', payment: { invoice_id: 'inv_example' }, invoice: { status: 'issued' } });
    await assert.rejects(s.service.verifiedPayment('pay_example', owner), /fully paid/);
    const t = setup({ plan: 'monthly', payment: { invoice_id: 'inv_example' } });
    await assert.rejects(t.service.verifiedPayment('pay_example', owner, { subscriptionId: 'sub_other' }), /mismatch/);
});
test('signed captured webhook receipt is idempotent', async () => {
    const s = setup();
    const e = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_example' } } } };
    assert.equal((await s.webhook(e)).status, 200);
    assert.equal((await s.webhook(e)).status, 200);
    assert.equal(s.calls.filter(x => x.rpc === 'record_billing_payment').length, 1);
});
test('invalid webhook cannot mutate access', async () => {
    const s = setup();
    const r = await s.service.webhook(
        new Request('https://example.test/webhook', { method: 'POST', headers: { 'x-razorpay-signature': '0'.repeat(64) }, body: '{}' })
    );
    assert.equal(r.status, 403);
    assert.equal(s.calls.length, 0);
});
test('activation without captured invoice never grants access', async () => {
    const s = setup();
    await s.webhook({ event: 'subscription.activated', payload: { subscription: { entity: { id: 'sub_example' } } } });
    assert.equal(
        s.calls.some(x => x.rpc === 'record_billing_payment'),
        false
    );
});
test('stale subscription event uses current provider state and retains paid expiry', async () => {
    const l: any = { id: 'license_example', user_id: owner, razorpay_subscription_id: 'sub_example', valid_until: '2026-12-10T00:00:00Z' };
    const s = setup({ licenses: [l], sub: { status: 'cancelled' } });
    await s.webhook({ event: 'subscription.pending', payload: { subscription: { entity: { id: 'sub_example', status: 'pending' } } } });
    assert.equal(l.billing_status, 'cancelled');
    assert.equal(l.valid_until, '2026-12-10T00:00:00Z');
});
test('cancel requires confirmation and purchase ownership', async () => {
    const s = setup({ licenses: [{ id: 'license_example', user_id: owner, razorpay_subscription_id: 'sub_example' }] });
    assert.equal((await s.service.manage(s.req({ action: 'cancel', licenseId: 'license_example' }))).status, 400);
    assert.equal((await s.service.manage(s.req({ action: 'cancel', licenseId: 'foreign', confirm: true }))).status, 404);
    assert.equal(
        s.calls.some(x => x.route?.endsWith('/cancel')),
        false
    );
});
test('cancellation is end-of-cycle and repeatable without changing expiry', async () => {
    const s = setup({
        licenses: [
            {
                id: 'license_example',
                user_id: owner,
                razorpay_subscription_id: 'sub_example',
                access_token_id: 'token_example',
                valid_until: '2026-12-10T00:00:00Z',
            },
        ],
    });
    for (let i = 0; i < 2; i++)
        assert.equal((await s.service.manage(s.req({ action: 'cancel', licenseId: 'license_example', confirm: true }))).status, 200);
    const c = s.calls.filter(x => x.route?.endsWith('/cancel'));
    assert.equal(c.length, 1);
    assert.deepEqual(c[0].body, { cancel_at_cycle_end: true });
    assert.equal(s.rows.licenses[0].valid_until, '2026-12-10T00:00:00Z');
});
test('refund uses actual provider cumulative total rather than event amount', async () => {
    const s = setup({ payment: { amount_refunded: 1400000, status: 'refunded' } });
    await s.webhook({ event: 'refund.processed', payload: { refund: { entity: { payment_id: 'pay_example', amount: 1 } } } });
    assert.equal(s.calls.find(x => x.rpc === 'record_billing_refund').args.p_amount_refunded, 1400000);
});
test('provider failures never expose internal details or credentials', async () => {
    const s = setup({ down: true });
    const r = await s.issue();
    assert.equal(r.status, 500);
    assert.doesNotMatch(await r.text(), /test-secret|private transport/);
});

test('an already-paid recurring monthly account cannot open another monthly checkout', async () => {
    const s = setup({
        licenses: [
            {
                id: 'existing',
                user_id: owner,
                plan: 'monthly',
                razorpay_subscription_id: 'sub_existing',
                cancel_at_period_end: false,
                valid_until: '2027-01-01T00:00:00Z',
            },
        ],
    });
    assert.equal((await s.service.checkout(s.req({ plan: 'monthly' }))).status, 409);
    assert.equal(
        s.calls.some(x => x.route),
        false
    );
});
test('authenticated payment-reference repair still rejects a different owner', async () => {
    const s = setup({ notes: { user_id: other } });
    assert.equal((await s.service.manage(s.req({ action: 'recover', paymentId: 'pay_example' }))).status, 403);
    assert.equal(
        s.calls.some(x => x.rpc === 'record_billing_payment'),
        false
    );
});
test('malformed JSON and oversized bodies fail without entitlement writes', async () => {
    const s = setup();
    const r = await s.service.checkout(
        new Request('https://example.test/billing', { method: 'POST', headers: { authorization: 'Bearer valid' }, body: '{' })
    );
    assert.equal(r.status, 400);
    const t = await s.service.checkout(
        new Request('https://example.test/billing', { method: 'POST', headers: { authorization: 'Bearer valid' }, body: 'x'.repeat(32769) })
    );
    assert.equal(t.status, 413);
});
test('a captured webhook retries while its invoice is not fully settled', async () => {
    const s = setup({ plan: 'monthly', payment: { invoice_id: 'inv_example' }, invoice: { status: 'issued' } });
    assert.equal((await s.webhook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_example' } } } })).status, 503);
    assert.equal(s.rows.billing_webhook_events.length, 0);
});
