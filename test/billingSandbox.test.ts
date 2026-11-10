import test from 'node:test';
import assert from 'node:assert/strict';
import { sandboxAdmin, sandboxEnv, createSandboxBillingService } from '../supabase/functions/_shared/billingSandbox.ts';

test('sandbox never falls back to production credentials', () => {
    const env = sandboxEnv(n => ({ RAZORPAY_KEY_ID: 'rzp_live_example', RAZORPAY_KEY_SECRET: 'live-secret',
        RAZORPAY_WEBHOOK_SECRET: 'live-webhook', SUPABASE_SERVICE_ROLE_KEY: 'admin-secret' })[n]);
    for (const key of ['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET','SUPABASE_SERVICE_ROLE_KEY'])
        assert.equal(env(key), undefined);
});
test('sandbox rejects live keys even when saved under a test secret name', () => {
    assert.throws(() => sandboxEnv(() => 'rzp_live_example')('RAZORPAY_KEY_ID'), /Test-mode credentials/);
});
test('sandbox routes every allowed table and rejects unmapped names', () => {
    const calls: string[] = [];
    const admin = sandboxAdmin({ from: (n: string) => calls.push(n) });
    admin.from('licenses'); admin.from('access_tokens'); admin.from('billing_webhook_events');
    assert.deepEqual(calls, ['billing_test_licenses','billing_test_access_tokens','billing_test_webhook_events']);
    for (const table of ['provider_secrets','auth.users','__proto__','billing_test_licenses'])
        assert.throws(() => admin.from(table), /not allowed/);
});
test('sandbox RPCs cannot invoke production fulfillment and use a separate rate namespace', async () => {
    const calls: any[] = [];
    const admin = sandboxAdmin({rpc: (n: string,a: any) => { calls.push([n,a]); return Promise.resolve({data:true}); }});
    await admin.rpc('record_billing_payment',{p:{}});
    await admin.rpc('record_billing_refund',{p_payment_id:'pay_test',p_amount_refunded:1});
    await admin.rpc('enforce_access_token_rate_limit',{p_identifier:'billing:user:test',p_max_attempts:30});
    assert.equal(calls[0][0], 'test_record_billing_payment');
    assert.equal(calls[1][0], 'test_record_billing_refund');
    assert.equal(calls[2][1].p_identifier,'sandbox:billing:user:test');
    assert.throws(() => admin.rpc('resolve_access_token',{}), /not allowed/);
});
test('sandbox checkout with live key is rejected before any Razorpay network request', async () => {
    let fetched = false;
    const service = createSandboxBillingService({
        auth: {getUser: async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'qa@example.test'}}})},
        rpc: async()=>({data:true}),
        from:()=>{throw new Error('Unexpected database operation');},
    }, n => ({RAZORPAY_TEST_KEY_ID:'rzp_live_bad',RAZORPAY_TEST_KEY_SECRET:'secret'})[n],
    async()=>{fetched=true; throw new Error('Network must not run');});
    const response = await service.checkout(new Request('https://example.test/test-create-razorpay-checkout',{
        method:'POST',headers:{authorization:'Bearer valid','content-type':'application/json'},body:JSON.stringify({plan:'yearly'})}));
    assert.equal(response.status,503);
    assert.equal(fetched,false);
});
