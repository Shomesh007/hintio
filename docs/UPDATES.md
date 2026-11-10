# Windows update notifications

This feature is staged locally in 1.0.5. No new release or production policy has been published.

## User flow

- Updates in the header shows installed/latest versions and release notes.
- Download latest version opens the official GitHub installer URL in the default browser. Hintio does not download, apply, or restart itself.
- Finish the active session, close Hintio, run the downloaded installer, then reopen Hintio. The installer preserves existing local settings/history.
- Optional updates allow continued use. A required minimum blocks new sessions before credit is consumed; an active session may finish.
- Failed checks or browser launches show a retryable error. No metadata check automatically opens a browser.
- The main process constructs the installer URL from strict stable versions and expected asset names in the official repository. Renderer-provided URLs and release asset redirect URLs are not trusted.

Older installed binaries need a manual installation to gain the new notices.

## Release artifacts

Run `npm run make:win` on Windows. This verifies the packaged runtimes and prepares `out/release-manual-VERSION/` with `Hintio-VERSION.Setup.exe`, `SHA256SUMS.txt`, and a local build report. Publish the installer and checksum only after release review. Squirrel remains the installer format; its internally generated packages are not consumed by Hintio as an update feed. Earlier installers and reports remain available for rollback.

## Required versions

`update-policy.json` on the desktop branch supplies `schemaVersion: 1` and `minimumSupportedVersion`. Raise the minimum only after that version's installer is published and verified. The app rejects a minimum newer than the latest stable release.

A validated minimum is cached under Electron userData/updates. A previously required version remains required offline. A valid policy may lower the minimum back to the bundled baseline for rollback. This client-side policy cannot retrofit notices or enforce policy on older binaries.

## Verification

Unit tests cover version validation, canonical installer URLs, policy/cache behavior, duplicate link clicks, browser failures/retries, and session protection. Browser tests exercise the real view and app shell at 1080x560 and 560x420. These tests use a browser-launch bridge stub and do not prove an installed executable can launch under Windows application control.

Removing the native updater does not resolve the unsigned-binary trust failure below. The rebuilt manual-download version still needs a successful installed launch on a compatible Windows test machine before it can be described as runtime verified.

## Windows trust investigation — November 10, 2026

The real Squirrel check/download/apply test succeeded, and the installed 1.0.5 ASAR matched the release. Synthetic settings/history and the real user profile were preserved. Windows Code Integrity events 3077/3033 blocked execution of both 1.0.4 and 1.0.5 under VerifiedAndReputableDesktop. Restart verification therefore remains incomplete; this is not a passing launch test.

Both the app executable and the installer are unsigned. There is no signing certificate configured on this machine. A self-signed certificate does not provide public publisher trust.

The Forge configuration now passes the same windowsSign options to both Electron Packager and the Squirrel maker. Configure a trusted signing identity using one of:

- A supported local certificate: WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD. Keep both outside source control.
- Hardware/cloud signing: WIN_SIGN_WITH_PARAMS and, when required, WIN_SIGNTOOL_PATH. Follow the certificate/service provider's documented parameters; do not put secrets into shell history or logs.

Run npm run make:win:signed for a signed release. It requires signing configuration and does not permit continuing after signing errors. Debug logging is disabled for that command to avoid exposing signing parameters. This wiring does not obtain a certificate or prove the resulting signature is trusted. Verify Authenticode signatures on the packaged Windows binaries and installer/update helper, then rerun the installed launch/restart test before describing a release as signed and verified.

Changing the icon, product name, version number, or updater UI cannot supply publisher trust. Security settings were not disabled during testing.
