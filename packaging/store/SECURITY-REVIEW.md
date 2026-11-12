# Security review — 12 November 2026

## Implemented and verified

- Managed OpenAI chat, screenshots, streaming and Groq speech now use `managed-runtime`. Company provider keys stay server-side; the renderer never receives the scoped gateway credential.
- Session credentials are HMAC-derived from a random request UUID and license; only SHA-256 hashes are stored. Starts lock the entitlement row and are idempotent, including the final trial credit.
- Every provider request rechecks active license status, paid expiry and session expiry. Session close revokes access. Trial sessions expire within 15 minutes; paid credentials currently expire within eight hours or the paid expiry, whichever is sooner.
- Fixed provider URLs and models; remote screenshot URLs rejected; JSON/audio/text/image/output bounds; provider errors sanitized; no request-content logging or persistence in gateway code.
- Database-enforced limits: authentication attempts, IP session burst, 180 total requests/minute/license, 40 chat requests/minute, 120 speech requests/minute and 10,000 requests/rolling 24 hours. These are technical abuse controls, not additional purchased session credits.
- Legacy `resolve-provider-secrets` rejects consuming/internal requests with HTTP 426 and never returns provider keys. Version 1.0.6 is required for managed sessions; the public 1.0.4 installer is incompatible with this secure protocol.
- Legacy trial status/logging/mutation RPCs are service-only. Settings and subscription helpers use SECURITY INVOKER with ownership policies. Trial claims retain their public signed-in contract through a private implementation with anonymous-account rejection and a per-user lock.
- Supabase anonymous sign-in disabled. Owner explicitly approved disabling unused email/password sign-in; Google remains enabled. Zero password users existed at review.
- Fresh advisor scan: 15 exposed SECURITY DEFINER function warnings and four anonymous-policy warnings cleared. Eleven no-policy INFO findings intentionally deny browser access to private billing/session data. Leaked-password protection remains a paid-plan warning but email/password authentication is disabled.
- Desktop and website full npm audits report zero vulnerabilities after compatible updates, Forge 8.0.1, matching Fuses 2.1.3, AppImage maker 6.0.0 and targeted transitive patches. Lockfiles retained.
- Privacy disclosure identifies the Supabase gateway, OpenAI and Groq.

## Evidence

71 desktop tests; 73 JavaScript syntax checks; strict gateway TypeScript; 99 website tests, website TypeScript and production build. Live GPT marker, streamed response, synthetic speech and public-logo vision passed. Closed-session reuse returned 403. Invalid credentials, remote image URLs and excess output limits are rejected. Real database rollback tests cover idempotency, last-credit operation, cross-license replay, exhaustion, revocation, expiry, daily limit and privileges. Billing and sandbox isolation tests rerun successfully.

Evidence is retained under `out/security-review-2026-11-12/`. Three temporary QA session credits were used: the first exposed a limiter configuration mismatch; subsequent live requests passed. The QA token is blocked and expired; no customer credit or real-money payment was used.

Version 1.0.6 validation MSIX passes package/source checks. It is unsigned with a validation identity; it is not a trusted or published installer. Previous installers and reports remain preserved.

## Owner actions and release gates

1. Replace the historical company OpenAI and Groq keys in Supabase Secrets, verify the replacements through the gateway, then revoke old keys at the providers. Older clients could receive those keys; stopping future delivery does not invalidate old copies. Do not paste secrets into chat.
2. Automatic renewal of an active paid gateway credential is prepared but NOT deployed pending explicit approval. The published paid terms have no fixed session-duration cap; the current credential lifetime requires a new session after eight hours. Any approved renewal must retain paid expiry and all request limits.
3. Microsoft business approval, reserved identity, final Store package/submission declarations, private reviewer entitlement, WACK and Store-signed installed capture/update/restart/uninstall tests.
4. Distribute the secure client before directing customers to start sessions. The existing public 1.0.4 download cannot use the new gateway. Do not describe the unsigned validation MSIX as a supported public installation.

The two older unlinked licenses still require verified payment proof through existing recovery/support; they must not be silently activated.

## References

- [Supabase function permissions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Supabase password protection](https://supabase.com/docs/guides/auth/password-security)
- [OpenAI server-side authentication](https://developers.openai.com/api/reference/overview)
