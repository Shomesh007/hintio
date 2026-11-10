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
