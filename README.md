<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hintio Landing Page Website

Welcome to the landing page repository for **Hintio**. This is the promotional and distribution website where users learn about Hintio's capabilities and download the desktop application.

Hintio is a real-time, invisible desktop copilot designed primarily for interviews, high-stakes meetings, and developer assistance. It "listens" to system audio (speaker output and microphone input) entirely locally, transcribes the conversation, and provides instant, context-aware suggestions (hints) and live coding assistance in a stealthy, configurable UI.

_For comprehensive details about the product architecture, target users, and capabilities, refer to the `PRD.md` file located in the root of this repository._

## Desktop storefront redesign

The public UI follows the approved navy, cool-white, and electric-yellow Hintio mockups. The existing Google OAuth, Supabase Edge Function, Razorpay, download, and license-delivery handlers remain in src/App.tsx. Public pages and responsive product previews live in src/marketing/.

Pages: /, /workflows, /shortcuts (with /help alias), /get-started, /access, /privacy, and /terms. The last two provide product information and support contact; they do not invent a binding privacy or purchase policy.

Run npm test, npm run typecheck, and npm run build to check the implementation. Run npm run dev for the local preview. Set the public Supabase environment variables from .env.example. No backend secrets belong in VITE_ variables.

The backend still accepts monthly and yearly checkout identifiers. Final price and currency come from Razorpay; the old hard-coded dollar prices are removed because they conflicted with server-side configuration. A custom 28-day key is not advertised as the duration of every monthly purchase.

OAuth redirects must be allowed in the Supabase Auth configuration for any new preview origin. A payment has not been executed as part of UI testing. Configure and verify the production plan amounts before a public rollout. Vercel deep-link rewrites are included for each page.

## Tech Stack

- React 19
- Vite
- Tailwind CSS v4
- Framer Motion

## Run Locally

**Prerequisites:** Node.js v18+

1. Install dependencies:

    ```bash
    npm install
    ```

2. Run the development server:

    ```bash
    npm run dev
    ```

3. Open the browser to see the site running at `http://localhost:3000`.

## Architecture Note

This repository contains the marketing **web frontend** only. The actual Hintio product is a separate Electron desktop application.

## Supabase + Razorpay License Flow

This repo is wired for the flow:

`Razorpay webhook -> Supabase Edge Function -> Save to DB -> Activate in app`

### 1) Database

Migration file is included at:

- `supabase/migrations/20260316_create_licenses_table.sql`

### 2) Edge Function

Function source is included at:

- `supabase/functions/razorpay-webhook/index.ts`

It verifies `x-razorpay-signature`, then inserts an active license into `licenses`.

> Note: Email sending is intentionally not used (free-tier friendly).

### 3) Deploy webhook function

Deploy to Supabase:

```bash
supabase functions deploy razorpay-webhook --no-verify-jwt
```

Webhook URL for this project:

```txt
https://vsybqtunyuanxspxhzue.supabase.co/functions/v1/razorpay-webhook
```

Add function secret in Supabase:

```bash
supabase secrets set RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

### 4) Frontend license validation

The modal in `src/App.tsx` validates the entered key against `public.licenses` where:

- `license_key = user input`
- `status = active`

Set local env vars before running:

```bash
VITE_SUPABASE_URL=https://vsybqtunyuanxspxhzue.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Vercel Production (www.hintio.tech)

This repo is ready for Vercel production deploy.

### Domain + redirects

- Canonical domain is configured as `https://www.hintio.tech`.
- `vercel.json` includes a permanent redirect from apex `hintio.tech` to `www.hintio.tech`.

### Required Vercel environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `VITE_SUPABASE_URL=https://vsybqtunyuanxspxhzue.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<your_anon_key>`
- `VITE_SITE_URL=https://www.hintio.tech`

Optional:

- `VITE_MAC_DOWNLOAD_URL=<public .dmg URL>`
- `VITE_WINDOWS_DOWNLOAD_URL=<public .exe URL>`

### SEO/static files included

- `index.html` includes canonical, Open Graph, Twitter metadata
- `public/robots.txt`
- `public/sitemap.xml`
- `public/site.webmanifest`

### Build settings

Vercel settings are codified in `vercel.json`:

