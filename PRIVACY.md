# Privacy & data handling

This is a technical description of the implemented data flow, not a promise about third-party retention or a replacement for the [public privacy information](https://www.hintio.tech/privacy).

## Session context

Depending on your settings, Hintio can capture speaker output, microphone audio, screen images, resume text, and custom instructions. Only capture material you have permission to use. Choose No Audio for screenshot-only sessions.

Cloud providers can receive audio or transcripts, screenshots, resume text, and custom instructions included in requests. BYOK uses your selected provider and key; it does not keep remote processing on your computer. Local mode components use Ollama and on-device transcription after setup. Access validation, model downloads, and other connected services may still require internet access. Availability depends on your build and configuration.

## Local desktop records

The desktop stores configuration, credentials, preferences, shortcuts, and history under `hintio-config`:

| OS      | Folder                                        |
| ------- | --------------------------------------------- |
| Windows | `%USERPROFILE%/AppData/Roaming/hintio-config` |
| macOS   | `~/Library/Application Support/hintio-config` |
| Linux   | `~/.config/hintio-config`                     |

The current storage implementation writes JSON files. It does **not** implement encrypted-at-rest storage for these files. Protect your user account, backups, and disk accordingly. History can include responses, transcripts, and screen analyses. Exported records are separate copies.

## Data controls

In Settings → Privacy & Data:

- **Restore settings** resets preferences, shortcuts, resume text, and custom instructions. Session history is retained.
- **Delete local data** requires confirmation, resets the entire Hintio configuration folder including credentials and history, and closes the app.

Deleting local records does not delete exports or records held by AI, authentication, or payment providers. Their retention and processing terms apply separately.

## Website and access

The website uses Google sign-in through its authentication service and Razorpay for checkout. Pending payment recovery stores the selected plan and payment reference locally; it does not store the access key, payment signature, or login credentials in that recovery reminder. A closed browser cannot continue checking delivery.

## Questions and requests

Email **admin@builtbygsv.in** or contact **+91 8438365095**. Describe whether the request concerns desktop records, website access, or a connected provider. Do not attach private session content or credentials.

## Microsoft Store build

Store builds configure the settings/history root as `hintio-config` under Electron `app.getPath('userData')`. Windows may virtualize this path under the app package's per-user data. The package installation directory is read-only and is not used for mutable settings, credentials, or model downloads. First Store launch uses a separate profile; existing EXE settings/history are not automatically imported or deleted. Keep an export before uninstalling either distribution. Windows manages packaged app data during uninstall/reset.

First-run onboarding explains cloud processing and requires affirmative acknowledgement before completion. Stopping a session stops capture; No Audio limits audio collection, and the app's screen-capture controls limit screenshot context. Local model downloads and access validation may still use the network.
