export function prepareBillingSignIn(sessionStore: Pick<Storage, 'setItem'>, localStore: Pick<Storage, 'removeItem'>, origin: string) {
    // Billing sign-in must never resume an unrelated, abandoned checkout.
    localStore.removeItem('hintio_auth_intent');
    sessionStore.setItem('hintio_billing_return', '1');
    return origin + '/';
}
