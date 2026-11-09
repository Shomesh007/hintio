import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGateModal, PaidLicenseModal, TrialKeyModal } from '../src/marketing/AccountDialogs';

const noop = () => {};
test('closed key dialogs render no key or dialog content', () => {
    const markup = renderToStaticMarkup(
        createElement(PaidLicenseModal, {
            isOpen: false,
            plan: 'monthly',
            licenseKey: 'DUMMY-PRIVATE-KEY',
            isCopied: false,
            onCopy: noop,
            onDownload: noop,
            onClose: noop,
        })
    );
    assert.equal(markup, '');
});
test('sign-in shows the selected plan and exposes failures as an alert', () => {
    const markup = renderToStaticMarkup(
        createElement(AuthGateModal, {
            isOpen: true,
            intent: 'upgrade_yearly',
            onClose: noop,
            onSignIn: noop,
            isSigningIn: false,
            error: 'Connection interrupted',
        })
    );
    assert.match(markup, /Yearly Pro/);
    assert.match(markup, /role="alert"/);
    assert.match(markup, /Connection interrupted/);
    assert.match(markup, /aria-labelledby=/);
});
test('a pending sign-in disables the sign-in action', () => {
    const markup = renderToStaticMarkup(
        createElement(AuthGateModal, { isOpen: true, onClose: noop, onSignIn: noop, isSigningIn: true, error: null })
    );
    assert.match(markup, /disabled=""/);
    assert.match(markup, /Connecting to Google/);
});
test('trial key copy confirmation is announced and its continuation remains available', () => {
    const markup = renderToStaticMarkup(
        createElement(TrialKeyModal, { isOpen: true, trialKey: 'DEMO-KEY-NOT-VALID', onCopy: noop, onDone: noop, isCopied: true })
    );
    assert.match(markup, /aria-live="polite"/);
    assert.match(markup, /Key copied/);
    assert.match(markup, /Continue to download/);
});
