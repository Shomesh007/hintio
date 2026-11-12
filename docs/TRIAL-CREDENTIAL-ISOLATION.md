# Temporary 1.0.4 trial credential isolation

Status: ACTIVE on 12 November 2026. Resolver v24 routes eligible 1.0.4 trials to isolated, expiring provider credentials after live verification. Production public release is 1.0.4. The 1.0.6-preview.1 prerelease remains test-only.

## Ownership and compatibility

This work owns both resolve-provider-secrets source copies, the shared trialCredentials helper and resolver routing tests. It does not change managed-runtime, the new claim-trial-access endpoint, account/IP/browser eligibility, paid entitlements, paid provider credentials, or 1.0.6 binaries. The main chat handed off resolver ownership from deployed v18 and desktop commit 412a014.

Eligible three_usage/free_download trials receive only dedicated trial credentials. They cannot use row keys, company environment keys, BYOK keys or the old free_download template fallback. Paid paths continue their previous selection without consulting trial configuration. No extra provider hop is added to chat or transcription. All company administration credentials remain server-only.

## Server-only configuration

Set these in Supabase Edge Function Secrets, never in VITE\_ or client configuration and never in chat:

- HINTIO_TRIAL_OPENAI_API_KEY: one restricted trial project credential.
- HINTIO_TRIAL_GROQ_API_KEY: one restricted trial project credential.
- HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: timezone-qualified ISO issuance cutoff at or before the verified provider expiry.
- HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT: timezone-qualified ISO issuance cutoff at or before the verified provider expiry.
- HINTIO_TRIAL_OPENAI_MODEL: optional; defaults to the currently verified gpt-6-luna.

The guard requires both keys, rejects multi-key lists and known paid-key reuse, and requires each configured expiry to leave at least 16 minutes and no more than seven days. This allows the existing full 15-minute trial plus a startup buffer. Rotate before less than 16 minutes remain. Do not revoke a retiring key until its active trial sessions have finished, unless responding to actual compromise. A replacement trial pair must be provider-tested before saving and enabling it. The owner approved a seven-day pilot with manual weekly replacement on 12 November 2026. There is no automated key-renewal system in this change. Provider keys must be replaced before expiry to preserve trial availability.

These expiry fields stop future issuance by Hintio. They DO NOT revoke or expire copied keys at the provider. Set them at or before independently verified provider-side expiration/revocation; do not treat the local guard as proof of vendor enforcement. Where the dashboard exposes only a date, use a deliberately earlier cutoff and record both values. Groq native expiry options were observed in the dashboard (7/30/60/90 days and Custom). The generated Groq key was verified in the trial project with native expiry 19 November 2026; no exact time was exposed by the table or edit dialog. Its conservative server issuance cutoff is 2026-11-18T00:00:00Z (18 November, 05:30 IST), deliberately earlier than the native date. Automated Groq key management is not verified.

## Provider settings checklist

1. OpenAI: create a separate empty trial project. Create a project service-account/model-request key with only the needed Chat Completions request permission. Permit the tested trial model, exclude unrelated endpoints/resources, and set a native expiration. Configure project request/token limits and verify native expiry. The owner approved a US$5 monthly target, but this account shows Spend limit unavailable; no guaranteed dollar cutoff is configured. After disclosure, the owner explicitly approved a bounded seven-day pilot on existing organisation credits. Do not claim a hard spending cap or test one by spending funds. Restrict the project to gpt-6-luna, 30 RPM, 100,000 TPM and 10 IPM; Standard tier and service-account keys only.
2. Groq: create a dedicated trial project and key, allow only models actually required by the 1.0.4 paths being offered, and set conservative project rate/audio quotas after measuring the baseline. Speech uses whisper-large-v3-turbo; verify any optional ancillary flow before restricting it. Confirm native key expiry/revocation in the dashboard.
3. Groq billing limits apply organization-wide with 10-15 minute accounting delay. A project alone does not isolate trial billing cutoff or the organization quota from paid traffic. Prefer a distinct trial organization/billing boundary if available under the owner's account. Do not reduce the paid organization's budget or quota as part of trial setup. If independent isolation is unavailable, disclose the remaining shared organization risk before enabling trials.
4. Record only project/key IDs, restrictions, expiry times and redacted test results. Never save raw keys in reports.

