# Pricing flow verification — 12 November 2026

## Verified in the actual local pricing UI

- Google: real OAuth reauthorization returned to localhost:3000; account-bound yearly recovery succeeded afterwards. The browser already had a valid Google session for the initial trial and purchase checks. One login is reused across plans.
- Free trial: real claim-trial-access returned a key; its dialog and Continue to download handoff worked. No trial sessions were consumed or reset.
- Monthly: Razorpay Test-mode recurring checkout at INR 2,049 completed through the pricing UI. The real signed sandbox fulfillment delivered a monthly HINTIO-TEST key. Recovery without a second payment passed after the timeout fix. Database ownership is Google-backed and the sandbox subscription is active.
- Yearly: Razorpay Test-mode one-time INR 14,000 checkout completed. Key delivery and recovery passed. The existing sandbox yearly license retained its key and added 365 days to its prior paid expiry; no subscription was created.
- Production and sandbox paid checkout endpoints and real trial claiming all rejected anonymous requests with HTTP 401.
- Download: UI trial continuation opened the stable 1.0.4 installer URL. A complete streamed download was 242,016,256 bytes and SHA-256 6d19663e17895936b7a99458c4759a21c7fc2b1f46fbb29635cbb2e9ea4871ef, matching GitHub's published digest. No duplicate installer was saved.
- The real paying customer's allowance, expiry and usage were not changed; usage remained 19.

## Fix found by the flow test

An eight-second license lookup left insufficient margin for provider reconciliation (one observed server duration was 7,688 ms before network overhead). License lookup now has a separate bounded 30-second deadline at both the retry helper and SDK layers. Checkout's shorter deadlines remain unchanged. Recovery is nonblocking, backs off, and aborts on unmount. Regression coverage includes a successful twelve-second lookup and a stalled thirty-second request.

## Safe local payment testing

Set VITE_BILLING_TEST_MODE=true only in the dev server process, then run npm run dev and open http://localhost:3000/pricing. A visible banner identifies Test Mode. Only paid checkout, issuance, recovery and billing requests route to the existing isolated test handlers. Trial claiming and Google Auth remain real. The flag cannot enable sandbox routing in a production build. Test-mode keys cannot unlock production desktop access.

Use Razorpay's documented domestic subscription test card 4718 6091 0820 4366, any future expiry and dummy CVV. The generic 4111 card was rejected for subscriptions and for international-card acceptance on this account. Leave optional card saving unchecked. The card-saving OTP is separate from a mock payment authentication screen; do not use real card details or bank OTPs. The human owner completed payment submissions.

Source: https://razorpay.com/docs/payments/subscriptions/test/

No real payments, real customer session starts, new provider keys, billing configuration changes or Windows installation tests were performed. Windows publisher trust still depends on the Microsoft Store release.
