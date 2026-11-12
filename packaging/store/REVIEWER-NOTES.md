# Hintio Store reviewer notes — 1.0.6 candidate

Do not submit the validation package. Microsoft business verification and reserved identity remain required. Supply a temporary working reviewer license privately in Partner Center; never commit tokens or provider keys.

1. Install the Store-identified x64 package with Windows security settings enabled.
2. Read onboarding, grant cloud consent and enter the supplied reviewer license.
3. Test speaker, microphone, combined and no-audio modes with authorized synthetic content. Stopping and withdrawing consent must stop capture.
4. Import synthetic PDF/DOCX context; test GPT answers, screenshot analysis, AI disclosure, report-email draft, history and export.
5. Check minimize, overlay visibility, click-through, shortcuts and small-window layouts. Screen-share exclusion is not guaranteed.
6. Withdraw/regrant consent; inspect local reset/delete confirmations and exports.
7. Test Store updates, restart, clean installation and uninstall/reset.

Full-trust Electron runs user-level window, screen/audio, shortcut and optional local-model APIs. It adds no administrator service or driver. Microphone is used only in selected modes. Managed context passes through Supabase to OpenAI/Groq; provider keys stay server-side. Gateway code stores hashes/counters, not request content.

Store records use AES-256-GCM with a Windows-protected key. Same-user programs are not isolated by DPAPI; exports may be unencrypted. Verify actual Store-delivered persistence.

Installation is free. External Razorpay service access: INR 2,049/month renewing until cancelled, or INR 14,000 per 365 prepaid days without automatic renewal. Both webhooks and actual Test-mode monthly/yearly capture, signed renewal and cancellation-retention checks passed; no customer funds were used.

Declare generative AI and capabilities in Partner Center. Complete IARC from actual facts; no rating or Microsoft approval is assumed. Support: admin@builtbygsv.in, +91 8438365095.

74 desktop tests, 99 website tests, strict gateway compilation, zero-vulnerability npm audits, SQL rollback tests and live managed GPT/streaming/speech/public-logo vision passed. WACK and Store-signed install/capture/update/restart/uninstall remain pending. See [security review](SECURITY-REVIEW.md) for owner key rotation, secure-client distribution gates. Public 1.0.4 cannot use the secure protocol. Never distribute a validation-identity unsigned MSIX as trusted.
