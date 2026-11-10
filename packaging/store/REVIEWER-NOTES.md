# Hintio reviewer notes (draft)

Do not submit this draft until the listed gates are resolved. Do not put tokens or provider keys in this repository.

## Access and test path

Supply a temporary working access token privately in Partner Center certification notes. Backend owners must provide enough entitlement and keep the managed GPT endpoint available during review. No reviewer credential has been generated or verified by this preparation.

1. Install the Store-identified x64 package; leave Windows security settings enabled.
2. Read onboarding and grant cloud consent. Enter the reviewer token on Home.
3. Test speaker, microphone, combined and no-audio modes using authorized synthetic content. Confirm stopping and withdrawing consent stops capture.
4. Add the supplied synthetic PDF/DOCX under AI Context. Ask a question and check GPT response, AI disclosure, report-email draft, history and export. Reporting opens a reviewable draft; it does not auto-send.
5. Check taskbar/minimize, overlay visibility/click-through, shortcuts and small-window layouts. Screen-share exclusion varies by capture tool and is not guaranteed.
6. In Privacy & Data, withdraw/regrant consent; inspect reset/delete confirmations and local export behavior. Store records are encrypted; exports may not be.
7. Test Store updates/relaunch and uninstall/reset. Store builds do not use the EXE update service.

## Capabilities and privacy

Full-trust Electron uses ordinary user-level native desktop window, shortcut, screen/audio capture and local-model APIs; no administrator elevation, service or driver is added. Microphone access is used only in selected microphone-enabled modes. Internet is needed for access validation, cloud AI and optional model downloads. Store userData is separate from legacy EXE JSON.

The Store profile encrypts configuration, credentials and history with AES-256-GCM and a Windows-protected key. Protection failures stop startup. Windows DPAPI does not isolate every program running under the same user. Confirm actual persistence on a Store-delivered build.

## Paid access and declarations

Installation is free; service use is paid. Deployed prices: INR 2,049/month and INR 14,000 per 365 prepaid days. Live Razorpay plan observed on 2026-11-10: Hintio Pro, INR 2,049 once a month. Owner confirmed keeping INR 2,049/month. Live backend pricing and account/cancellation UI are verified. Finish the deferred live webhook setup and an actual Razorpay Test-mode captured checkout before submission.

Declare live generative AI in Partner Center and listing metadata. Complete the official IARC questionnaire yourself from verified facts; no age rating is assigned here. This is an English UI, not a game, not targeted at children, with no public community feed. AI can produce variable content: assess the actual output and report handling rather than treating instructions as a guarantee.

## Remaining evidence

Browser screenshots show actual components with test-only native bridges and synthetic data. They do not prove native capture, real GPT success, payment, email delivery or installed updates. WACK is not installed/running here. Validation MSIX is unsigned with a validation identity: do not distribute it to users. Real identity, certification, signed installation and end-to-end checks remain mandatory.

## Billing verification update

Atomic provisioning and real resolver/credit, renewal, cancellation-retention, refund, expiry and service-role tests passed with synthetic database changes rolled back. The account UI passed browser interaction checks with a test transport. Owner deferred live webhook creation; automatic event delivery is not verified. Two legacy records need payment proof. A real captured Test-mode checkout remains pending. Do not present these simulated tests as a real customer payment or cancellation.

Live provider smoke checks returned HTTP 200 from the configured GPT model and from synthetic speech transcription. QA access was disabled afterward. These checks do not replace native installed capture or a captured payment test.
