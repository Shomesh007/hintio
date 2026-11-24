# Hintio product analytics

The first release measures website traffic and desktop usage when analytics is enabled. The private report at `/admin/analytics` shows the last 7 or 30 UTC calendar days. Browser IDs and desktop install IDs are independent, so each surface has its own counts.

## Events

| Surface | Event | Values and counting rule |
| --- | --- | --- |
| Desktop | `session_started` | One event when the app enters the assistant after access and provider initialization. Value is the selected audio mode, including the default. |
| Desktop | `onboarding_step` | First-time welcome, context, and final setup screens. |
| Desktop | `onboarding_completed` | First-time setup completed with blank or provided context. |
| Desktop | `session_start_blocked` | Missing key, setup required, update required, or an access/service initialization failure. |
| Desktop | `session_profile` | The preset selected when the assistant session starts. |
| Desktop | `session_answered` | First completed conversational or screenshot answer per active session. |
| Desktop | `session_ended` | Duration band for sessions that report a close. |
| Desktop | `feature_used` | One event per completed single, multi, or debug screenshot analysis. Opening History, Settings, or AI Context also counts. |
| Website | `page_viewed` | One event per recognized page navigation, including the current page when the visitor first allows analytics. |
| Website | `download_clicked` | Stable or preview installer link click. |
| Website | `trial_clicked` and `upgrade_clicked` | Free trial, monthly, or yearly action click. |

The dashboard shows action totals and distinct browsers or installs per option. A desktop install is active when it reports a successful session start. The report displays zero for an instrumented option without events when its surface has reporting activity in the selected window. Older desktop builds have no coverage. Data begins when the instrumented clients and collector are available.

## Desktop analytics audit

### Onboarding and first use

Released builds cannot provide historical context-skip counts. The context screen uses the same Continue button for blank and filled fields. The dashboard records the final context outcome at successful first-time setup. Blank and whitespace-only fields count as skipped. Editing context later does not change the outcome.

The dashboard reports the skip rate as skipped divided by skipped plus provided. It follows installs with a first observed welcome event in the selected range through context, final review, setup completion, first successful session, and first completed answer. Returning privacy setup does not count again. Recent setups may still be in progress. Offline events can be missed, and deleting local data resets the install identifier.

### Other product questions

| Area | Useful measurements | Where to count |
| --- | --- | --- |
| Access and activation | Start attempts, successful starts, first session, first completed answer, blocked starts by known reason | `MainView` and `HintioApp._startSession`. Cover the keyboard route as well as the button. Use fixed reasons like missing key, access rejected, provider unavailable, or update required when the code can distinguish them. |
| Session use | Active installs, repeat use, duration bands, sessions with and without an answer, manual end versus timeout | `HintioApp` session lifecycle and the first completed response. Use the local clock for elapsed duration and an analytics-specific identifier if correlation is needed. |
| Assistant inputs and results | Audio-triggered answers, typed asks, and single, batch, or debug screenshot attempts and completions. Permission failures, provider failures, and time-to-first-response bands | Shared renderer and provider handlers. Count a batch once per analysis and distinguish initiation from completion. Capture outcome categories only; raw error messages and content can contain private data. |
| Modes and AI Context | Selected audio modes and presets used in started sessions, actual capture availability, image quality, optional context saved or removed, resume import success/failure/cancel | Session start, capture startup, and `AICustomizeView` file handling. Use fixed settings and outcome labels. Count the import action only; file contents and metadata stay outside analytics. |
| Overlay and shortcuts | Which actions are invoked by toolbar or shortcut, visibility and click-through toggles, docking, resizing, and shortcut customization | Shared action handlers in `window.js`, renderer, and views. Count actions or completed layout changes and omit key combinations, coordinates, and window titles. |
| Settings | Audio and image quality changes, theme, text-size or transparency bands, reset settings | `CustomizeView`. Count committed settings only. Report setting changes separately from the setting used when a session starts. |
| History | Session opened, Conversation/Screen/Context tab usage, search used, copy and export success | `HistoryView`. Use the tab or outcome; keep query text, record IDs, export content and paths local. |
| Updates | Check result, update available or required, installer or Microsoft Store link opened, adoption by version and distribution | `UpdatesView` and the update service. A later launch reporting the new version gives evidence of adoption. |
| Help and feedback | Help opened, support channel selected, feedback draft opened, AI-response report draft opened | Help, Feedback, and Assistant views. Draft-opening events measure the draft action; sending happens outside Hintio. |
| Existing backend records | Trial claims, verified payments, and managed-runtime session totals where records exist | Read-only server aggregates from the production coverage that is verified separately. These cannot reconstruct desktop UI actions or anonymous click-to-install conversion. |

