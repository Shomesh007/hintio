# Hintio website and billing operations

Production: https://www.hintio.tech . Website source is published from the main branch through the existing Vercel Git integration. Backend project: vsybqtunyuanxspxhzue.

## Current price and renewal policy

- Monthly: INR 2,049, Razorpay recurring subscription, up to 120 cycles. End-of-cycle cancellation retains the verified paid period.
- Yearly: INR 14,000 prepaid for 365 days. No automatic renewal. Manual renewal retains remaining verified paid time.
- Paid access has no fixed session/count/daily limit; provider/network availability and normal abuse controls apply.
- Cancellation is not a refund. Support handles refund requests and applicable statutory rights. Full processed refunds remove their corresponding access periods; partial refunds retain access.

Prices are fixed in supabase/functions/\_shared/billing.ts. Legacy amount environment variables are ignored. Monthly checkout checks the actual configured plan amount/currency/frequency before creating a subscription. A prepaid monthly fallback is no longer created; verified historical orders remain recoverable.

## Server-side fulfillment

Every payment must be captured (not merely authorized), match the server-owned order or paid invoice, and belong to the verified user. The atomic record_billing_payment RPC creates/links the license, hashed access token and managed-provider metadata together. Payment IDs are idempotent. Renewals preserve the existing key. Manual blocks remain blocked. Expiry cleanup retains records for renewal rather than deleting them.

All privileged billing RPCs and ledger tables are service-only. Edge Functions perform auth.getUser for account routes or HMAC validation for webhooks. Never put service-role, Razorpay or provider secrets in VITE variables. No provider secret is stored in billing reports.

Functions: create-razorpay-checkout, issue-paid-license, get-my-license, manage-billing, razorpay-webhook. Include \_shared/billing.ts and the pinned deno.json import map when deploying. verify_jwt=false is intentional because the bodies perform JWT verification themselves; the webhook verifies its signing secret.

## Live webhook setup — deferred by owner

Create one live webhook pointing to:
https://vsybqtunyuanxspxhzue.supabase.co/functions/v1/razorpay-webhook

Use the same private signing secret as Supabase RAZORPAY_WEBHOOK_SECRET. Enter it directly in both dashboards; never commit or chat it. Subscribe to payment.captured, refund.processed, subscription.activated, subscription.charged, subscription.completed, subscription.paused, subscription.updated, subscription.resumed, subscription.halted, subscription.pending, subscription.cancelled. Alert email: admin@builtbygsv.in.

No live webhook was configured when inspected. The form is prepared, but creation was explicitly deferred. Automatic delivery is not verified and remains a release gate. Read-time API reconciliation in recovery/account management supplements delivery but is not a replacement for background events.

## Customer account management

Access page -> Manage my billing -> sign in with the Google account used at checkout. View paid expiry, cancel monthly renewal through an explicit confirmation, or verify a captured pay\_ reference to repair older access. Ownership is checked server-side. Uninstalling does not cancel recurring billing.

Old records without a matching token and without payment references require verified receipt recovery or support review. Do not activate them based only on their status text. No existing key, customer record, or valid access was deleted by this migration.

## Verification and release gates

Run npm test, npm run typecheck and npm run build. Desktop scripts/billing-ui-qa.js tests the built UI with a synthetic transport; it does not cancel actual subscriptions. packaging/store/test-paid-license-lifecycle.sql runs actual provisioning/resolver/renewal/refund/role tests inside a transaction that rolls back all synthetic changes.

GET create-razorpay-checkout?verify=1 exposes only public pricing and checks the actual monthly plan. It creates no order. A real captured checkout, delivered live webhook and installed signed app still require end-to-end verification. Use Razorpay Test mode for payment testing; never charge or cancel a customer to simulate a test.

Final Store identity, certification, WACK and Store-delivered runtime checks remain separate gates. Keep the current website EXE link until a real Store product exists.
