# Billing audit and remediation — 2026-11-10

## Current remediation status

The findings below describe the original baseline. The deployed lifecycle fix now provisions the license, access token and provider metadata atomically from captured payments. Real SQL rollback tests verified resolver acceptance, key-preserving renewals, refund recomputation, ownership, service-role execution and blocked-token preservation. Live public pricing reports monthly INR 2,049 and yearly INR 14,000, with the monthly plan verified against Razorpay. Old amount environment variables no longer control new orders; verified historical purchase prices remain recoverable.

Account-management and payment-reference repair UI is tested. End-of-cycle cancellation requires an explicit confirmation and retains paid access. No customer was charged or cancelled during testing. Two older unlinked records contain no payment references; they require captured-payment proof, not automatic activation.

Both live and isolated Test-mode webhooks are now enabled with 11 lifecycle events. Actual monthly/yearly Test-mode payments and five signed purchase/renewal deliveries are verified. On 12 November, an early-renewal rejection was fixed by using the matching paid invoice period, retaining the same key and checking amount, currency, owner and capture proof. Read-time reconciliation supplements webhooks without replacing them. No real-money live charge was made.

## Historical baseline (before remediation)

## Verified

- Live Razorpay plan: Hintio Pro, plan_SRiBHkkKQcRnBV, INR 2,049 once a month. Owner explicitly chose to keep this live price.
- Plan description says unlimited interviews, but that is not evidence of app entitlement enforcement. Do not copy the unlimited claim yet.
- Recurring cards, UPI Autopay and eMandate are enabled. No subscription, plan or mandate was created, changed or cancelled during this audit.
- Deployed create-razorpay-checkout v10 uses the monthly subscription API when RAZORPAY_MONTHLY_PLAN_ID is configured. total_count is 120. Without the plan it falls back to an order. Yearly always uses an order.
- Monthly fallback is INR 2,050. Yearly default is INR 10,050, with environment overrides and a legacy lifetime environment alias. Actual yearly environment values were not retrieved. Owner's intended yearly price is INR 14,000; do not assume that is what checkout currently charges.
- Deployed issue-paid-license v5 inserts a random license into public.licenses. The deployed webhook v8 also writes licenses and only handles subscription.activated/payment.captured.
- App resolver v7 calls resolve_provider_secrets / consume_interview_credit. The live SQL functions validate hashes in public.access_tokens, not public.licenses.
- Read-only aggregate: 3 license rows, 1 with matching app access-token hash. No customer details or actual keys are retained in this report. No license-insert trigger was found linking these tables.

## Original remediation checklist (historical)

1. Reconcile license issuance with app access-token creation, expiry and paid plan entitlement. Preserve existing customer access; use idempotent payment identifiers and transactional provisioning. Test authorized test-mode payment through actual app acceptance.
2. Verify the actual yearly checkout amount and exact validity. Align fallback/environment configuration and public disclosure. Do not deploy the older local checkout over live v10 hardening.
3. Define and test cancellation: a real customer route or documented support route, effective date and treatment of current paid access. No working customer cancellation path was verified. Razorpay supporting cancellation does not itself provide Hintio's customer flow.
4. Implement/verify renewal, cancellation, failed-payment, expiry and refund lifecycle events as required by the chosen terms. Current webhook does not process subscription.cancelled or subscription.charged.
5. Verify session/count/time/daily limits from live entitlements. The app uses metadata time limits and applies 15 minutes to three-session tokens; this does not establish paid-plan limits.
6. Replace draft purchase disclosure with the verified price, renewal, cancellation, taxes and usage terms before submission. No billing changes were deployed by this audit.

The historical baseline above records the original blockers. Current end-to-end Test-mode results are documented in RAZORPAY-SANDBOX.md and the dated out/renewal-fix-2026-11-12 verification report.

## Provider integration

New paid keys now obtain company managed speech configuration without borrowing BYOK/customer records. Configuration is checked before credit consumption. Live QA returned GPT and synthetic transcription HTTP 200; temporary QA access was disabled after one QA session and zero customer sessions. Paid session metadata is bounded by remaining paid validity. No provider keys were printed or saved. Provider response checks do not replace native capture, checkout or webhook delivery tests.