The Onboarding and Activation report, blocked starts, session durations, audio modes and presets are implemented. The remaining measures above are candidates for later expansion. Label an option as **0 recorded uses** only for versions and distributions where that option and its instrumentation are both available. The current report checks coverage by surface, so per-feature coverage must be added before mixing newly instrumented and older builds.

## Collection and access

- Supported desktop builds collect usage analytics by default. Settings → Privacy & Data lets people turn it off. The main process sends an event ID, a random install ID, app version, distribution, and fixed labels. It sends in order and keeps no offline queue.
- Website collection is enabled by default on the production origin. Set `VITE_PRODUCT_ANALYTICS_ENABLED=true` to test collection locally or `false` to disable it for a build. It respects Global Privacy Control and Do Not Track. Visitors can turn it off in footer preferences, which also removes the browser analytics ID.
- Events have no arbitrary properties. The collector rejects extra fields and unknown values. Analytics does not store emails, IP addresses, full URLs, keys, prompts, resumes, audio, transcripts, screenshots, or response text. Browser and install IDs are separate from the sign-in and billing systems.
- Supabase accepts a maximum of 120 events per browser or install ID per hour and deduplicates event IDs. Browser origin restrictions apply to cross-origin requests. Treat anonymous events as best-effort product metrics and monitor intake volume during rollout.
- Google sign-in reuses the website's existing Supabase Auth client. The admin function verifies the login with Supabase Auth and requires a confirmed `BuiltbyGSV@gmail.com` account with a verified Google identity and an OAuth session. Only aggregate output leaves the backend.

## Rollout

1. Use a staging Supabase project to apply the analytics migration and deploy `product-analytics` and `analytics-admin`. The functions specify their gateway JWT settings in `supabase/config.toml`. The public collector accepts anonymous events. The admin endpoint verifies the bearer token within the handler.
2. Set `ANALYTICS_WEB_ORIGINS` to the staging website origin. Add the full `/admin/analytics` URL to Supabase Auth's redirect allowlist. Configure the website to use that project's URL and public key.
3. Apply the analytics retention migration to schedule the purge through Supabase Cron. The job runs at 03:23 UTC and deletes analytics events older than 90 days.
4. Enable website analytics in staging. Verify the privacy controls, navigation and installer clicks. Confirm a regular signed-in user gets HTTP 403 and `BuiltbyGSV@gmail.com` sees the expected aggregates.
5. Launch the desktop development build with `HINTIO_ANALYTICS_URL` pointing to the staging collector. Test onboarding with and without context, the first session and first answer, each audio mode, and opt-out with synthetic sessions. Packaged builds use the configured Supabase project. Verify the exact installer source and version before packaging. The public `v1.0.10-preview.1` tag points to the website tree, while these desktop changes are based on the maintained `desktop` branch.
6. Apply the same configuration to production after staging checks, enable web collection, and include the desktop changes in a verified release. Confirm the reporting builds and check event volume during the rollout.

Verified trial claims and purchases can be added as aggregate metrics from the existing backend once their production coverage is confirmed. A download click alone measures interest in the installer.
