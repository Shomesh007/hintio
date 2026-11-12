// Local Vite review fixture. Not an entry point of the production build.
// Uses dummy keys and callbacks only; never calls auth, payment or license services.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
    AuthGateModal,
    TrialKeyModal,
    PaidLicenseModal,
    MacComingSoonModal,
    PaymentSupportModal,
    CheckoutStatus,
    PendingLicenseModal,
} from '../src/marketing/AccountDialogs';
import '../src/index.css';
import '../src/marketing/account-dialogs.css';

function Review() {
    const [state, setState] = useState(new URLSearchParams(window.location.search).get('state') || 'sign-in');
    const [copied, setCopied] = useState(false);
    const [action, setAction] = useState('No action yet');
    const close = () => {
        setState('closed');
        setAction('Closed');
    };
    return (
        <div style={{ minHeight: '100vh', background: '#e9edf6', padding: 30, fontFamily: 'Inter, sans-serif' }}>
            <h1>Local dialog review</h1>
            <p>Dummy data only. No backend calls.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {['sign-in', 'download', 'sign-in-error', 'trial', 'paid', 'mac', 'checkout-help', 'pending', 'pending-retry', 'loading'].map(
                    name => (
                        <button
                            key={name}
                            onClick={() => {
                                setState(name);
                                setCopied(false);
                            }}
                            style={{ padding: 10, border: '1px solid #8792a8', borderRadius: 5 }}
                        >
                            {name}
                        </button>
                    )
                )}
            </div>
            <p role="status">{action}</p>
            <AuthGateModal
                isOpen={['sign-in', 'download', 'sign-in-error'].includes(state)}
                onClose={close}
                onSignIn={() => setAction('Sign-in callback invoked')}
                isSigningIn={false}
                error={state === 'sign-in-error' ? 'The connection was interrupted. Please try again.' : null}
                intent={state === 'download' ? 'download' : 'upgrade_monthly'}
            />
            <TrialKeyModal
                isOpen={state === 'trial'}
                onClose={close}
                trialKey="DEMO-KEY-NOT-VALID"
                isCopied={copied}
                onCopy={() => {
                    setCopied(true);
                    setAction('Copy callback invoked');
                }}
                onDone={() => setAction('Continue callback invoked')}
            />
            <PaidLicenseModal
                isOpen={state === 'paid'}
                plan="monthly"
                licenseKey="DEMO-KEY-NOT-VALID"
                isCopied={copied}
                onCopy={() => {
                    setCopied(true);
                    setAction('Copy callback invoked');
                }}
                onDownload={() => setAction('Download callback invoked')}
                onClose={close}
            />
            <MacComingSoonModal isOpen={state === 'mac'} onClose={close} />
            <PaymentSupportModal isOpen={state === 'checkout-help'} onClose={close} />
            <PendingLicenseModal
                isOpen={state === 'pending' || state === 'pending-retry'}
                isRecovering={state === 'pending'}
                reference="DEMO-PAYMENT"
                onDownload={() => setAction('Download callback invoked')}
                onClose={close}
            />
            {state === 'loading' && <CheckoutStatus />}
        </div>
    );
}
createRoot(document.getElementById('root')!).render(<Review />);
