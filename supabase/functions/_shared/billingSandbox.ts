import { createBillingService, BillingError } from './billing.ts';

// Only this adapter may connect the shared billing implementation to sandbox storage.
const tables: Record<string, string> = {
    licenses: 'billing_test_licenses',
    access_tokens: 'billing_test_access_tokens',
    billing_webhook_events: 'billing_test_webhook_events',
};
const procedures: Record<string, string> = {
    record_billing_payment: 'test_record_billing_payment',
    record_billing_refund: 'test_record_billing_refund',
};
export function sandboxAdmin(admin: any) {
    return {
        auth: admin.auth,
        from(name: string) {
            if (!Object.hasOwn(tables, name)) throw new Error('Sandbox table is not allowed');
            return admin.from(tables[name]);
        },
        rpc(name: string, args: any) {
            if (name === 'enforce_access_token_rate_limit') {
                return admin.rpc(name, { ...args, p_identifier: 'sandbox:' + args.p_identifier });
            }
            if (!Object.hasOwn(procedures, name)) throw new Error('Sandbox procedure is not allowed');
            return admin.rpc(procedures[name], args);
        },
    };
}
export function sandboxEnv(env: (name: string) => string | undefined) {
    const names: Record<string, string> = {
        RAZORPAY_KEY_ID: 'RAZORPAY_TEST_KEY_ID',
        RAZORPAY_KEY_SECRET: 'RAZORPAY_TEST_KEY_SECRET',
        RAZORPAY_MONTHLY_PLAN_ID: 'RAZORPAY_TEST_MONTHLY_PLAN_ID',
        RAZORPAY_WEBHOOK_SECRET: 'RAZORPAY_TEST_WEBHOOK_SECRET',
    };
    return (name: string) => {
        if (!Object.hasOwn(names, name)) return undefined;
        const value = env(names[name]);
        if (name === 'RAZORPAY_KEY_ID' && value && !/^rzp_test_[A-Za-z0-9]+$/.test(value))
            throw new BillingError('Sandbox requires Razorpay Test-mode credentials.', 503);
        return value;
    };
}
export function createSandboxBillingService(admin: any, env: (name: string) => string | undefined, fetcher?: typeof fetch) {
    return createBillingService({ admin: sandboxAdmin(admin), env: sandboxEnv(env), fetcher, mode: 'test' });
}
