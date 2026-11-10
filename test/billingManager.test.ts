import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BillingRows } from '../src/marketing/BillingRows';
const row = {
    id: 'synthetic',
    plan: 'monthly',
    status: 'active',
    validUntil: '2026-12-10T00:00:00Z',
    billingStatus: 'active',
    cancelScheduled: false,
    autoRenew: true,
    needsReview: false,
};
const props = { purchases: [row], busy: false, confirming: null, onConfirm() {}, onCancel() {}, onBack() {} };
test('billing view exposes a separate cancellation confirmation', () => {
    const html = renderToStaticMarkup(createElement(BillingRows, props));
    assert.match(html, /Cancel monthly renewal/);
    const confirm = renderToStaticMarkup(createElement(BillingRows, { ...props, confirming: 'synthetic' }));
    assert.match(confirm, /Confirm end-of-cycle cancellation/);
    assert.match(confirm, /does not request a refund/);
});
test('cancelled renewal retains paid expiry without another cancel action', () => {
    const html = renderToStaticMarkup(createElement(BillingRows, { ...props, purchases: [{ ...row, cancelScheduled: true, autoRenew: false }] }));
    assert.match(html, /Renewal stopped/);
    assert.match(html, /Paid access until/);
    assert.doesNotMatch(html, /Cancel monthly renewal/);
});
test('yearly clearly has no automatic renewal', () => {
    const html = renderToStaticMarkup(createElement(BillingRows, { ...props, purchases: [{ ...row, plan: 'yearly', autoRenew: false }] }));
    assert.match(html, /No automatic renewal/);
    assert.doesNotMatch(html, /Cancel monthly renewal/);
});
test('unverified legacy records request proof without another purchase', () => {
    const html = renderToStaticMarkup(
        createElement(BillingRows, { ...props, purchases: [{ ...row, needsReview: true, autoRenew: false, validUntil: null }] })
    );
    assert.match(html, /Payment proof needs review/);
    assert.match(html, /do not buy again/);
});
