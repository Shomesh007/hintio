# Hintio Store policy review â€” 12 November 2026

Reviewed against Microsoft Store Policies 7.20 (effective 22 October 2026). These are preparation findings, not certification or a guarantee of compliance.

| Policy                             | Prepared evidence                                                                                                                                     | Remaining verification                                                                                     |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 10.1 Accurate representation       | Current 1.0.6 description, pricing, request-limit disclosure, five actual-component screenshots with synthetic content                                | Compare Store-installed appearance; use the reserved product identity                                      |
| 10.2 Security                      | Managed keys remain server-side; scoped/revocable sessions; service-only privileged RPCs; zero-vulnerability full npm audits                          | Owner-deferred historical key rotation and live/test webhook-secret separation; Store-signed native checks |
| 10.3 Testability                   | Reproducible reviewer steps and synthetic document/context fixtures                                                                                   | Supply a working temporary reviewer token privately during submission                                      |
| 10.4 Usability                     | Missing/invalid token, import/export, reset/delete confirmation, reporting, consent withdrawal and narrow-window browser checks                       | WACK, real capture, clean signed install, restart, update and uninstall                                    |
| 10.5 Personal information          | Affirmative cloud consent, provider/gateway disclosure, local export warnings and encrypted Store records                                             | Verify actual Windows-protected-key persistence and installed capture lifecycle                            |
| 10.6 Capabilities                  | internetClient, microphone and runFullTrust justifications; no administrator elevation, service or driver added                                       | Microsoft capability review                                                                                |
| 10.7 Localization                  | en-US listing and English UI                                                                                                                          | Declare only supported locales                                                                             |
| 10.8 Payments                      | External Razorpay identified; INR 2,049 monthly / INR 14,000 prepaid yearly; captured Test-mode purchase, renewal and cancellation retention verified | Confirm final checkout disclosures and supported markets in the Store submission                           |
| 10.14 Account type                 | Company account and verified work email/employment                                                                                                    | Microsoft business verification remains Pending                                                            |
| 11.2 Names and third-party content | Product branding and public corresponding source identified; repository is GPL-3.0                                                                    | Owner confirms naming rights/reservation and required third-party notices for release                      |
| 11.11 Age ratings                  | Questionnaire fact sheet prepared; no rating invented                                                                                                 | Complete official IARC declarations from actual facts                                                      |
| 11.16 Live generative AI           | Metadata flag, AI accuracy disclosure, safe-use instructions and reviewable report-email draft                                                        | Complete Partner Center AI declaration and maintain operational report handling                            |

## Verified billing status

Live and isolated Test-mode webhooks are enabled. Real Razorpay Test-mode monthly/yearly captures, signed renewal delivery, same-key extension, idempotent recovery and end-of-cycle cancellation retention passed. No real-money customer charge, cancellation or refund was used for QA. The older deferred-webhook/captured-payment notes in historical reports are superseded.

## Owner-deferred security actions

At the owner's request, OpenAI/Groq key replacement/revocation and separate sandbox webhook signing-secret rotation are deferred. The live/test signing-secret digests match. Those items are recorded, not claimed remediated. Active paid-session renewal is separately approved, applied and verified within paid expiry and existing request limits.

## Reporting and source

Support owner: admin@builtbygsv.in, +91 8438365095. Review reports using redacted material and document corrective action. A mail draft alone does not prove inbox monitoring or support response time.

Publish corresponding source for the exact released GPL build and preserve applicable third-party notices. Keep passwords, identity documents, provider keys and reviewer tokens out of public metadata.

## Current artifacts

out/store-listing-1.0.6/ contains the listing draft, five 1600x1000 PNG screenshots, captions, 300px tile, reviewer notes, submission checklist and verification evidence. Screenshots use real app components with a test-only native bridge; they do not prove installed native behavior.

The retained out/store-validation-1.0.6/ MSIX matches its saved SHA-256 and prior package/source verification. It has a validation identity and is unsigned. It must not be distributed or uploaded as the final identified submission.

## References

- https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements
