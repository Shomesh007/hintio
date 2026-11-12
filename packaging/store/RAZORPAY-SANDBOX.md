# Razorpay sandbox verification

The live webhook is enabled at /functions/v1/razorpay-webhook with 11 events.
The isolated Test-mode webhook is enabled at /functions/v1/razorpay-test-webhook with the same events.

## Isolation
- Test keys are server-side RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET.
- RAZORPAY_TEST_MONTHLY_PLAN_ID is the INR 2,049 monthly Test-mode plan.
- RAZORPAY_TEST_WEBHOOK_SECRET must match the separate Razorpay Test-mode webhook.
- The sandbox adapter rejects live key IDs, has no production-secret fallback, and only permits explicitly mapped test tables and RPCs.
- All five billing_test_* tables have forced RLS, no browser grants, and service-only access.
- HINTIO-TEST-* keys are stored only in billing_test_access_tokens and cannot unlock production.
- No production customer rows or provider credentials were copied.

## Local verification
Run npm run dev from hintio-website and open http://localhost:3000/billing-sandbox.html.
This harness is development-only and is not a production build entry.
Sign in with the actual Hintio Google account, then test monthly/yearly checkout,
refresh billing, cancel the test monthly subscription and recover keys after reload.
Only complete checkouts displaying Test Mode. Never enter a real card.

Commands:
- npm --prefix hintio-website test
- npm --prefix hintio-website run typecheck
- SQL integration: packaging/store/test-razorpay-sandbox.sql (always rolls back)

## Evidence on 11 November 2026
92 automated tests and TypeScript passed.
Actual Razorpay test monthly INR 2,049 and yearly INR 14,000 payments were captured.
Signed payment.captured, subscription.charged and subscription.activated events were processed.
Monthly fulfillment reused the webhook-created key; no duplicate grant.
Monthly cancellation was accepted through the real handler, auto-renew disabled locally,
and the original paid expiry remained intact. End-of-cycle cancellation remains active at
Razorpay until the cycle ends, according to Razorpay's documented lifecycle.
Yearly access is 365 days without automatic renewal.
No test keys appeared in production licenses.

## Renewal fix verified on 12 November 2026
The earlier retry message was not the final capture result: one renewal captured later.
Hintio rejected its webhook because an arbitrary seven-day prepayment check did not
allow accelerated Test-mode billing periods. It also used mutable subscription dates
as an invoice-date fallback.

The deployed fix takes the period exclusively from the matching fully paid invoice.
It verifies invoice/payment identities, captured status, amount, currency, canonical
account ownership, plan and bounded monthly period. Missing dates retry without an
access grant. Future payment timestamps remain rejected. Production rejects Test keys,
and the isolated sandbox rejects live keys.

The previously rejected captured renewal recovered onto the same license and key.
A fresh Test-mode purchase and renewal then produced two captured INR 2,049 payments
for one license. Five signed purchase/renewal deliveries returned HTTP 200. No manual
recovery ran during the fresh renewal. Recovery retained the same key after reload;
end-of-cycle cancellation disabled renewal while preserving the renewed paid expiry.
No test keys appeared in production. No real funds or customer subscriptions were used.

99 website tests, 70 desktop tests, 69 desktop JavaScript syntax checks, TypeScript,
the production website build and both real SQL rollback suites passed. Live function
versions: checkout 18, issuer 13, recovery 14, management 8 and webhook 16.
This is a server-side repair; installed clients do not require an update for it.
Detailed evidence and rollback source: out/renewal-fix-2026-11-12/.

## Independent release limitations
Live webhook configuration is saved, but no real-money live charge was made in this QA.
Native Store-signed installation and runtime tests still require Microsoft approval/signing.
Existing project security advisories remain; the new sandbox tables' RLS-without-policies
INFO findings deliberately deny browser access.
