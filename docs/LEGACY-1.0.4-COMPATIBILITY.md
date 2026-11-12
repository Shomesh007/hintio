# Hintio 1.0.4 compatibility incident

Current public policy now covers paid and claimed-trial access; see [production release policy](PRODUCTION-RELEASE.md). The following records the initial single-customer recovery before that broader rollout.

Enabled 12 November 2026 with explicit owner approval. No replacement installer published.

Retiring the old resolver before a usable signed replacement was available caused 1.0.4 to show "Unable to validate access token". The paid license remained active. Windows Smart App Control is a separate installer-trust issue.

Resolver v16 restores the released contract only for service-owned opt-in on an active, unexpired, managed customer paid-monthly license. Exactly one real customer is opted in, through their original expiry: 7 December 2026, 21:20:03 IST. Key, allowance, expiry and usage are unchanged; usage remained 18 after testing. Earlier plan metadata normalization from monthly_full to paid_monthly preserved the old label.

Required metadata: legacyDesktopCompatibility="1.0.4" and legacyDesktopCompatibilityUntil no later than paid expiry. RLS is enabled and only service_role can modify provider_secrets. Eligibility is rechecked after atomic consumption. The exact public key shipped in 1.0.4 and server anon key are accepted. Durable auth/start limits remain; no internal bypass. Preflight allowlists nonsecret status fields. Missing provider configuration consumes no credit.

## Approved limitation

The old client's main process receives one canonical OpenAI key and one Groq key; no Gemini, Azure, cloud or service-role credentials. Copied provider keys bypass gateway quotas and remain usable until revoked at the vendors. The bounded UI timer cannot enforce vendor-side expiry. Removing the exception stops future issuance only. These limitations were disclosed and approved. New clients continue using managed-runtime without receiving provider keys.

## Evidence

- 74 desktop tests passed, including 41 isolated resolver checks.
- Actual released commit 8f85d84 resolver and key parser accepted the mock and deployed responses.
- Live preflight returned no provider credentials; invalid and unflagged keys were denied.
- An isolated QA key consumed exactly one QA session, obtained a real gpt-5.6-luna response and transcribed synthetic audio with Groq.
- QA key blocked and its opt-in removed afterward. Only the real customer remains opted in.
- 99 website tests passed; 74 JavaScript files passed syntax checks.

Reports and v15 rollback source: out/customer-access-2026-11-12. Reports contain no raw credentials. We did not remotely exercise the customer's installed PC. Customer should fully quit/reopen 1.0.4 and retry the same key; no update required for this exception.

## Rollback

Remove the two compatibility fields from the customer's provider_secrets metadata, preserving all other fields. Restore saved v15 resolve-provider-secrets source with its deno.json import map and verify_jwt=false (handler authenticates licenses). Verify legacy consuming calls return 426 and gateway clients remain usable. To invalidate already-issued provider keys, revoke/rotate them at OpenAI/Groq and update server configuration: resolver rollback cannot revoke them.

This does not fix unsigned installers or give 1.0.4 the new gateway protocol. Microsoft approval and Store-signed native tests remain separate gates.
