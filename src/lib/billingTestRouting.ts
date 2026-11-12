const sandboxEndpoints = new Set(['create-razorpay-checkout', 'issue-paid-license', 'get-my-license', 'manage-billing']);

// Only explicitly enabled local development can reroute paid requests. Auth and trials stay real.
export function billingTestUrl(url: string, enabled: boolean, baseUrl: string): string {
    if (!enabled) return url;
    const target = new URL(url);
    const base = new URL(baseUrl);
    if (target.origin !== base.origin) return url;
    const match = target.pathname.match(/^\/functions\/v1\/([^/]+)$/);
    if (match && sandboxEndpoints.has(match[1])) target.pathname = '/functions/v1/test-' + match[1];
    return target.toString();
}
export function checkoutMatchesEnvironment(keyId: unknown, sandbox: boolean): boolean {
    return typeof keyId === 'string' && new RegExp(sandbox ? '^rzp_test_[A-Za-z0-9]+$' : '^rzp_live_[A-Za-z0-9]+$').test(keyId);
}

export function createBillingTestFetch(fetcher: typeof fetch, baseUrl: string): typeof fetch {
    return (input, init) => {
        const original = input instanceof Request ? input.url : String(input);
        const routed = billingTestUrl(original, true, baseUrl);
        const request = input instanceof Request ? (routed !== original ? new Request(routed, input) : input) : routed;
        return fetcher(request, init);
    };
}
