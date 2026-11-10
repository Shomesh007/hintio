export type Purchase = {
    id: string;
    plan: string;
    status: string;
    validUntil: string | null;
    billingStatus: string | null;
    cancelScheduled: boolean;
    autoRenew: boolean;
    needsReview: boolean;
};
export function BillingRows({
    purchases,
    busy,
    confirming,
    onConfirm,
    onCancel,
    onBack,
}: {
    purchases: Purchase[];
    busy: boolean;
    confirming: string | null;
    onConfirm: (id: string) => void;
    onCancel: (id: string) => void;
    onBack: () => void;
}) {
    return (
        <div className="billing-records">
            {purchases.length === 0 ? (
                <p>
                    No purchases are linked to this account. Use the same Google account used at checkout, or contact support with your payment
                    reference.
                </p>
            ) : (
                purchases.map(p => (
                    <article key={p.id}>
                        <div>
                            <h3>{p.plan === 'yearly' ? 'Yearly prepaid access' : 'Monthly access'}</h3>
                            <p>
                                {p.needsReview
                                    ? 'Payment proof needs review'
                                    : p.validUntil
                                      ? 'Paid access until ' +
                                        new Date(p.validUntil).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                                      : 'No verified paid period yet'}
                            </p>
                            <p>
                                {p.needsReview
                                    ? 'Contact admin@builtbygsv.in with your payment reference; do not buy again to recover an existing purchase.'
                                    : p.cancelScheduled
                                      ? 'Renewal stopped. Any remaining paid access is retained.'
                                      : p.autoRenew
                                        ? 'Monthly renewal is enabled.'
                                        : p.plan === 'yearly'
                                          ? 'No automatic renewal. Renew manually when you need more time.'
                                          : 'No active automatic renewal.'}
                            </p>
                            {p.billingStatus && <small>Payment status: {p.billingStatus}</small>}
                        </div>
                        {p.autoRenew &&
                            (confirming === p.id ? (
                                <div className="billing-confirm" role="group" aria-label="Confirm cancellation">
                                    <p>Stop future monthly renewal? Your current paid period stays available. This does not request a refund.</p>
                                    <button disabled={busy} onClick={() => onCancel(p.id)}>
                                        {busy ? 'Saving…' : 'Confirm end-of-cycle cancellation'}
                                    </button>
                                    <button disabled={busy} onClick={onBack}>
                                        Keep renewal
                                    </button>
                                </div>
                            ) : (
                                <button disabled={busy} onClick={() => onConfirm(p.id)}>
                                    Cancel monthly renewal
                                </button>
                            ))}
                    </article>
                ))
            )}
        </div>
    );
}
