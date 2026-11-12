# Changelog

## 2026-11-12 — Pricing page

- Added `/pricing` with ₹0 free trial, ₹2,049 monthly and ₹14,000 yearly options.
- The header Download button now opens pricing; existing-key downloads remain direct and stay on Windows 1.0.4.
- Kept trial claiming, selected-plan checkout, key recovery and billing management connected to their existing flows. `/access` remains supported.
- Refined the navy, off-white and lime design with responsive plan surfaces and clear renewal/installation disclosures.

## Paid access lifecycle — 2026-11-10

- Deploy atomic captured-payment provisioning for licenses, hashed app tokens and provider metadata.
- Add idempotent renewal/refund handling, preserve keys and paid periods, and retain expired token identity.
- Fix yearly checkout at INR 14,000 for 365 prepaid days; retain monthly INR 2,049 recurring pricing.
- Add authenticated billing management, end-of-cycle cancellation confirmation and payment-proof recovery.
- Prevent stale purchase intents during billing sign-in and duplicate active monthly purchases.
- Live webhook setup is prepared but deferred by the owner; automatic event delivery remains unverified.

## 1.0.4 — provider routing fix

- Keep GPT sessions on OpenAI instead of silently falling back to Gemini.
- Correct quota and rate-limit messages and respect key cooldowns.
- Update the Windows installer link after live GPT verification.

## 1.0.3 — 2026-11-10

- Packaged the maintained desktop support and privacy updates as a distinct Windows release.
- Updated the website Windows download to the versioned 1.0.3 installer.
- Kept the previous installer available for rollback.

## 2026-11-10

### Desktop 1.0.2 installer refresh

- Updated support to admin@builtbygsv.in and +91 8438365095.
- Added Help & Contact actions for email, WhatsApp, and copying the phone number.
- Updated expired-access support links.
- Explained capture, provider processing, local records, and the limits of local deletion.
- Added explicit confirmation for restoring settings and deleting local data.
- Published the refreshed Windows installer under the existing v1.0.2 release.

The release tag remains the original source snapshot. The `desktop` branch records the subsequent contact and privacy source updates.

### Website

- Added a dedicated Contact page and clearer public privacy and data information.
- Connected direct support links across product pages.
- Updated the Windows download to the refreshed installer.

### Repository documentation

- Replaced the website-only introduction with a product overview and branch guide.
- Added privacy, support, security-reporting, and contributing references.
- Separated website operations from first-time product and developer setup.

Dates describe recorded project work; they do not imply that live payment or provider integrations were retested for this documentation update.