Official references verified 12 November 2026:

- https://developers.openai.com/api/docs/guides/api-keys
- https://developers.openai.com/api/reference/resources/admin/subresources/organization/subresources/projects/subresources/api_keys/methods/update
- https://developers.openai.com/api/docs/guides/spend-limits
- https://console.groq.com/docs/projects
- https://console.groq.com/docs/model-permissions
- https://console.groq.com/docs/spend-limits

## Activation gate and rollback

Do not deploy the fail-closed selector until provider setup is complete unless the owner explicitly wants trial starts suspended while setup is pending. Without the dedicated keys/expiry, trial starts return TRIAL_CREDENTIALS_UNAVAILABLE before consuming a credit; paid starts are unaffected. Before activation save the deployed v18 resolver for rollback. Deploy the helper with the resolver and pinned deno.json map, then test isolated trial first/third/fourth starts, expiry, missing configuration, actual GPT and speech, paid starts, and new gateway clients. Use QA fixtures only; do not consume a real customer's sessions.

Restoring v18 re-enables historical shared-key trial behaviour, so it is not a security-neutral rollback. Prefer keeping dedicated credentials configured and fixing the isolated path. Turning off trial issuance stops new distribution but cannot revoke a key already received. Historical company credentials previously returned to trial clients require a separately coordinated vendor rotation if the owner wants those copies invalidated; this change does not silently rotate paid credentials.

No promise is made that direct-to-provider 1.0.4 can prevent all outside use. Isolation, native key expiry, model restrictions and provider-side limits contain its scope and lifetime. The Store gateway remains the stronger long-term design.

## Pilot credential handling

An initial Groq key display was accidentally captured in the local UI proof screenshot and this chat. The local screenshot was deleted with owner approval. The owner explicitly instructed that the existing key must not be revoked or replaced. Preserve that decision and record the residual exposure: a copied key can still use the restricted project until native expiry, subject to provider caps. Do not describe this as a restored secret or complete prevention of outside use. No paid provider credentials were rotated or changed by this setup.

## Activation verification - 12 November 2026

Resolver v24 was deployed with the shared helper and explicit pinned import map. Both provider key names and both cutoff names were verified as saved in Supabase. OpenAI native expiry is 2026-11-19T16:06:22Z (19 November, 21:36:22 IST); its key has only api.model.chat_completions.request permission. The effective trial issuance cutoff is the earlier Groq server cutoff, 2026-11-18T00:00:00Z. New starts stop when less than sixteen minutes remain. Replace the trial credentials and verified cutoffs before that point to keep trials available.

Live checks passed using the actual released 1.0.4 resolver consumer and image request builder: three trial starts, fourth start refused; fifteen-minute sessions; GPT-6 Luna chat; synthetic speech recognition; synthetic screen verification code read with medium reasoning; OpenAI files endpoint denied (401); a currently supported Groq chat model denied (403); trial and paid credentials distinct; paid QA start preserved. No image-generation or Files permission is needed for screenshot input sent through Chat Completions. Expired/missing/malformed configuration and no-credit-consumption failures were verified locally rather than changing live provider expiry or draining quotas.

The real customer remained active with unchanged expiry, allowance and usage count (19). Both synthetic QA tokens were blocked after testing; their no-password synthetic account was banned. No customer sessions were consumed. Full verification: 78 desktop tests, 125 website tests, 63 resolver scenarios, strict helper type check and JavaScript syntax checks. Provider quota exhaustion and future native expiry have not been forced in production.
