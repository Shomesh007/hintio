import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingPaymentReference, rememberPendingLicense } from '../src/lib/pendingLicense';
function store() {
    const values = new Map<string, string>();
    return {
        getItem: (k: string) => values.get(k) || null,
        setItem: (k: string, v: string) => {
            values.set(k, v);
        },
        removeItem: (k: string) => {
            values.delete(k);
        },
    };
}
test('recovery forwards only a matching-plan payment reference', () => {
    const storage = store();
    rememberPendingLicense({ plan: 'yearly', reference: 'pay_example' }, storage);
    assert.equal(pendingPaymentReference('yearly', storage), 'pay_example');
    assert.equal(pendingPaymentReference('monthly', storage), undefined);
    rememberPendingLicense({ plan: 'yearly', reference: 'sub_example' }, storage);
    assert.equal(pendingPaymentReference('yearly', storage), undefined);
});
test('each recovery poll reads the latest persisted proof rather than stale React state', () => {
    const storage = store();
    assert.equal(pendingPaymentReference('yearly', storage), undefined);
    rememberPendingLicense({ plan: 'yearly', reference: 'pay_late' }, storage);
    assert.equal(pendingPaymentReference('yearly', storage), 'pay_late');
});
