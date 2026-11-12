# GPT-6 Luna migration — 12 November 2026

The owner selected gpt-6-luna for Hintio. Active Supabase settings HINTIO_MANAGED_OPENAI_MODEL and HINTIO_TRIAL_OPENAI_MODEL now select gpt-6-luna. The public 1.0.4 installer and test-only 1.0.6 preview are retained; ordinary 1.0.4 users receive the selected model from the resolver and do not need a new installer for chat/screenshot use.

Official model documentation: https://developers.openai.com/api/docs/models/gpt-6-luna . Standard short-context pricing is USD0.10/input-million and USD0.50/output-million versus GPT-5.6 Luna USD0.20 and USD1.20. This establishes lower token pricing, not a guarantee of better answers for every task. Chat Completions, image input, streaming and none/low/medium reasoning are supported. Groq remains speech transcription; it is not replaced by this text model.

## Compatibility and evidence

- Actual released commit8f85d84 buildChatBody with temperature1 returnedHTTP200 and actual modelgpt-6-luna for none,low,medium and omitted reasoning.
- Released1.0.4 medium-reasoning image payload recognized a synthetic blue image, using the live resolver-selected modelgpt-6-luna.
- Legacy non-default temperatures0.7/0.25 returned400unsupported_value. Most such old calls are Groq helper paths, but optional OpenAI voice-pattern calibration uses0.1. The maintained app omits temperature for GPT-6 Luna, preserving reasoning and output caps. This source fix is not retroactively present in the immutable1.0.4 binary; its optional old calibration path can fail/fall back. Normal onboarding skips calibration.
- managed-runtime v7 changes only the model fallback. Live GPT6 text, streaming, synthetic speech, idempotent session creation, close/revocation and negative security checks passed. No provider keys returned by gateway.
- 78 desktop tests passed, including explicit GPT6 request-shape checks. Historical benchmarks/reports are retained unchanged; established older fallback models remain for compatibility.
- All QA entitlement used for these probes was blocked afterward. Customer keys/expiry were not modified.

Reports: out/customer-access-2026-11-12/GPT6-LEGACY-COMPATIBILITY.json, GPT6-LEGACY-TEMPERATURES.json, GPT6-LEGACY-VISION.json, GPT6-LIVE-GATEWAY.json. Gateway v6 rollback source is retained there. No API credentials are stored in reports.

## Separate trial project preparation

Trial project: proj_YgMNRd7U1e7YN9DPuHzg5OPJ (Hintio Free Trials1.0.4). Onlygpt-6-luna is allowed; project caps100000TPM/30RPM/10IPM, Standard tier only, service-account keys only, maximum new-key lifetime7days. Actual APIkey creation and secret storage are separate user credential handoffs. Weekly manual replacement was explicitly chosen; automatic provider key rotation is not implemented.

The account dashboard exposes no hard project spend-limit control. The owner initially selectedUSD5/month, then explicitly approved a bounded seven-day pilot without guaranteedUSD5cutoff after disclosure of shared organization credits. Do not describe the pilot as having an enforcedUSD5cap. Provider-native expiry, scope and actual key configuration must be verified before the coordinated trial-isolation guard is activated.

## Publication boundary

The separate chat owns unactivated trial-credential isolation changes. Model-only publication uses clean public branch baselines, not those local guard ancestors. No prepared guard is deployed as part of the model migration.
