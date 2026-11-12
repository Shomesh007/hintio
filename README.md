# Hintio desktop

A configurable Electron overlay that uses audio and screen context to assist with responses, technical questions, and meetings.

[Website](https://www.hintio.tech) · [Windows installer](https://github.com/Shomesh007/hintio/releases/download/v1.0.4/Hintio-1.0.4.Setup.exe) · [Development](docs/DEVELOPMENT.md) · [Support](SUPPORT.md)

## What is included

- Speaker, microphone, combined, or no-audio session modes, subject to platform support.
- Screen analysis, multi-screenshot context, and failed-test screenshot assistance.
- Resume context, custom instructions, session profiles, interview domain, and language settings.
- A movable overlay with visibility, click-through, appearance, and shortcut controls.
- Session history with copy and export actions.
- Help & Contact with email, WhatsApp, and phone copying.
- Privacy & Data information and confirmed controls for restoring settings or deleting local data.

The entry screen currently uses an access token. Provider and local-inference components are configuration-dependent; the app does not promise fully offline access or universal invisibility in screen sharing.

## Get started

Install the complete Windows installer, launch Hintio, finish onboarding, and enter a valid access token. Set your capture modes and AI context before starting a session.

On Windows, Ctrl+M toggles click-through and Ctrl+\ toggles visibility. Open Help & Contact for your configured shortcuts. Click-through controls mouse behavior, not screen-sharing visibility.

## Develop and package

```sh
npm ci
npm start
npm test
npm run typecheck
npm run make:win
```

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for prerequisites, source layout, packaging outputs, and clean-machine verification. The current implementation is JavaScript, Electron, and Lit. `typecheck` performs JavaScript syntax checks.

## Update notifications (staged in 1.0.5)

The local 1.0.5 build shows optional/required update notices and opens the official Windows installer in your browser. It does not download, apply, or restart itself. It is not published yet. See [the update guide](docs/UPDATES.md) for policy controls, verification, and Windows trust limitations.

## Microsoft Store preparation

A separate unsigned MSIX workflow is available for Microsoft Store certification. Run `npm run make:store:validation` to check packaging with a clearly marked validation identity. Final submission requires the identity reserved in Partner Center; `npm run make:store` fails without it. Store builds use Store-managed updates and package-specific writable storage. See [the Store guide](docs/MICROSOFT-STORE.md) for setup, reviewer notes, and remaining installed-runtime checks. The validation package is not a public installer.

## Data and contact

Cloud providers receive context sent for processing. Store builds encrypt credentials, configuration and history using AES-256-GCM and a Windows-protected key. Legacy EXE profiles remain JSON; exports may be unencrypted. See [PRIVACY.md](PRIVACY.md) for paths and deletion behavior.

Email **admin@builtbygsv.in** · Phone / WhatsApp **+91 8438365095**

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

## Branches and license

`desktop` maintains the application source. `main` hosts the website. `v1.0.2` preserves the original desktop release snapshot; later contact and privacy changes are recorded on this branch.

The desktop is distributed under GPL-3.0. See [LICENSE](LICENSE).

## Paid access lifecycle

Paid checkout now provisions licenses and hashed app access tokens atomically. Renewals retain keys and paid time; account management supports end-of-cycle monthly cancellation and captured-payment proof recovery. Live policy: INR 2,049 monthly or INR 14,000 per 365 prepaid days. See [billing audit](packaging/store/BILLING-AUDIT.md). Live and isolated Test-mode webhooks are enabled. Actual monthly/yearly Test-mode captures, signed renewal delivery, key recovery and cancellation retention are verified. The 12 November renewal fix uses the paid invoice period and is deployed server-side; no desktop update is required. See [Razorpay verification](packaging/store/RAZORPAY-SANDBOX.md). Store certification and signed installed-runtime checks remain pending.

## Managed runtime security (1.0.6)

Managed GPT and speech use a scoped, revocable server-side gateway. Company provider keys are no longer delivered to the app. Legacy versions receive an update-required response; public 1.0.4 is incompatible. The unsigned 1.0.6 Store candidate is prepared, not published. See [security review](packaging/store/SECURITY-REVIEW.md) for tests, key rotation and remaining gates.
