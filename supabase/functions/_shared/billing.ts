// Shared policy for checkout, fulfillment, webhooks and authenticated account management.
export const TERMS = {
    version: '2026-11-10',
    currency: 'INR',
    monthlyAmount: 204900,
    yearlyAmount: 1400000,
    monthlyRenewal: 'Renews monthly until cancelled; up to 120 billing cycles.',
    yearlyRenewal: 'One prepaid payment for 365 days. No automatic renewal. Renew manually.',
    cancellation: 'Cancel monthly renewal at the end of the current paid billing cycle. Paid access remains until its expiry.',
    usage: 'No daily or session-count cap during the paid period. No fixed paid-session time limit. Network and provider availability apply.',
    refunds:
        'Cancellation stops future renewal and does not itself refund a payment. Contact admin@builtbygsv.in for refund requests and applicable statutory rights. Full processed refunds remove the corresponding access period; partial refunds retain access.',
} as const;
export class BillingError extends Error {
    constructor(
        message: string,
        public status = 400
    ) {
        super(message);
    }
}
type Entity = Record<string, any>;
type Dependencies = { admin: any; env: (name: string) => string | undefined; fetcher?: typeof fetch; now?: () => number };
const iso = (seconds: number) => new Date(seconds * 1000).toISOString();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedOrigins = new Set(['https://www.hintio.tech', 'https://hintio.tech', 'http://localhost:3000', 'http://localhost:5174']);
export async function hmac(secret: string, value: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))))
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}
export function secureEqual(a: string, b: string) {
    if (!/^[a-f0-9]{64}$/i.test(a) || a.length !== b.length) return false;
    let difference = 0;
    for (let i = 0; i < a.length; i++) difference |= a.toLowerCase().charCodeAt(i) ^ b.toLowerCase().charCodeAt(i);
    return difference === 0;
}
export function createBillingService({ admin, env, fetcher = fetch, now = Date.now }: Dependencies) {
    const json = (req: Request, data: unknown, status = 200) => {
        const origin = req.headers.get('origin') || '';
        return new Response(JSON.stringify(data), {
            status,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store',
                'X-Content-Type-Options': 'nosniff',
                'Access-Control-Allow-Origin': allowedOrigins.has(origin) ? origin : 'https://www.hintio.tech',
                Vary: 'Origin',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            },
        });
    };
    async function readJson(req: Request) {
        const raw = await req.text();
        if (raw.length > 32768) throw new BillingError('Request too large', 413);
        try {
            return JSON.parse(raw);
        } catch {
            throw new BillingError('Invalid JSON', 400);
        }
    }
    async function api(route: string, method = 'GET', body?: unknown): Promise<Entity> {
        const id = env('RAZORPAY_KEY_ID'),
            secret = env('RAZORPAY_KEY_SECRET');
        if (!id || !secret) throw new BillingError('Payment service is not configured. Contact support.', 503);
        const response = await fetcher('https://api.razorpay.com/v1/' + route, {
            method,
            headers: { Authorization: 'Basic ' + btoa(id + ':' + secret), 'Content-Type': 'application/json' },
            ...(body ? { body: JSON.stringify(body) } : {}),
            signal: AbortSignal.timeout(12000),
        });
        const data = await response.json();
        if (!response.ok) throw new BillingError('Payment provider request failed. Please retry or contact support.', 502);
        return data;
    }
    async function user(req: Request) {
        const jwt = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
        if (!jwt) throw new BillingError('Sign in to manage your purchase.', 401);
        const { data, error } = await admin.auth.getUser(jwt);
        if (error || !data?.user?.id || !data.user.email) throw new BillingError('Your sign-in expired. Sign in again.', 401);
        const limit = await admin.rpc('enforce_access_token_rate_limit', {
            p_identifier: 'billing:' + data.user.id + ':' + new URL(req.url).pathname.split('/').pop(),
            p_max_attempts: 30,
            p_window_seconds: 60,
        });
        if (limit.error || limit.data !== true) throw new BillingError('Too many billing requests. Please retry in a minute.', 429);
        return data.user;
    }
    async function rpc(name: string, args: Entity) {
        const result = await admin.rpc(name, args);
        if (result.error) throw new BillingError('Access update is pending. Retry key recovery or contact support.', 503);
        return result.data;
    }
    async function verifiedPayment(paymentId: string, expectedUser?: string, claim?: Entity) {
        if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) throw new BillingError('Invalid payment reference');
        const payment = await api('payments/' + paymentId);
        if (payment.id !== paymentId) throw new BillingError('Payment reference mismatch');
        if (!['captured', 'refunded'].includes(payment.status))
            throw new BillingError('Payment capture is pending. Access is issued after capture.', 202);
        let invoice: Entity | undefined, subscription: Entity | undefined, order: Entity | undefined;
        if (payment.invoice_id) invoice = await api('invoices/' + encodeURIComponent(payment.invoice_id));
        const subscriptionId = invoice?.subscription_id || payment.subscription_id;
        if (subscriptionId) subscription = await api('subscriptions/' + encodeURIComponent(subscriptionId));
        else if (payment.order_id) order = await api('orders/' + encodeURIComponent(payment.order_id));
        else throw new BillingError('Payment has no verifiable checkout');
        const notes = subscription?.notes || order?.notes || {};
        const plan = notes.plan_type;
        if (notes.source !== 'hintio_website') throw new BillingError('This payment is not a Hintio website purchase.', 422);
        if (!uuid.test(notes.user_id || '') || !['monthly', 'yearly'].includes(plan))
            throw new BillingError('Purchase ownership or plan needs support review.', 409);
        if (expectedUser && notes.user_id !== expectedUser) throw new BillingError('This purchase belongs to another account.', 403);
        if (claim?.plan && plan !== claim.plan) throw new BillingError('Payment plan mismatch');
        if (claim?.subscriptionId && subscriptionId !== claim.subscriptionId) throw new BillingError('Subscription mismatch');
        if (claim?.orderId && payment.order_id !== claim.orderId) throw new BillingError('Order mismatch');
        if (subscription && (plan !== 'monthly' || subscription.plan_id !== env('RAZORPAY_MONTHLY_PLAN_ID') || subscription.quantity !== 1))
            throw new BillingError('Subscription plan mismatch');
        if (invoice && (invoice.payment_id !== payment.id || invoice.status !== 'paid' || invoice.amount_due !== 0))
            throw new BillingError('Invoice is not fully paid', 202);
        if (order && order.currency !== payment.currency) throw new BillingError('Order currency mismatch');
        const expected = plan === 'monthly' ? TERMS.monthlyAmount : TERMS.yearlyAmount;
        if (
            !Number.isSafeInteger(payment.amount) ||
            (payment.amount !== expected && !(order && notes.terms_version !== TERMS.version && payment.amount > 0)) ||
            payment.currency !== TERMS.currency ||
            (order && order.amount !== payment.amount)
        )
            throw new BillingError('Payment amount requires support review.', 409);
        const paidAt = Number(invoice?.paid_at || payment.created_at);
        let start = paidAt,
            end = start + 365 * 86400;
        if (subscription) {
            start = Number(invoice?.billing_start || subscription.current_start);
            end = Number(invoice?.billing_end || subscription.current_end);
            if (
                !Number.isFinite(start) ||
                !Number.isFinite(end) ||
                end <= start ||
                end - start > 32 * 86400 ||
                paidAt < start - 7 * 86400 ||
                paidAt > end
            )
                throw new BillingError('Billing period requires support review.', 409);
        } else if (plan === 'monthly') end = start + 30 * 86400; // previously created prepaid monthly orders only
        if (!Number.isFinite(paidAt) || paidAt > now() / 1000 + 600 || paidAt < 1500000000) throw new BillingError('Invalid payment date');
        const { data: owner, error } = await admin.auth.admin.getUserById(notes.user_id);
        if (error || !owner?.user?.email) throw new BillingError('Purchase account could not be verified.', 409);
        return {
            payment_id: payment.id,
            user_id: notes.user_id,
            email: owner.user.email,
            plan,
            subscription_id: subscriptionId || null,
            amount: payment.amount,
            currency: payment.currency,
            paid_at: iso(paidAt),
            period_start: iso(start),
            period_end: iso(end),
            amount_refunded: payment.amount_refunded || 0,
        };
    }
    async function fulfill(paymentId: string, expectedUser?: string, claim?: Entity) {
        const verified = await verifiedPayment(paymentId, expectedUser, claim);
        const result = await rpc('record_billing_payment', { p: verified });
        if (verified.amount_refunded) {
            await rpc('record_billing_refund', { p_payment_id: paymentId, p_amount_refunded: verified.amount_refunded });
            const fresh = await admin.from('licenses').select('valid_until,status').eq('id', result.licenseId).maybeSingle();
            if (fresh.error || !fresh.data) throw new BillingError('Refund access update pending', 503);
            result.validUntil = fresh.data.valid_until;
        }
        return result;
    }
    async function updateState(subscriptionId: string, cancelScheduled?: boolean, expectedOwner?: string) {
        if (!/^sub_[A-Za-z0-9]+$/.test(subscriptionId)) throw new BillingError('Invalid subscription reference');
        const current = await api('subscriptions/' + subscriptionId);
        if (expectedOwner && current.notes?.user_id !== expectedOwner) throw new BillingError('Subscription owner mismatch', 403);
        const changes: Entity = { billing_status: current.status, billing_updated_at: new Date(now()).toISOString() };
        if (cancelScheduled || ['cancelled', 'completed', 'expired'].includes(current.status)) changes.cancel_at_period_end = true;
        const result = await admin.from('licenses').update(changes).eq('razorpay_subscription_id', subscriptionId);
        if (result.error) throw new BillingError('Subscription status update pending', 503);
        return current;
    }
    async function reconcile(license: Entity, ownerId: string) {
        if (license.razorpay_subscription_id) {
            const sub = await updateState(license.razorpay_subscription_id, undefined, ownerId);
            if (sub.notes?.user_id !== ownerId) throw new BillingError('Subscription owner mismatch', 403);
            const invoices = await api('invoices?subscription_id=' + encodeURIComponent(sub.id) + '&count=10');
            for (const invoice of invoices.items || [])
                if (invoice.status === 'paid' && invoice.payment_id && invoice.amount_paid === TERMS.monthlyAmount)
                    await fulfill(invoice.payment_id, ownerId);
        } else if (license.razorpay_payment_id) await fulfill(license.razorpay_payment_id, ownerId);
    }
    async function ownedLicenses(ownerId: string) {
        const result = await admin
            .from('licenses')
            .select('id,plan,status,valid_until,billing_status,cancel_at_period_end,razorpay_subscription_id,razorpay_payment_id,access_token_id')
            .eq('user_id', ownerId)
            .order('created_at', { ascending: false })
            .limit(20);
        if (result.error) throw new BillingError('Could not load purchases', 503);
        return result.data || [];
    }
    const wrap = (handler: (req: Request) => Promise<Response>) => async (req: Request) => {
        if (req.method === 'OPTIONS') return json(req, { ok: true });
        if (Number(req.headers.get('content-length') || 0) > 32768) return json(req, { error: 'Request too large' }, 413);
        try {
            return await handler(req);
        } catch (error) {
            const known = error instanceof BillingError;
            return json(
                req,
                { error: known ? error.message : 'Billing request failed. Retry or contact admin@builtbygsv.in.' },
                known ? error.status : 500
            );
        }
    };
    return {
        verifiedPayment,
        fulfill,
        checkout: wrap(async req => {
            if (req.method === 'GET') {
                let monthlyPlanVerified: boolean | undefined;
                if (new URL(req.url).searchParams.get('verify') === '1') {
                    const planId = env('RAZORPAY_MONTHLY_PLAN_ID');
                    if (!planId) throw new BillingError('Monthly plan is not configured', 503);
                    const plan = await api('plans/' + encodeURIComponent(planId));
                    monthlyPlanVerified =
                        plan.item?.amount === TERMS.monthlyAmount &&
                        plan.item?.currency === 'INR' &&
                        plan.period === 'monthly' &&
                        plan.interval === 1;
                    if (!monthlyPlanVerified) throw new BillingError('Monthly plan configuration mismatch', 503);
                }
                return json(req, {
                    ...TERMS,
                    monthlyMode: 'subscription',
                    yearlyMode: 'order',
                    monthlyPlanVerified,
                    paymentMode: env('RAZORPAY_KEY_ID')?.startsWith('rzp_live_') ? 'live' : 'test',
                    yearlyPriceSource: 'Fixed shared policy used by the actual order-creation request',
                });
            }
            if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
            const owner = await user(req),
                { plan } = await readJson(req);
            if (!['monthly', 'yearly'].includes(plan)) throw new BillingError('Invalid plan');
            if (plan === 'monthly') {
                const existing = await ownedLicenses(owner.id);
                if (
                    existing.some(
                        (x: Entity) =>
                            x.plan === 'monthly' && x.razorpay_subscription_id && !x.cancel_at_period_end && Date.parse(x.valid_until || '') > now()
                    )
                )
                    throw new BillingError(
                        'Monthly renewal is already enabled. Use Manage my billing or Retrieve my key instead of paying again.',
                        409
                    );
            }
            const notes = { user_id: owner.id, email: owner.email, plan_type: plan, source: 'hintio_website', terms_version: TERMS.version };
            const keyId = env('RAZORPAY_KEY_ID');
            if (plan === 'monthly') {
                const planId = env('RAZORPAY_MONTHLY_PLAN_ID');
                if (!planId) throw new BillingError('Monthly plan temporarily unavailable', 503);
                const remotePlan = await api('plans/' + encodeURIComponent(planId));
                if (
                    remotePlan.item?.amount !== TERMS.monthlyAmount ||
                    remotePlan.item?.currency !== 'INR' ||
                    remotePlan.period !== 'monthly' ||
                    remotePlan.interval !== 1
                )
                    throw new BillingError('Monthly price configuration needs support review.', 503);
                const sub = await api('subscriptions', 'POST', { plan_id: planId, customer_notify: 1, total_count: 120, quantity: 1, notes });
                if (!sub.id) throw new BillingError('Could not prepare checkout', 502);
                return json(req, {
                    mode: 'subscription',
                    keyId,
                    subscriptionId: sub.id,
                    amount: TERMS.monthlyAmount,
                    currency: 'INR',
                    name: 'Hintio',
                    description: 'Hintio Monthly — INR 2,049/month',
                    prefill: { email: owner.email },
                    terms: TERMS,
                });
            }
            const order = await api('orders', 'POST', {
                amount: TERMS.yearlyAmount,
                currency: 'INR',
                receipt: 'hintio_yearly_' + crypto.randomUUID().slice(0, 16),
                notes,
            });
            if (!order.id || order.amount !== TERMS.yearlyAmount || order.currency !== 'INR')
                throw new BillingError('Could not verify checkout amount', 502);
            return json(req, {
                mode: 'order',
                keyId,
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                name: 'Hintio',
                description: 'Hintio Yearly — 365 days, no auto-renewal',
                prefill: { email: owner.email },
                terms: TERMS,
            });
        }),
        issue: wrap(async req => {
            if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
            const owner = await user(req),
                body = await readJson(req);
            if (!body.paymentId || !body.signature || (!body.orderId && !body.subscriptionId) || (body.orderId && body.subscriptionId))
                throw new BillingError('Missing or ambiguous payment proof');
            const signed = body.subscriptionId ? body.paymentId + '|' + body.subscriptionId : body.orderId + '|' + body.paymentId;
            const secret = env('RAZORPAY_KEY_SECRET');
            if (!secret || !secureEqual(body.signature, await hmac(secret, signed))) throw new BillingError('Invalid payment signature', 403);
            const result = await fulfill(body.paymentId, owner.id, body);
            if (result?.accessStatus === 'blocked' || !result?.validUntil || Date.parse(result.validUntil) <= now())
                throw new BillingError('This payment has no remaining active access. Contact support if this is unexpected.', 409);
            return json(req, result);
        }),
        recover: wrap(async req => {
            if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
            const owner = await user(req),
                body = await readJson(req);
            const rows = await ownedLicenses(owner.id);
            for (const row of rows.filter((x: Entity) => !body.plan || x.plan === body.plan).slice(0, 3)) {
                try {
                    await reconcile(row, owner.id);
                } catch {
                    /* Retain already-verified, unexpired access during provider outages. */
                }
            }
            if (rows.some((x: Entity) => !x.access_token_id && !x.razorpay_payment_id && !x.razorpay_subscription_id)) {
                const recent = await api('payments?count=50');
                for (const payment of recent.items || []) {
                    if (payment.email?.toLowerCase() !== owner.email.toLowerCase() && payment.notes?.user_id !== owner.id) continue;
                    if (!['captured', 'refunded'].includes(payment.status)) continue;
                    try {
                        await fulfill(payment.id, owner.id);
                    } catch (error) {
                        if (!(error instanceof BillingError) || error.status >= 500) throw error;
                    }
                }
            }
            let query = admin
                .from('licenses')
                .select('license_key,plan,status,valid_until,access_token_id')
                .eq('user_id', owner.id)
                .eq('status', 'active')
                .gt('valid_until', new Date(now()).toISOString())
                .not('access_token_id', 'is', null)
                .order('valid_until', { ascending: false })
                .limit(1);
            if (body.plan) query = query.eq('plan', body.plan);
            const result = await query;
            if (result.error) throw new BillingError('Could not recover access', 503);
            const license = result.data?.[0];
            if (!license)
                throw new BillingError(
                    rows.some((x: Entity) => !x.access_token_id && !x.razorpay_payment_id && !x.razorpay_subscription_id)
                        ? 'This older key needs payment-proof review. Contact admin@builtbygsv.in.'
                        : 'No active paid access found. If payment was just captured, retry shortly.',
                    404
                );
            const token = await admin.from('access_tokens').select('is_active,status,expires_at').eq('id', license.access_token_id).maybeSingle();
            if (token.error || !token.data?.is_active || token.data.status !== 'active' || Date.parse(token.data.expires_at) <= now())
                throw new BillingError('Access needs support review.', 409);
            return json(req, { licenseKey: license.license_key, plan: license.plan, status: license.status, validUntil: license.valid_until });
        }),
        manage: wrap(async req => {
            if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
            const owner = await user(req),
                body = await readJson(req);
            let rows = await ownedLicenses(owner.id);
            if (body.action === 'recover') {
                await fulfill(body.paymentId, owner.id);
                rows = await ownedLicenses(owner.id);
            } else if (body.action === 'cancel') {
                const selected = rows.find((x: Entity) => x.id === body.licenseId);
                if (!selected) throw new BillingError('Purchase not found', 404);
                if (!selected.razorpay_subscription_id) throw new BillingError('This purchase has no automatic renewal to cancel');
                if (body.confirm !== true) throw new BillingError('Confirm end-of-cycle cancellation');
                if (!selected.cancel_at_period_end) {
                    const current = await api('subscriptions/' + selected.razorpay_subscription_id);
                    if (current.notes?.user_id !== owner.id) throw new BillingError('Subscription owner mismatch', 403);
                    if (!['cancelled', 'completed', 'expired'].includes(current.status))
                        await api('subscriptions/' + selected.razorpay_subscription_id + '/cancel', 'POST', { cancel_at_cycle_end: true });
                    await updateState(selected.razorpay_subscription_id, true, owner.id);
                }
            } else if (body.action !== 'list') throw new BillingError('Invalid action');
            // Read-time repair supplements webhook delivery without creating payments.
            const warnings: string[] = [];
            for (const row of rows.slice(0, 3)) {
                try {
                    await reconcile(row, owner.id);
                } catch {
                    warnings.push('Latest payment-provider sync is pending. Existing expiry still applies.');
                }
            }
            rows = await ownedLicenses(owner.id);
            return json(req, {
                terms: TERMS,
                warnings: [...new Set(warnings)],
                purchases: rows.map((x: Entity) => ({
                    id: x.id,
                    plan: x.plan,
                    status: x.status,
                    validUntil: x.valid_until,
                    billingStatus: x.billing_status,
                    cancelScheduled: x.cancel_at_period_end,
                    autoRenew: !!x.razorpay_subscription_id && !x.cancel_at_period_end,
                    needsReview: !x.access_token_id && !x.razorpay_payment_id && !x.razorpay_subscription_id,
                })),
            });
        }),
        webhook: wrap(async req => {
            if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);
            const raw = await req.text();
            if (raw.length > 32768) throw new BillingError('Request too large', 413);
            const secret = env('RAZORPAY_WEBHOOK_SECRET'),
                signature = req.headers.get('x-razorpay-signature') || '';
            if (!secret || !secureEqual(signature, await hmac(secret, raw))) throw new BillingError('Invalid webhook signature', 403);
            const event = JSON.parse(raw),
                eventId = req.headers.get('x-razorpay-event-id');
            if (!eventId || eventId.length > 200) throw new BillingError('Missing webhook event ID');
            const seen = await admin.from('billing_webhook_events').select('event_id').eq('event_id', eventId).maybeSingle();
            if (seen.error) throw new BillingError('Webhook processing unavailable', 503);
            if (seen.data) return json(req, { ok: true, replayed: true });
            const payment = event.payload?.payment?.entity,
                sub = event.payload?.subscription?.entity,
                refund = event.payload?.refund?.entity;
            const supported = new Set([
                'payment.captured',
                'subscription.charged',
                'subscription.activated',
                'subscription.pending',
                'subscription.halted',
                'subscription.cancelled',
                'subscription.completed',
                'subscription.updated',
                'subscription.paused',
                'subscription.resumed',
                'refund.processed',
                'payment.refunded',
            ]);
            if (!supported.has(event.event)) return json(req, { ok: true, ignored: true });
            if (['payment.captured', 'subscription.charged'].includes(event.event) && payment?.id) {
                try {
                    await fulfill(payment.id);
                } catch (error) {
                    if (error instanceof BillingError && error.status === 202)
                        throw new BillingError('Invoice capture is still processing. Retry delivery.', 503);
                    if (!(error instanceof BillingError) || error.status !== 422) throw error;
                }
            }
            if (sub?.id) {
                const current = await updateState(sub.id);
                // Activation alone is not proof of a full captured charge.
                if (event.event === 'subscription.activated') {
                    const invoices = await api('invoices?subscription_id=' + encodeURIComponent(current.id) + '&count=10');
                    for (const invoice of invoices.items || [])
                        if (invoice.status === 'paid' && invoice.payment_id && invoice.amount_paid === TERMS.monthlyAmount)
                            await fulfill(invoice.payment_id);
                }
            }
            if (['refund.processed', 'payment.refunded'].includes(event.event)) {
                const paymentId = refund?.payment_id || payment?.id;
                if (!paymentId) throw new BillingError('Refund payment missing');
                const actual = await api('payments/' + encodeURIComponent(paymentId));
                await rpc('record_billing_refund', { p_payment_id: paymentId, p_amount_refunded: actual.amount_refunded || 0 });
            }
            const saved = await admin.from('billing_webhook_events').insert({ event_id: eventId, event_type: event.event });
            if (saved.error && saved.error.code !== '23505') throw new BillingError('Webhook receipt pending', 503);
            return json(req, { ok: true });
        }),
    };
}
