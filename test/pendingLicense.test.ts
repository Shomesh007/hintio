import test from 'node:test';
import assert from 'node:assert/strict';
import { readPendingLicense, rememberPendingLicense, forgetPendingLicense } from '../src/lib/pendingLicense';

function storage() {
    const values = new Map<string, string>();
    return {
        values,
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
            values.set(key, value);
        },
        removeItem: (key: string) => {
            values.delete(key);
        },
    };
}

test('closing a tab loses session state but a fresh tab restores the pending paid purchase', () => {
    const persistent = storage();
    const oldTab = storage();
    const pending = { plan: 'yearly' as const, reference: 'DEMO-PAID-REFERENCE' };
    rememberPendingLicense(pending, persistent, oldTab);
    oldTab.values.clear();
    const newTab = storage();
    assert.deepEqual(readPendingLicense(persistent, newTab), pending);
    assert.equal(newTab.values.size, 0);
});

test('legacy tab reminders migrate to persistent recovery and both are cleared after delivery', () => {
    const persistent = storage();
    const legacy = storage();
    const pending = { plan: 'monthly' as const, reference: 'DEMO-LEGACY-REFERENCE' };
    legacy.setItem('hintio_pending_license', JSON.stringify(pending));
    assert.deepEqual(readPendingLicense(persistent, legacy), pending);
    rememberPendingLicense(readPendingLicense(persistent, legacy)!, persistent, legacy);
    legacy.values.clear();
    assert.deepEqual(readPendingLicense(persistent), pending);
    forgetPendingLicense(persistent, legacy);
    assert.equal(readPendingLicense(persistent, legacy), null);
});

test('recovery hints exclude keys, signatures and credentials and reject invalid plans', () => {
    const persistent = storage();
    rememberPendingLicense({ plan: 'monthly', reference: 'DEMO-PAID', ...{ licenseKey: 'PRIVATE', signature: 'PRIVATE' } }, persistent);
    assert.deepEqual(JSON.parse(persistent.getItem('hintio_pending_license')!), { plan: 'monthly', reference: 'DEMO-PAID' });
    persistent.setItem('hintio_pending_license', '{"plan":"admin","reference":"DEMO"}');
    assert.equal(readPendingLicense(persistent), null);
    persistent.setItem('hintio_pending_license', 'broken json');
    assert.equal(readPendingLicense(persistent), null);
});

test('blocked persistent storage preserves legacy recovery and cannot interrupt delivery', () => {
    const blocked = {
        getItem: () => {
            throw Error('Blocked');
        },
        setItem: () => {
            throw Error('Blocked');
        },
        removeItem: () => {
            throw Error('Blocked');
        },
    };
    const legacy = storage();
    const pending = { plan: 'yearly' as const, reference: 'DEMO-REFERENCE' };
    assert.doesNotThrow(() => rememberPendingLicense(pending, blocked, legacy));
    assert.deepEqual(readPendingLicense(blocked, legacy), pending);
    assert.doesNotThrow(() => forgetPendingLicense(blocked, legacy));
    assert.equal(readPendingLicense(blocked, legacy), null);
});
