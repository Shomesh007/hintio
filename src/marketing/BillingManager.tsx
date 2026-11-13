import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { prepareBillingSignIn } from '../lib/billingAccount';
import { BillingRows, type Purchase } from './BillingRows';
export default function BillingManager() {
    const [purchases, setPurchases] = useState<Purchase[] | null>(null),
        [busy, setBusy] = useState(false),
        [error, setError] = useState(''),
        [message, setMessage] = useState(''),
        [confirming, setConfirming] = useState<string | null>(null),
        [needsSignIn, setNeedsSignIn] = useState(false),
        [paymentReference, setPaymentReference] = useState('');
    async function load(action = 'list', licenseId?: string) {
        if (busy) return;
        setBusy(true);
        setError('');
        setMessage('');
        try {
            if (!supabase) throw Error('Account service is unavailable. Contact admin@builtbygsv.in.');
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
                setNeedsSignIn(true);
                return;
            }
            const { data, error } = await supabase.functions.invoke('manage-billing', {
                body: { action, licenseId, paymentId: paymentReference.trim(), confirm: action === 'cancel' },
                timeout: 20000,
            });
            if (error) {
                let detail = 'Could not update billing. Retry or contact support.';
                try {
                    const body = await error.context?.json();
                    if (body?.error) detail = body.error;
                } catch {}
                throw Error(detail);
            }
            setPurchases(data.purchases || []);
            setConfirming(null);
            setNeedsSignIn(false);
            setMessage(
                action === 'recover'
                    ? 'Payment proof verified. Use Retrieve my key above to get your active access key.'
                    : action === 'cancel'
                      ? 'Monthly renewal cancellation is scheduled. Your paid expiry is unchanged.'
                      : (data.warnings || []).join(' ')
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not load billing.');
        } finally {
            setBusy(false);
        }
    }
    async function signIn() {
        if (!supabase) return;
        setBusy(true);
        setError('');
        try {
            const redirectTo = prepareBillingSignIn(sessionStorage, localStorage, window.location.origin);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo },
            });
            if (error) throw error;
        } catch {
            setError('Could not start Google sign-in. Please retry.');
            setBusy(false);
        }
    }
    return (
        <section id="billing" className="wrap billing-manager">
            <div>
                <span className="eyebrow">YOUR PURCHASE</span>
                <h2>Manage your paid access.</h2>
                <p>Review your paid period and manage future renewal. Uninstalling Hintio does not cancel a Razorpay subscription.</p>
            </div>
            <div>
                <button disabled={busy} onClick={() => load()}>
                    {busy ? 'Checking…' : purchases ? 'Refresh billing' : 'Manage my billing'}
                </button>
                {needsSignIn && (
                    <div>
                        <p>Sign in with the Google account used at checkout.</p>
                        <button disabled={busy} onClick={signIn}>
                            Sign in with Google
                        </button>
                    </div>
                )}
                {error && <p role="alert">{error}</p>}
                {message && <p role="status">{message}</p>}
                {purchases && (
                    <BillingRows
                        purchases={purchases}
                        busy={busy}
                        confirming={confirming}
                        onConfirm={setConfirming}
                        onCancel={id => load('cancel', id)}
                        onBack={() => setConfirming(null)}
                    />
                )}
                <div className="billing-proof">
                    <label htmlFor="billing-reference">Have a Razorpay payment ID?</label>
                    <input
                        id="billing-reference"
                        value={paymentReference}
                        onChange={e => setPaymentReference(e.target.value)}
                        maxLength={60}
                        placeholder="pay_…"
                        autoComplete="off"
                    />
                    <button disabled={busy || !/^pay_[A-Za-z0-9]+$/.test(paymentReference.trim())} onClick={() => load('recover')}>
                        Verify payment &amp; repair access
                    </button>
                    <p className="small-copy">
                        Use the Razorpay payment reference from your receipt. Only a captured purchase belonging to your signed-in account can restore
                        access.
                    </p>
                </div>
                <p className="small-copy">
                    Need payment-proof review or a refund? <a href="mailto:admin@builtbygsv.in">Contact support</a>. Never send API keys or private
                    session content.
                </p>
            </div>
        </section>
    );
}
