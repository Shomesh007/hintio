# Store policy evidence and release gates

Reviewed against Microsoft Store policies v7.20, effective 2026-10-22. Preparation is not Microsoft certification or a guarantee of compliance.

| Policy                 | Prepared evidence                                                                                              | Remaining check                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 10.1 Accurate metadata | Feature text, six relevant keywords, five actual-component captures; no guaranteed invisibility/latency claims | Validate final installed behavior and screenshots                                                           |
| 10.2 Security          | Electron 45.2.3, tightened script CSP, no remote fonts, encrypted Store records, production audit clean        | Review build-only audit findings; native runtime and backend security validation                            |
| 10.3 Testability       | Copy-ready reviewer steps and synthetic PDF/DOCX                                                               | Supply working private token and enough entitlement                                                         |
| 10.4 Reliability       | Unit/UI tests, MakeAppx semantic validation, package/source verification                                       | WACK, clean signed installation, capture, restart, Store updates/uninstall                                  |
| 10.5 Privacy           | Affirmative consent before credits/capture, active withdrawal, encryption, export disclosure                   | Deploy matching public privacy text and verify real Windows encryption                                      |
| 10.6 Capabilities      | Full-trust, internet and optional microphone justifications                                                    | Microsoft capability review; no excessive permissions                                                       |
| 10.7 Localization      | English listing and UI                                                                                         | Declare only supported languages                                                                            |
| 10.8 Payments          | Non-game PC third-party Razorpay payment flow identified                                                       | Monthly INR 2,049 confirmed; verify yearly amount, paid-license provisioning, cancellation and usage limits |
| 10.14 Account/contact  | Company application and BuiltbyGSV contact details                                                             | Business approval and reserved identity                                                                     |
| 11.2 Ratings/content   | Questionnaire fact sheet in reviewer notes                                                                     | Complete IARC from actual content; no invented age rating                                                   |
| 11.16 Generative AI    | Metadata flag, visible disclosure, report-email draft, provider instructions                                   | Partner Center declaration, runtime abuse testing, operational reporting process                            |

## Report handling before launch

Owner: admin@builtbygsv.in. Confirm a monitored inbox, review reports for potentially prohibited output, reproduce using redacted content, take appropriate corrective action and document resolution without retaining unnecessary personal data. No response-time promise is made. Never request provider keys or private third-party captures in reports. A mail draft alone is not proof that support operations are ready.

## References

- https://learn.microsoft.com/en-us/windows/apps/publish/store-policies
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/screenshots-and-images
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements
- https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-certification-process
