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

Legacy EXE profiles use unencrypted JSON. Store builds encrypt configuration, credentials and history with AES-256-GCM, a random nonce per record and a Windows DPAPI-protected key. Missing protection or authentication errors fail closed. DPAPI protects against other Windows accounts, not every program running as the same user. Exports may be unencrypted. History can contain responses, transcripts and screen analyses. Installed Windows protection verification remains a release check.

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

## Consent withdrawal and AI reporting

Cloud consent is required before session initialization and credit consumption. Withdraw it in Settings > Privacy & Data or use Stop & withdraw consent during a live session. Withdrawal stops the session, retains records and returns to onboarding; it does not retract already-sent provider data.

AI responses are labelled and can be inaccurate. Reporting and feedback prepare an email draft to admin@builtbygsv.in. Review and redact response excerpts before sending. Opening a draft does not submit a report. Never include access tokens, provider keys or private third-party content.

## Managed gateway (1.0.6)

Managed context passes through Hintio’s Supabase-hosted gateway to OpenAI for answers and Groq for transcription. This can include selected audio, transcripts, screenshots and supplied document context. Company provider keys stay server-side. Gateway code stores session hashes and access/rate counters, not request content. Infrastructure and AI providers process requests under their own terms. Google sign-in remains enabled; unused email/password and anonymous sign-in are disabled.
