# Temporary 1.0.4 trial credential isolation

Status: implementation and local tests prepared on 12 November 2026. NOT deployed or enabled until dedicated provider credentials and provider-side settings are verified. Production public release is 1.0.4. The 1.0.6-preview.1 prerelease remains test-only.

## Ownership and compatibility

This work owns both resolve-provider-secrets source copies, the shared trialCredentials helper and resolver routing tests. It does not change managed-runtime, the new claim-trial-access endpoint, account/IP/browser eligibility, paid entitlements, paid provider credentials, or 1.0.6 binaries. The main chat handed off resolver ownership from deployed v18 and desktop commit 412a014.

Eligible three_usage/free_download trials receive only dedicated trial credentials. They cannot use row keys, company environment keys, BYOK keys or the old free_download template fallback. Paid paths continue their previous selection without consulting trial configuration. No extra provider hop is added to chat or transcription. All company administration credentials remain server-only.

## Server-only configuration

Set these in Supabase Edge Function Secrets, never in VITE\_ or client configuration and never in chat:

- HINTIO_TRIAL_OPENAI_API_KEY: one restricted trial project credential.
- HINTIO_TRIAL_GROQ_API_KEY: one restricted trial project credential.
- HINTIO_TRIAL_OPENAI_KEY_EXPIRES_AT: timezone-qualified ISO expiry from the provider.
- HINTIO_TRIAL_GROQ_KEY_EXPIRES_AT: timezone-qualified ISO expiry from the provider.
- HINTIO_TRIAL_OPENAI_MODEL: optional; defaults to the currently verified gpt-5.6-luna.

The guard requires both keys, rejects multi-key lists and known paid-key reuse, and requires each configured expiry to leave at least 16 minutes and no more than 24 hours. This allows the existing full 15-minute trial plus a startup buffer. Rotate before less than 16 minutes remain. Do not revoke a retiring key until its active trial sessions have finished, unless responding to actual compromise. A replacement trial pair must be provider-tested before saving and enabling it. There is no automated key-renewal system in this change.

These expiry fields stop future issuance by Hintio. They DO NOT revoke or expire copied keys at the provider. Match them to independently verified provider-side expiration/revocation; do not treat the local guard as proof of vendor enforcement. Groq native expiry and automated management still require dashboard verification.

## Provider settings checklist

1. OpenAI: create a separate empty trial project. Create a project service-account/model-request key with only the needed Chat Completions request permission. Permit the tested trial model, exclude unrelated endpoints/resources, and set a native expiration. Configure project request/token limits and a provider-enforced hard monthly spend limit, with alerts before it. Select the budget with the owner. Native expiry and hard-limit rejection must be tested; budget accounting may permit some overshoot.
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
