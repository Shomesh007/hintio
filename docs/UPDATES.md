# Windows in-app updates

This feature is staged locally in 1.0.5. Do not publish it until the installed-app upgrade test and release review are complete.

## User flow

- Updates opens from the app header and shows installed/latest versions and release notes.
- Optional updates allow continued use. Update in Hintio downloads the package without opening a browser.
- A required minimum version blocks new sessions before session credit is consumed. An existing active session is allowed to finish.
- Download status is indeterminate because the native Squirrel API does not expose reliable byte progress.
- Restart & install is available only after the native downloaded event. Active sessions must end before installation.
- Portable/dev copies and historical releases without update packages expose a trusted installer link instead.

Existing versions without this updater need one manual installation of the bootstrap release. New UI cannot be added to an already installed binary from the server.

## Release artifacts

Run `npm run make:win` on Windows. This builds the installer, verifies bundled runtimes, and prepares `out/release-upload-VERSION/` with:

- `Hintio-VERSION.Setup.exe`
- `Hintio-VERSION-full.nupkg`
- `RELEASES`
- `SHA256SUMS.txt`

Publish all four files together on the matching stable GitHub release. The preparation script checks that the full package size and SHA-1 match the Squirrel RELEASES entry; SHA-256 checksums are also generated. The app accepts only the configured official repository, strict stable versions, and expected filenames.

The current release uses Squirrel.Windows. Electron's built-in autoUpdater is used; electron-updater's NSIS path is not compatible with this installer.

## Required versions

`update-policy.json` on the desktop branch supplies `schemaVersion: 1` and `minimumSupportedVersion`. Increase the minimum only after that version's installer and update feed are published and verified. The app rejects a minimum newer than the latest published release.

A validated minimum is cached under Electron userData/updates. If checks fail offline, a previously required version remains required. A valid policy can lower the minimum back to the bundled baseline for rollback. No policy or release check starts an automatic download.

Client-side policy only controls clients containing this updater. It does not retrofit UI or enforce server-side version policy in older binaries.

## Verification before publishing

Unit tests cover version comparisons, policy/cache behavior, trusted assets, duplicate downloads, native events, retries, first-run locks, and session protection. Browser tests exercise the real view and app shell at 1080x560 and 560x420.

The remaining release check is a real Squirrel upgrade between two installed versions in an isolated Windows environment, including restart and preservation of local settings/history. Do not claim this check passed based on mocked native updater tests.

No new production policy or 1.0.5 release has been published by this implementation work. Preserve the existing releases for rollback.

## Windows trust investigation — November 10, 2026

The real Squirrel check/download/apply test succeeded, and the installed 1.0.5 ASAR matched the release. Synthetic settings/history and the real user profile were preserved. Windows Code Integrity events 3077/3033 blocked execution of both 1.0.4 and 1.0.5 under VerifiedAndReputableDesktop. Restart verification therefore remains incomplete; this is not a passing launch test.

Both the app executable and the installer are unsigned. There is no signing certificate configured on this machine. A self-signed certificate does not provide public publisher trust.

The Forge configuration now passes the same windowsSign options to both Electron Packager and the Squirrel maker. Configure a trusted signing identity using one of:

- A supported local certificate: WIN_CSC_LINK and WIN_CSC_KEY_PASSWORD. Keep both outside source control.
- Hardware/cloud signing: WIN_SIGN_WITH_PARAMS and, when required, WIN_SIGNTOOL_PATH. Follow the certificate/service provider's documented parameters; do not put secrets into shell history or logs.

Run npm run make:win:signed for a signed release. It requires signing configuration and does not permit continuing after signing errors. Debug logging is disabled for that command to avoid exposing signing parameters. This wiring does not obtain a certificate or prove the resulting signature is trusted. Verify Authenticode signatures on the packaged Windows binaries and installer/update helper, then rerun the installed launch/restart test before describing a release as signed and verified.

Changing the icon, product name, version number, or updater UI cannot supply publisher trust. Security settings were not disabled during testing.
