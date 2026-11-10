# Changelog

## Paid access lifecycle — 2026-11-10

- Deploy atomic captured-payment provisioning for licenses, hashed app tokens and provider metadata.
- Add idempotent renewal/refund handling, preserve keys and paid periods, and retain expired token identity.
- Fix yearly checkout at INR 14,000 for 365 prepaid days; retain monthly INR 2,049 recurring pricing.
- Add authenticated billing management, end-of-cycle cancellation confirmation and payment-proof recovery.
- Resolve company speech configuration for paid keys, validate providers before credit consumption and cap active-session metadata at paid expiry.
- Prevent stale purchase intents during billing sign-in and duplicate active monthly purchases.
- Live webhook setup is prepared but deferred by the owner; automatic event delivery remains unverified.

## Microsoft Store preparation — local, not submitted

- Encrypt Store records with AES-256-GCM and a Windows-protected key; fail closed without erasing corrupt records.
- Require cloud consent before session initialization and support live withdrawal.
- Add AI disclosure, reporting/feedback email drafts and provider safety instructions.
- Restore ordinary taskbar/minimize behavior; remove aggressive window reassertion and silent erase shortcuts.
- Stop separate microphone tracks and close their audio context on capture shutdown; add a regression test.
- Test actual PDF/DOCX imports, fix small-PDF parsing, remove remote fonts and tighten script CSP.
- Update production dependencies and prepare Store listing evidence with explicit release gates.

- Add an unsigned x64 MSIX build with strict Partner Center identity validation and separate validation artifacts.
- Route Store updates to Microsoft Store and exclude the EXE release policy from Store sessions.
- Use package-specific writable settings/history storage and leave legacy EXE data untouched.
- Add cloud-data disclosure and affirmative consent to first-run onboarding; correct unsupported invisibility claims.
- Update Electron from 30.5.1 to 45.2.3; installed runtime and capture verification remain pending Store signing.
- Verify package contents, source correspondence, runtime dependencies, and absence of development/private files.

## 1.0.5 — staged locally, not published

- Add an Updates screen with optional and required version states.
- Replace network-dependent icon labels throughout the UI with shared offline SVG icons.
- Open the official installer in the browser; remove native in-app download, installation, and automatic restart actions.
- Gate unsupported versions before session credit consumption.
- Prepare the manual Windows installer with SHA-256 checksums.
- Share fail-fast signing configuration between app packaging and the installer.
- Cache required-version policy, support retries, and keep update controls visible in small windows.

## 1.0.4 — provider routing fix

- Updated the managed resolver to return configured OpenAI credentials and non-secret configuration diagnostics. An OpenAI server secret is required.
- Keep GPT sessions on OpenAI instead of silently selecting Gemini when credentials are absent or a request fails.
- Honor key cooldowns and distinguish quota/billing failures from temporary request limits.
- Add provider-routing and resolver regression tests.

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
