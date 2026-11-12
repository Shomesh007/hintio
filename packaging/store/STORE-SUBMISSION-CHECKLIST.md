# Hintio 1.0.6 â€” Store submission checklist

Prepared on 12 November 2026. This is a submission runbook, not Microsoft certification.

## Ready to copy

- App name: Hintio, subject to Microsoft reservation.
- Publisher display name: BuiltbyGSV, subject to approved identity.
- Category suggestion: Productivity. Language: en-US. Architecture: x64.
- Support: admin@builtbygsv.in / +91 8438365095.
- Privacy: https://www.hintio.tech/privacy
- Contact: https://www.hintio.tech/contact
- Getting started: https://www.hintio.tech/get-started
- Listing text, features, six search keywords and purchase disclosure: listing.en-US.json in the versioned output.
- Five PNG screenshots and captions: SCREENSHOTS.json. These show actual app components with synthetic content and a test native bridge; replace with Store-installed captures if the installed appearance differs.
- StoreTile300.png: 300 x 300 PNG.
- Capabilities: internetClient, microphone, runFullTrust. Copy the source justifications; no administrator service, driver or startup task is requested.

## Paid access

Installation is free; service access requires a valid token. Website trial access, when available, includes three sessions of up to 15 minutes each. Monthly: INR 2,049 recurring, up to 120 cycles, cancellation effective at the paid period end. Yearly: INR 14,000 prepaid for 365 days, manual renewal. Uninstall does not cancel a subscription.

No purchased paid-session quota or fixed active-session duration. Paid authorization has an eight-hour idle timeout and cannot exceed paid expiry. Trial sessions remain limited. Service-protection limits apply: 40 chat/minute, 120 speech/minute, 180 total/minute and 10,000 requests per rolling 24 hours per license. Provider and network availability applies.

Actual Razorpay Test-mode monthly/yearly captures, signed renewal and cancellation-retention checks passed. These are not real-money customer purchases. Do not repeat the old deferred-webhook/captured-payment gate.

## Microsoft-only steps

1. Complete company verification and reserve the product name.
2. Copy the exact Package/Identity/Name, Package/Identity/Publisher and PublisherDisplayName from Product identity.
3. Run npm run make:store with those public values. Never upload the validation-identity MSIX.
4. Complete availability, pricing, third-party Razorpay purchase/subscription API, generative-AI and IARC declarations from the fact sheet below; the owner reviews and submits the official declarations.
5. Supply a temporary working reviewer token privately in Partner Center. Keep the backend available and provide sufficient entitlement for review. No credential belongs in source or the public listing.
6. Run WACK on the identified submission package and preserve its full report.
7. Obtain and test a Store-delivered package with Windows security settings unchanged.
8. Publish the actual Store product link after certification and installed checks. The public 1.0.4 EXE cannot use the secure managed protocol; it is not the new release.

## Declaration facts to review

- Live generative AI: yes. Managed answers use OpenAI; speech transcription uses Groq through a Supabase-hosted gateway.
- AI answers may be inaccurate. App instructions request safe outputs; instructions alone do not guarantee every output is safe.
- Reporting opens a redaction/reviewable email draft to support; it does not automatically send a report.
- No public community feed, messaging network or user-generated-content marketplace is included.
- Not a game; English UI; not specifically designed for children. Do not invent an IARC rating from these facts.
- Context can include personal or sensitive information in user-selected audio, screenshots, documents and custom instructions. Cloud processing is optional by consent; it is not local-only.
- Website account/access services use Google sign-in and Supabase; checkout uses Razorpay. Email/password and anonymous sign-in are disabled.
- Store local records are encrypted; exported copies may be unencrypted. Verify actual Windows-protected-key persistence on the installed build.

## Store-signed test record

Record package identity, family name, version, architecture, SignatureKind=Store, Windows version and test date. Keep Windows security protections enabled.

For each item record pass/fail, reproduction steps and evidence:

- Clean install and first launch; consent unchecked initially; invalid/expired key rejects.
- Speaker, microphone, combined and no-audio modes; pause/stop/withdraw stops capture.
- GPT answer, screenshot analysis, streaming, synthetic document import and failure/retry.
- Paid expiry, trial expiry and no duplicate credit consumption. Server-side time-boundary tests are already retained; do not change the PC clock or charge a customer for QA.
- Overlay shortcuts, click-through, minimize/quit icons and narrow-window scrolling.
- History export and confirmed delete/reset; exports' privacy warning.
- Store updates, relaunch, uninstall/reset and profile isolation from EXE data.
- WACK results and CodeIntegrity events for native modules/helpers.

## Owner-deferred work

At the owner's request, historical OpenAI/Groq key replacement/revocation and separate sandbox webhook signing-secret rotation are deferred. Existing backend isolation tests passed, but the matching live/test webhook secret digests and old issued provider keys are not claimed remediated. Keep this decision visible in the security review.

## Official references

- https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements
