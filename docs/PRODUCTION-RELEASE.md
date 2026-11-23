# Hintio production release policy

As of 12 November 2026, public production is 1.0.4. GitHub Latest, website downloads, paid-key dialogs and pending-payment downloads must use:

https://github.com/Shomesh007/hintio/releases/download/v1.0.4/Hintio-1.0.4.Setup.exe

Original installer SHA-256: 6d19663e17895936b7a99458c4759a21c7fc2b1f46fbb29635cbb2e9ea4871ef. Do not rebuild or replace this asset under its old version.

1.0.6 stays the maintained Store candidate. Keep its source, tests, manifests, final installers/MSIX and reports. Do not point public downloads at it before Store readiness is approved. The Store candidate remains version 1.0.6. This branch packages the separate Windows preview. release-channels.json and website productionRelease.ts explicitly separate these versions.

## Access

Resolver v18 supports verified active monthly/yearly billing entitlements, the existing owner-approved manual customer exception and genuinely claimed three-session trial keys. It preserves hashed license validation, expiry/allowance checks, atomic consumption, provider availability checks and durable auth/start limits. No Gemini fallback or internal secret bypass exists.

The 1.0.4 app must receive one company OpenAI key and a Groq key to call vendors directly. The owner explicitly approved this for paid customers and trials. Copied credentials can bypass quotas and stay usable until vendor revocation; a UI timer or metadata rollback cannot revoke them. The 1.0.6 gateway remains server-only and is not weakened.

## Trial abuse controls

A verified Google session and persistent random browser UUID are required at claim-trial-access. Its handler uses only the managed proxy CF-Connecting-IP header; no client-supplied body IP, user ID or X-Forwarded-For fallback is accepted. Missing trusted network information fails closed. IPv6 is normalized. The endpoint derives domain-separated HMAC hashes using the server trial-hash secret, falling back to the server service key; raw IP/browser identifiers are not stored in the bindings table. A service-key rotation changes fallback hash identities, so configure a dedicated stable HINTIO_TRIAL_HASH_SECRET before such rotation if continuity is required.

The service-only SQL RPC serializes account/IP/device claims with ordered transaction locks and unique hashed bindings. One account recovers its existing key without a new allowance. New accounts cannot claim a second trial on a bound IP or browser identifier. The old public/private browser-callable claim RPC grants are revoked. The trial remains three app sessions, up to 15 minutes each, expiring after 30 days. Third session works; fourth start is denied.

This is a browser identifier, not hardware attestation. Clearing browser data, another browser/device, VPNs or changing networks can evade parts of the check. Shared public IPs can block independent people; support handles those cases. Historical accounts acquire network/device bindings on recovery; historical IPs cannot be reconstructed. Bindings cascade away on authorized account deletion.

## Release checks

74 desktop tests, 50 resolver checks, website trial/billing/download tests, SQL rollback tests and real released-1.0.4 GPT/synthetic-speech tests cover the change. QA entitlements are blocked after tests. The customer key, paid expiry and usage are not changed by QA.

The original 1.0.4 installer remains unsigned and was blocked by this PC's Windows Application Control. Backend compatibility cannot fix installer trust. The website discloses this before purchase; Microsoft approval and Store-signed native tests remain separate gates.

## Separate test prerelease and provider-isolation work

At the owner's request in a separate chat, v1.0.6-preview.1 is published only for friend testing, with prerelease=true and latest=false. Production, purchase links and minimum supported version remain 1.0.4. The candidate binaries are unchanged.

The owner also assigned a separate coordinated chat to isolate trial OpenAI/Groq credentials and provider restrictions. That chat owns resolver credential-routing changes after v18. Account/IP/browser guards do not isolate provider credentials by themselves. Until that follow-up ships, the legacy v18 trial path uses the previously approved company credentials; after fail-closed isolated routing is deployed, new trial starts require the dedicated trial credentials. Do not claim provider isolation is configured merely because this release-policy work is complete.


## 1.0.11 desktop preview

The preview carries forward the application files from the checksum-verified public 1.0.10 preview. It adds desktop product analytics, shortens the final onboarding screen to a Terms and Privacy agreement, and retains the explicit cloud-processing consent. Use the 1.0.11 version and preview channel for this build.

A portable x64 candidate can be inspected separately from the Squirrel installer. Verify the app on Windows and build the release installer before attaching `Hintio-1.0.11.Setup.exe` and `SHA256SUMS.txt` to `v1.0.11-preview.1`. Switch the website preview version after the published assets are reachable.
