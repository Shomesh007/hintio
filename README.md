<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Hintio Landing Page Website

Welcome to the landing page repository for **Hintio**. This is the promotional and distribution website where users learn about Hintio's capabilities and download the desktop application.

Hintio is a real-time, invisible desktop copilot designed primarily for interviews, high-stakes meetings, and developer assistance. It "listens" to system audio (speaker output and microphone input) entirely locally, transcribes the conversation, and provides instant, context-aware suggestions (hints) and live coding assistance in a stealthy, configurable UI.

*For comprehensive details about the product architecture, target users, and capabilities, refer to the `PRD.md` file located in the root of this repository.*

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
This repository contains the marketing **web frontend** only. The actual Hintio product is a separate cross-platform desktop application built using Tauri, React, and Rust.

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
