# Read-only billing audit — 2026-11-10

## Verified

- Live Razorpay plan: Hintio Pro, plan_SRiBHkkKQcRnBV, INR 2,049 once a month. Owner explicitly chose to keep this live price.
- Plan description says unlimited interviews, but that is not evidence of app entitlement enforcement. Do not copy the unlimited claim yet.
- Recurring cards, UPI Autopay and eMandate are enabled. No subscription, plan or mandate was created, changed or cancelled during this audit.
- Deployed create-razorpay-checkout v10 uses the monthly subscription API when RAZORPAY_MONTHLY_PLAN_ID is configured. total_count is 120. Without the plan it falls back to an order. Yearly always uses an order.
- Monthly fallback is INR 2,050. Yearly default is INR 10,050, with environment overrides and a legacy lifetime environment alias. Actual yearly environment values were not retrieved. Owner's intended yearly price is INR 14,000; do not assume that is what checkout currently charges.
- Deployed issue-paid-license v5 inserts a random license into public.licenses. The deployed webhook v8 also writes licenses and only handles subscription.activated/payment.captured.
- App resolver v7 calls resolve_provider_secrets / consume_interview_credit. The live SQL functions validate hashes in public.access_tokens, not public.licenses.
- Read-only aggregate: 3 license rows, 1 with matching app access-token hash. No customer details or actual keys are retained in this report. No license-insert trigger was found linking these tables.

## Required before Store submission

1. Reconcile license issuance with app access-token creation, expiry and paid plan entitlement. Preserve existing customer access; use idempotent payment identifiers and transactional provisioning. Test authorized test-mode payment through actual app acceptance.
2. Verify the actual yearly checkout amount and exact validity. Align fallback/environment configuration and public disclosure. Do not deploy the older local checkout over live v10 hardening.
3. Define and test cancellation: a real customer route or documented support route, effective date and treatment of current paid access. No working customer cancellation path was verified. Razorpay supporting cancellation does not itself provide Hintio's customer flow.
4. Implement/verify renewal, cancellation, failed-payment, expiry and refund lifecycle events as required by the chosen terms. Current webhook does not process subscription.cancelled or subscription.charged.
5. Verify session/count/time/daily limits from live entitlements. The app uses metadata time limits and applies 15 minutes to three-session tokens; this does not establish paid-plan limits.
6. Replace draft purchase disclosure with the verified price, renewal, cancellation, taxes and usage terms before submission. No billing changes were deployed by this audit.

This report is a release blocker list, not a successful payment end-to-end test.
