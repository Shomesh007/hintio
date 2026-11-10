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

## Remaining renewal test
The Test-mode dashboard's Charge this now > Charge as success was attempted twice.
Both attempts reported "Charge attempt failed. A retry is scheduled."
Two new invoices were issued and the subscription billing period advanced, but paid_count
remained 1 and neither renewal payment was captured. Hintio did not extend access on unpaid invoices.
Do not report successful provider renewal as verified. Preserve paid access and investigate
with Razorpay merchant support, using the references in out/razorpay-e2e-2026-11-11.
Do not weaken captured-payment or invoice verification to make the simulator appear to pass.

## Independent release limitations
Live webhook configuration is saved, but no real-money live charge was made in this QA.
Native Store-signed installation and runtime tests still require Microsoft approval/signing.
Existing project security advisories remain; the new sandbox tables' RLS-without-policies
INFO findings deliberately deny browser access.
