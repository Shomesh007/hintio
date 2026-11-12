import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AuthGateModal, PaidLicenseModal, PendingLicenseModal, TrialKeyModal } from '../src/marketing/AccountDialogs';

const noop = () => {};
test('returning paid customers sign in for retrieval with no checkout steps', () => {
    const markup = renderToStaticMarkup(
        createElement(AuthGateModal, {
            isOpen: true,
            intent: 'recover_yearly',
            onClose: noop,
            onSignIn: noop,
            isSigningIn: false,
            error: null,
        })
    );
    assert.match(markup, /Welcome back/);
    assert.match(markup, /same Google account/);
    assert.match(markup, /Yearly Pro/);
    assert.doesNotMatch(markup, /Purchase steps/);
});
for (const isRecovering of [true, false]) {
    test(`pending payment panel keeps download and support available (recovering=${isRecovering})`, () => {
        const markup = renderToStaticMarkup(
            createElement(PendingLicenseModal, {
                isOpen: true,
                isRecovering,
                reference: 'DEMO-PAYMENT',
                onDownload: noop,
                onClose: noop,
            })
        );
        assert.match(markup, /Do not pay again/);
        assert.match(markup, /Download for Windows/);
        assert.match(markup, /DEMO-PAYMENT/);
        assert.match(markup, /Contact support/);
        assert.doesNotMatch(markup, /Check for my key|Check again without paying/);
        assert.match(markup, isRecovering ? /keep checking/ : /Automatic checks will resume/);
    });
}
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
        createElement(TrialKeyModal, { isOpen: true, trialKey: 'DEMO-KEY-NOT-VALID', onCopy: noop, onDone: noop, onClose: noop, isCopied: true })
    );
    assert.match(markup, /aria-live="polite"/);
    assert.match(markup, /Key copied/);
    assert.match(markup, /Continue to download/);
});

test('trial dialog exposes close and back controls without forcing a download', () => {
    const markup = renderToStaticMarkup(
        createElement(TrialKeyModal, { isOpen: true, trialKey: 'DEMO-KEY-NOT-VALID', onCopy: noop, onDone: noop, onClose: noop, isCopied: false })
    );
    assert.match(markup, /aria-label="Close dialog"/);
    assert.match(markup, /Back to plans/);
    assert.match(markup, /retrieve it again/);
    assert.doesNotMatch(markup, /shown once/);
});

test('dismissing the trial forwards only the close action', () => {
    let closed = 0,
        downloaded = 0;
    const dialog = TrialKeyModal({
        isOpen: true,
        trialKey: 'DEMO-KEY-NOT-VALID',
        onCopy: noop,
        onDone: () => downloaded++,
        onClose: () => closed++,
        isCopied: false,
    });
    dialog.props.onClose();
    assert.equal(closed, 1);
    assert.equal(downloaded, 0);
});

test('the actual App Escape handler dismisses an open trial without downloading', () => {
    const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
    const parsed = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let handler: ts.VariableDeclaration | undefined;
    function find(node: ts.Node) {
        if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'onKeyDown') handler = node;
        ts.forEachChild(node, find);
    }
    find(parsed);
    assert(handler);
    const code = ts.transpileModule(`const handler=${handler.initializer!.getText(parsed)};handler;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    let trialOpen = true;
    const onKeyDown = vm.runInNewContext(code, {
        isTrialModalOpen: true,
        setIsTrialModalOpen: (open: boolean) => (trialOpen = open),
        setIsAuthModalOpen: noop,
        setIsMacModalOpen: noop,
        setIsPaymentModalOpen: noop,
        setIsPaidLicenseModalOpen: noop,
        setIsPendingLicenseOpen: noop,
    });
    onKeyDown({ key: 'Escape' });
    assert.equal(trialOpen, false);
});
