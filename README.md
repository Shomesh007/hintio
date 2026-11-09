# Hintio

A desktop AI assistant that uses conversation and screen context to help you prepare responses, work through technical questions, and follow meetings.

[Website](https://www.hintio.tech) · [Download Windows](https://github.com/Shomesh007/hintio/releases/download/v1.0.3/Hintio-1.0.3.Setup.exe) · [Getting started](https://www.hintio.tech/get-started) · [Contact](https://www.hintio.tech/contact)

## The product

Hintio runs as a configurable, always-on-top desktop overlay. Give it relevant context, choose what to capture, and request assistance while working in your other applications.

- **Live conversation context:** speaker output, microphone, both, or no audio, subject to platform support and permissions.
- **Screen assistance:** on-demand screen analysis, batches of up to three screenshots, and a shortcut for debugging failed-test screenshots.
- **Your working context:** resume import, custom instructions, interview domain, language, and session profiles.
- **Overlay controls:** move, show or hide, enable click-through, adjust appearance, and rebind shortcuts.
- **Session history:** review responses and session context; copy or export records from History.
- **Privacy controls:** review the data flow, restore settings, or confirm deletion of local configuration and history.
- **Direct support:** Help & Contact provides email, WhatsApp, and a copyable phone number.

The current desktop entry screen uses an access token. Provider integrations in the source include cloud processing and local inference components; their availability depends on the configured build and access. The app does not guarantee offline access or that its overlay will be hidden by every screen-sharing tool.

## Start using Hintio

1. Download the Windows installer from the link above and run the complete installer.
2. Launch Hintio and complete onboarding.
3. Enter your valid access token. Use the same Google account on the website when retrieving purchased access.
4. Set your AI context and choose audio and screen-capture settings.
5. Start a session. Open Help & Contact for the shortcuts configured on your device.

If the overlay blocks clicks, use **Ctrl+M** to toggle click-through or **Ctrl+\** to hide it on Windows. Shortcuts can be rebound. Click-through changes mouse behavior; it does not control screen-sharing visibility.

Windows is the currently linked downloadable build. macOS and Linux code paths exist, but this repository does not promise tested installers for those platforms.

## Repository layout

| Location | Contents |
| --- | --- |
| [`main`](https://github.com/Shomesh007/hintio/tree/main) | React/TypeScript website, account and access flows, public product pages |
| [`desktop`](https://github.com/Shomesh007/hintio/tree/desktop) | Maintained Electron desktop source, including contact and privacy updates |
| [`v1.0.2`](https://github.com/Shomesh007/hintio/tree/v1.0.2) | Original desktop release source snapshot |
| [Releases](https://github.com/Shomesh007/hintio/releases) | Distributed Windows installer |

The current Windows installer is `v1.0.3`, built from the maintained desktop source. The original `v1.0.2` tag and installer remain available for rollback.

## Website development

Use Node.js 22 LTS or newer supported by the dependencies, plus npm.

```sh
git clone https://github.com/Shomesh007/hintio.git
cd hintio
npm ci
```

Copy `.env.example` to `.env.local` and supply your public frontend configuration. Never place payment secrets, provider API keys, or service-role credentials in `VITE_` variables: frontend variables are public.

```sh
npm run dev
# http://localhost:3000
npm test
npm run typecheck
npm run build
```

`src/marketing/` contains the product pages and account dialogs. `src/App.tsx` coordinates sign-in, access, checkout, and downloads. Backend deployment notes are in [Website operations](docs/WEBSITE_OPERATIONS.md). Do not run deployment commands simply to preview the frontend.

For Electron development and Windows packaging, see the [desktop development guide](https://github.com/Shomesh007/hintio/blob/desktop/docs/DEVELOPMENT.md).

## Privacy and support

Cloud processing can send audio or transcripts, screenshots, resume text, and custom instructions to the configured provider. Bring-your-own-key processing is still cloud processing when the selected provider is remote. Local inference components do not make every product operation offline.

[Data handling](PRIVACY.md) · [Public privacy page](https://www.hintio.tech/privacy) · [Support](SUPPORT.md) · [Security reporting](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

Email **admin@builtbygsv.in** or call / WhatsApp **+91 8438365095**. Do not send keys, payment credentials, or private session content when requesting help.

## License

The desktop source includes its GPL-3.0 license on the desktop branch. Consult the license files applicable to the source you use; distribution of an installer does not grant separate rights to third-party services or assets.