- framework: `vite`
- build command: `npm run build`
- output directory: `dist`

## Google Auth Gate for Downloads (Free Tier Compatible)

Yes, this works on Supabase free tier.

Download and pricing CTAs in the site now require a valid Google-authenticated Supabase session before opening the installer URL.

### Supabase dashboard setup (required)

1. Open `Authentication -> Providers -> Google` and enable Google provider.
2. Add your Google OAuth `Client ID` and `Client Secret`.
3. In `Authentication -> URL Configuration`, ensure site URL is:

```txt
https://www.hintio.tech
```

4. Add redirect URLs:

```txt
https://www.hintio.tech
https://www.hintio.tech/
https://www.hintio.tech/?download=1
http://localhost:3000
http://localhost:3000/
http://localhost:3000/?download=1
```

### Notes

- Free tier supports OAuth providers, including Google.
- No paid Supabase plan is required for this authentication gate flow.

## Unique Free-Trial Key Assignment (Per Authenticated User)

Implemented via Supabase migration:

- `supabase/migrations/20260316_add_unique_trial_key_claim_function.sql`

Behavior:

- After successful Google auth with `?download=1`, frontend calls `public.claim_three_usage_trial_key()`.
- Function selects an unassigned token from `public.access_tokens` where:
    - `max_interviews = 3`
    - active + not expired
    - linked `public.provider_secrets.metadata.plan_type = 'three_usage'`
- Token is atomically claimed (`FOR UPDATE SKIP LOCKED`) and reserved to that user (`sold_to`).
- Claim mapping is stored in `public.trial_key_claims` to ensure a token is never assigned to another user.
- UI shows popup with key, Copy, and Done. Download starts only after Done.

## Razorpay Payment Gateway (Monthly + Yearly)

Implemented with secure server-side checkout creation using Supabase Edge Function:

- `supabase/functions/create-razorpay-checkout/index.ts`

Frontend wiring:

- `Get Pro` triggers `monthly`
- `Get Yearly` triggers `yearly`
- Frontend invokes Edge Function, then opens Razorpay Checkout (`checkout.js`)

After Razorpay reports success, the frontend tries the existing license issuer once.
If issuance is slow or fails, it automatically polls the authenticated `get-my-license`
endpoint until the selected-plan key is available. Each lookup has an 8-second limit;
retries back off from 2 seconds to a maximum of 30 seconds between checks. There is
no overall recovery cutoff while the page remains open. The pending plan and payment
reference are kept in local storage so reopening the same browser restores lookup,
with sign-in required if the session expired. Legacy tab-session reminders migrate
automatically. No license keys, payment signatures, or login credentials are stored
in the reminder. The access page also has an “Already paid?” retrieval action for
the selected monthly/yearly plan, using the same Google account and existing endpoint.
Recovery OAuth intents never open checkout. Closing the dialog does not stop recovery;
leaving the page cancels requests and timers. The browser cannot check while closed.

### Deploy function

```bash
supabase functions deploy create-razorpay-checkout
```

If local OAuth sessions intermittently fail at the edge gateway with `401 Invalid JWT`, deploy with gateway JWT verification disabled and rely on the function's internal token validation (`admin.auth.getUser(jwt)`):

```bash
supabase functions deploy create-razorpay-checkout --no-verify-jwt
```

This repository also includes `supabase/functions/create-razorpay-checkout/config.toml` with:

```toml
verify_jwt = false
```

### Required Supabase function secrets

```bash
supabase secrets set RAZORPAY_KEY_ID=...
supabase secrets set RAZORPAY_KEY_SECRET=...
supabase secrets set RAZORPAY_CURRENCY=INR
supabase secrets set RAZORPAY_MONTHLY_AMOUNT_PAISE=1900
supabase secrets set RAZORPAY_YEARLY_AMOUNT_PAISE=9900
```

Optional for true recurring monthly subscriptions (recommended):

```bash
supabase secrets set RAZORPAY_MONTHLY_PLAN_ID=plan_xxxxx
```

If `RAZORPAY_MONTHLY_PLAN_ID` is set, monthly checkout uses Subscriptions API.
If not set, it falls back to a one-time monthly order amount.
