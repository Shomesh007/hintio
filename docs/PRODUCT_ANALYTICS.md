# Hintio product analytics

Hintio measures website traffic and desktop usage when analytics is enabled. The private report at `/admin/analytics` has two views. Both can be filtered by the last 7, 30 or 90 UTC calendar days, by desktop version, and by channel (website, desktop installer or Microsoft Store):

- **Overview** shows totals and breakdowns for everyone combined.
- **People** lists each browser and install with first seen, last seen, version, sessions and key actions. Selecting one opens its timeline: website pages, installer clicks, trial or plan interest, install, onboarding steps, started or blocked sessions and features used, in order.

Browser IDs and install IDs are random and separate. They are joined only by the link events described under [Linking a visitor to an install or account](#linking-a-visitor-to-an-install-or-account).

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
| Desktop | `app_launched` | Once per app start. `first` when the install ID did not exist yet, otherwise `returning`. |
| Desktop | `web_link_opened` | A one-time random link code, sent when the app opens a hintio.tech page. Requires completed privacy setup. |
| Website | `page_viewed` | One event per recognized page navigation, including the current page when the visitor first allows analytics. |
| Website | `download_clicked` | Stable or preview installer link click. |
| Website | `trial_clicked` and `upgrade_clicked` | Free trial, monthly, or yearly action click. |
| Website | `desktop_linked` | The link code read from a page opened by the desktop app. |
| Website | `account_linked` | Sent once per account and browser after Google sign-in. The server stores `acct_` plus a keyed hash, not the account ID or email. |

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
- Events have no arbitrary properties. The collector rejects extra fields and unknown values. Analytics does not store emails, IP addresses, full URLs, keys, prompts, resumes, audio, transcripts, screenshots, or response text. Browser and install IDs are separate from the sign-in and billing systems. The only account-derived value is the keyed `account_linked` reference.
- Supabase accepts a maximum of 120 events per browser or install ID per hour and deduplicates event IDs. Browser origin restrictions apply to cross-origin requests. Treat anonymous events as best-effort product metrics and monitor intake volume during rollout.
- Google sign-in reuses the website's existing Supabase Auth client. The admin function verifies the login with Supabase Auth and requires a confirmed `BuiltbyGSV@gmail.com` account with a verified Google identity and an OAuth session. The admin function returns totals, per-ID rows and timelines to that account only. The dashboard shows IDs shortened to 8 characters.

## Linking a visitor to an install or account

A download click can't be tied to the installer that runs, so linking happens later, in two places:

1. **Desktop to website.** When the app opens a `https://www.hintio.tech` or `https://hintio.tech` page without a fragment, it adds `#hl=<code>`. The code is a new random UUID for each link. The install reports `web_link_opened` with the code. The website reads the code and removes it from the address bar at once. If website analytics is allowed, it reports `desktop_linked` with the same code, and the database joins the browser and install on it. The code is in the fragment, so it isn't sent to the web host, and it isn't the install ID. Linking needs desktop analytics, completed privacy setup (`cloudConsent`) and website analytics to all be on. Links that open through the window's link handler aren't linked. Neither are URLs that already have a fragment, such as `/access#billing`.
2. **Website to account.** After Google sign-in, the website sends `account_linked` once per account and browser, with the user's access token. The `product-analytics` function verifies the token and computes `HMAC-SHA256(ANALYTICS_ACCOUNT_KEY, user ID)`. It stores the first 32 hex characters as `acct_…`. Browsers with the same reference are grouped. Without an `ANALYTICS_ACCOUNT_KEY` of at least 32 characters, the event is dropped. Matching a reference to an account needs that secret and a database lookup.

A timeline follows links transitively, up to 50 IDs, so a browser, an install, a second browser and an account all appear together. The dashboard never shows link codes.

## Test traffic

Reports show **Real users** by default. The Audience filter switches to **Test & team** or **Everyone**.

- In a People timeline, **Mark as test traffic** stores the ID in `hintio_analytics.internal_actors`. **Mark as a real user** removes it.
- After sign-in, the dashboard marks the admin's own browser automatically, if that browser has an analytics ID.
- Any ID linked to a marked ID, through a desktop link code or a shared account, also counts as test traffic. So opening hintio.tech from a test install in a marked browser marks the install too.
- A desktop install's ID is in `%APPDATA%\hintio-config\usage-analytics-id`. QA profiles keep their own copy under their profile folder.
- Overview totals for real users note how many test IDs were left out. Deleting an ID's analytics also removes its mark.

## What is stored and for how long

| Data | Where | Retention |
| --- | --- | --- |
| Events: event ID, random actor ID, time received, source, event name, fixed value, app version, distribution | `hintio_analytics.events` in Supabase | Deleted after 90 days by the daily `hintio-product-analytics-retention` cron job |
| Link codes and `acct_` references | Same table, as event values | 90 days, as above |
| Install ID | `usage-analytics-id` in the desktop app data folder | Until the user turns off usage analytics, which deletes it, or deletes local data |
| Browser ID and the last linked account ID | `localStorage` keys `hintio-analytics-browser` and `hintio-analytics-account` | Until the visitor turns analytics off in the footer, which deletes both, or clears site data |

The analytics functions don't write IP addresses. Supabase's own edge and API logs follow Supabase's log retention.

### Deletion requests

Open **People**, find the ID, open its timeline and choose **Delete this ID's analytics**. This calls `product_analytics_forget`. It deletes every event for that ID and the other half of each of its link codes, so the remaining IDs are no longer joined. An account reference can't be found from an email without `ANALYTICS_ACCOUNT_KEY`. Ask the person for their install or browser ID, or delete the IDs shown in the relevant timeline.

## Per-user analytics rollout

Status on 2026-11-27: steps 1 to 3 are done in production. Steps 4 and 5 are pending. The local and remote migration histories don't match (the `20260316` files were never recorded remotely, and older remote migrations have no local file), so `db push` was not used. The migration ran with `npx supabase db query --remote --file` inside one transaction, then `npx supabase migration repair --status applied 20261127120000 --remote` recorded it. A copy of the `ANALYTICS_ACCOUNT_KEY` value was not kept.

The database, functions, website and desktop changes ship separately. Deploy in this order, so no client sends an event the database would reject:

1. **Migration.** From `hintio-website`, run `npx supabase migration list` and check that only `20261127120000_per_user_analytics.sql` is pending, then run `npx supabase db push`. The migration replaces the event check constraint with a wider one and adds two indexes. It replaces `product_analytics_summary(integer)` with `product_analytics_summary(integer, text, text)`, and adds the actors, timeline and forget functions. All of them are for `service_role` only. Existing rows are unchanged.
2. **Secret.** Run `npx supabase secrets set ANALYTICS_ACCOUNT_KEY=<random 32+ characters>` and keep the value in a password manager. Rotating the key splits old and new references for the same account.
3. **Functions.** Run `npx supabase functions deploy product-analytics analytics-admin` straight after the migration. Until then, the old `analytics-admin` calls the removed one-argument summary function and returns 503.
4. **Website.** Deploy the site. Check the `/admin/analytics` Overview and People views, the filters and a timeline. Open a site page with `#hl=<uuid>` and check that the fragment is removed.
5. **Desktop.** Ship the `out/desktop-free-key` changes in the next verified release: `src/utils/usageAnalytics.js`, `src/index.js` and the Privacy & Data text. Older builds keep sending the existing events. They appear in People without launch or link events.

To roll back, redeploy the previous functions and website. The migration can stay, because older clients send only events the new constraint accepts.

## Rollout

1. Use a staging Supabase project to apply the analytics migration and deploy `product-analytics` and `analytics-admin`. The functions specify their gateway JWT settings in `supabase/config.toml`. The public collector accepts anonymous events. The admin endpoint verifies the bearer token within the handler.
2. Set `ANALYTICS_WEB_ORIGINS` to the staging website origin. Add the full `/admin/analytics` URL to Supabase Auth's redirect allowlist. Configure the website to use that project's URL and public key.
3. Apply the analytics retention migration to schedule the purge through Supabase Cron. The job runs at 03:23 UTC and deletes analytics events older than 90 days.
4. Enable website analytics in staging. Verify the privacy controls, navigation and installer clicks. Confirm a regular signed-in user gets HTTP 403 and `BuiltbyGSV@gmail.com` sees the expected aggregates.
5. Launch the desktop development build with `HINTIO_ANALYTICS_URL` pointing to the staging collector. Test onboarding with and without context, the first session and first answer, each audio mode, and opt-out with synthetic sessions. Packaged builds use the configured Supabase project. Verify the exact installer source and version before packaging. The public `v1.0.10-preview.1` tag points to the website tree, while these desktop changes are based on the maintained `desktop` branch.
6. Apply the same configuration to production after staging checks, enable web collection, and include the desktop changes in a verified release. Confirm the reporting builds and check event volume during the rollout.

Verified trial claims and purchases can be added as aggregate metrics from the existing backend once their production coverage is confirmed. A download click alone measures interest in the installer.
