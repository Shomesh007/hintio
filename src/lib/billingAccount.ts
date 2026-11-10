export function prepareBillingSignIn(sessionStore: Pick<Storage, 'setItem'>, localStore: Pick<Storage, 'removeItem'>, origin: string) {
    // Billing sign-in must never resume an unrelated, abandoned checkout.
    localStore.removeItem('hintio_auth_intent');
    sessionStore.setItem('hintio_billing_return', '1');
    return origin + '/';
}

export async function completeBillingReturn(
    store: Pick<Storage, 'getItem' | 'removeItem'>,
    waitForSession: () => Promise<unknown>,
    onComplete: () => void
) {
    if (store.getItem('hintio_billing_return') !== '1') return false;
    try {
        await waitForSession();
    } finally {
        store.removeItem('hintio_billing_return');
        onComplete();
    }
    return true;
}
