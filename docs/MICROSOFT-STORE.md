# Hintio Microsoft Store preparation

Status: local preparation only. The validation MSIX is unsigned, uses a validation identity, and must not be sent to users as an installable release. Microsoft signs the certified Store package. The existing website EXE is not re-signed by this workflow.

## One-time setup

1. Create/sign in to the free developer account at https://storedeveloper.microsoft.com/ and complete Microsoft's identity verification yourself.
2. Reserve an available product name. Copy Package/Identity/Name, Package/Identity/Publisher and PublisherDisplayName from Product identity exactly. If Hintio is unavailable, reserve a suitable distinct name and update the display name consistently before submission.
3. Install dependencies with `npm ci`. If your npm configuration suppresses Electron's postinstall, run `node node_modules/electron/install.js` to download the pinned runtime.
4. Run `./scripts/bootstrap-msix-sdk.ps1` from PowerShell. It downloads the pinned Microsoft Windows SDK BuildTools NuGet package to the ignored project cache and verifies its hash and the MakeAppx publisher. Existing SDK users can set `HINTIO_WINDOWS_KIT_PATH` to the x64 SDK bin directory instead. No certificate or security-policy modification is required for building.

## Build

`npm run make:store:validation` builds an unsigned validation-only MSIX, checks its archive, and writes `out/store-validation-1.0.6/` with SHA-256 checksums and a report. Microsoft MakeAppx performs semantic manifest validation; no /nv switch is used.

For the final unsigned Store submission set the following environment variables to the actual Partner Center values, then run `npm run make:store`:

```powershell
$env:HINTIO_STORE_IDENTITY_NAME = '<Package/Identity/Name>'
$env:HINTIO_STORE_PUBLISHER = '<Package/Identity/Publisher>'
$env:HINTIO_STORE_PUBLISHER_DISPLAY_NAME = '<PublisherDisplayName>'
npm run make:store
```

Output: `out/store-submission-1.0.6/`. Identity values are public metadata; do not put passwords, government ID documents, signing keys, provider keys or access tokens in the source or submission metadata. The fourth version component is reserved as zero for Store submission; increment the app version for subsequent releases.

The Store build is full-trust x64 desktop software with internetClient, microphone, and runFullTrust declarations. runFullTrust is required for Electron desktop window, shortcut, and capture APIs; it does not request administrator elevation. Explain this capability during submission. The build adds no startup task, service or driver. Screen/audio capture is user-initiated. Store builds skip Squirrel startup registration cleanup and open the Store Downloads page for updates; they do not fetch the GitHub EXE version policy.

## Data compatibility

MSIX installation files are immutable. Configuration/history use package-specific Electron userData; local models also use userData. Legacy EXE data is left alone and is not silently imported. Test exports before uninstall/reset. Clear Local Data resets the configured profile only. Store records use AES-256-GCM and an asynchronously Windows-protected key. Errors fail closed without erasing records. Legacy EXE JSON is left untouched. Exports may be unencrypted. Verify actual DPAPI persistence after Store-delivered installation.

## Submission material

`packaging/store/submission.json` contains draft listing text, contact/privacy URLs and capability explanations. Review it against the actual product and complete age ratings, availability, service pricing/access requirements, and privacy answers in Partner Center. Do not promise invisible screen sharing, offline service access, guaranteed latency, or Store approval.

Provide reviewers with a working temporary access token in Partner Center's private certification notes. Keep the backend online and provide enough test sessions to exercise capture and GPT responses. No production provider keys should be shared. This repository does not generate or embed a reviewer token.

## Verification and release gate

Automated tests cover strict identity/version metadata, Store update routing, retries/deduplication, profile isolation, GPT routing, preload boundaries, and session start failures. Browser tests cover actual UI components with stubbed native bridges; they do not prove Windows capture or installed launch.

Before release:

- Replace the validation identity with the real reservation and rebuild. Upload the resulting unsigned MSIX to the MSIX submission path in Partner Center (not the EXE/MSI URL path).
- Complete Microsoft certification, including full-trust capability review and a working reviewer account/token.
- Test the Store-delivered package on a clean Windows account with Smart App Control enabled: install, first launch, consent, access-token validation, GPT response, speaker/microphone/combined/no-audio modes, screen selection/analysis, overlay shortcuts and click-through, document import, history export/delete, settings reset, Store updates/relaunch, and uninstall.
- Run Windows App Certification Kit on the actual identified package and preserve the report. This machine currently has no WACK installation, and no WACK pass is claimed.
- Inspect CodeIntegrity events for blocked helpers/native libraries; do not assume package creation or Store signing alone proves every feature works.
- Verify profile isolation and exports across EXE and Store installations. Publish corresponding source for the released GPL build.
- Only after these checks replace website download links with the real Store product link. Do not publish a fictitious Store ID or the unsigned validation file.

No self-signed certificate, developer-mode change, application-control bypass, or root-certificate installation is part of the public installation flow.

## References

- https://learn.microsoft.com/en-us/windows/apps/dev-tools/winapp-cli/guides/electron-packaging
- https://www.electronforge.io/config/makers/msix
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements
- https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/test-your-app-with-smart-app-control

## Submission assets and additional gates

Run `npm run test:store-ui` with `HINTIO_TEST_CHROMIUM` pointing to an existing Chrome executable, then `npm run prepare:store-listing`. Output includes actual-component screenshots, captions, listing text, reviewer notes, policy matrix and a 300px tile. Native bridges are test doubles; screenshots do not establish installed runtime behavior.

Live billing policy is INR 2,049 monthly and INR 14,000 per 365 prepaid days. Atomic provisioning, renewal/refund SQL and account/cancellation UI checks passed. The website privacy and purchase disclosures are published. Live and isolated Test-mode webhooks are enabled; actual Test-mode monthly/yearly capture, signed renewal and cancellation-retention checks passed. No real-money customer payment was used. Policy review is evidence, not a guarantee of Microsoft approval.

## Paid lifecycle remediation

See packaging/store/BILLING-AUDIT.md and website docs/WEBSITE_OPERATIONS.md. Captured payments now create/link app tokens atomically; renewals retain keys; processed refunds update corresponding paid time. Price policy is INR 2,049 recurring monthly and INR 14,000 per 365 prepaid days. Account management includes explicit end-of-cycle cancellation and verified payment-reference repair. Automatic Test-mode delivery and captured payments are verified. Historical provider-key rotation and separation of live/test webhook signing secrets are owner-deferred; keep these decisions distinct from completed billing tests.

## Current submission bundle

Versioned listing materials and the step-by-step submission/Store-signed test record are generated under out/store-listing-1.0.6/. See packaging/store/STORE-SUBMISSION-CHECKLIST.md. Microsoft business verification was rechecked on 12 November: email and employment Verified, business Pending, Finish disabled. Final identity and Store submission remain gated by that review. Provider-key replacements and sandbox signing-secret separation are explicitly owner-deferred; they are not completed security checks.
