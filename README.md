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

## Data and contact

Cloud providers receive context sent for processing. Local credentials and history are stored as JSON under `hintio-config`; the current implementation does not encrypt these files at rest. See [PRIVACY.md](PRIVACY.md) for paths and deletion behavior.

Email **admin@builtbygsv.in** · Phone / WhatsApp **+91 8438365095**

[Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

## Branches and license

`desktop` maintains the application source. `main` hosts the website. `v1.0.2` preserves the original desktop release snapshot; later contact and privacy changes are recorded on this branch.

The desktop is distributed under GPL-3.0. See [LICENSE](LICENSE).
