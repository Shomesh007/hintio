# Troubleshooting Log: Supabase OAuth -> Razorpay Checkout (Localhost)

## Date
- 2026-03-16

## Problem Summary
When clicking **Pro/Lifetime** from local dev (`http://localhost:3000`), Google sign-in succeeds, but checkout does not open.
The flow reaches Supabase Edge Function call and fails with:
- `POST https://vsybqtunyuanxspxhzue.supabase.co/functions/v1/create-razorpay-checkout 401 (Unauthorized)`

## Primary Symptoms Observed
- Initial issue: OAuth redirected to production (`https://www.hintio.tech`) instead of localhost.
- After redirect fixes: app correctly continues post-login intent (`upgrade_monthly` / `upgrade_lifetime`).
- Current blocker: `create-razorpay-checkout` returns 401 before Razorpay order/subscription payload is received.
- Browser console warning `Unrecognized feature: 'otp-credentials'` from `checkout.js` appears, but this is non-blocking noise.
- Confirmed response payload from edge gateway:
   - `{"code":401,"message":"Invalid JWT"}`

## Environment Context
- Frontend local URL: `http://localhost:3000`
- Supabase project ref: `vsybqtunyuanxspxhzue`
- Edge Function: `create-razorpay-checkout`
- Logged-in user session exists in frontend (`supabase.auth.getSession()` returns user and email)

## Relevant Dashboard Config (Reviewed)

### Google Cloud Console (OAuth client)
- Authorized JavaScript origins include:
  - `https://www.hintio.tech`
  - `http://localhost:3000`
- Authorized redirect URI includes:
  - `https://vsybqtunyuanxspxhzue.supabase.co/auth/v1/callback`

### Supabase Auth URL Configuration
- Site URL: `https://www.hintio.tech`
- Redirect URLs included at least production `?download=1` path.
- Localhost callback/intent allowlist must be present for full local flow:
  - `http://localhost:3000/`
  - `http://localhost:3000/?intent=*`
  - (optional legacy) `http://localhost:3000/?download=1`

## What Was Implemented in Code

### 1) OAuth intent persistence hardening
In frontend OAuth start flow, redirect URL now includes an explicit `intent` query param so post-login action is deterministic.

### 2) Post-auth action continuation
Existing post-auth handler continues to:
- read `intent`
- resolve session
- route to download trial key flow or Razorpay checkout flow

### 3) Checkout auth hardening before function invoke
In checkout flow:
- Explicit Bearer header is sent to function invoke call.
- JWT `iat` is decoded client-side; if token appears issued in future, call is delayed briefly.
- If first call fails with auth error, `refreshSession()` is attempted and function call is retried once.

### 4) Error status extraction fix
A bug in retry condition was fixed:
- Supabase function error status can appear under `error.context.status`, not always `error.status`.
- Retry condition now checks multiple shapes and retries on auth-like failures.

## Files Updated During Debugging
- `src/App.tsx`

## Why This Is Not Primarily a Razorpay API Issue
Failure occurs **before** Razorpay order/subscription details are returned to frontend.
The blocking response is from Supabase Edge Function auth (`401 Unauthorized`), not Razorpay endpoint rejection.

## Current Known Root Cause Candidate
Supabase Edge gateway JWT validation rejects the bearer token before function execution in local flow (`Invalid JWT`).
Token timing/skew likely contributes, but retries + refresh + explicit headers still returned gateway-level `401`.

## Verification Completed
- TypeScript check passes: `npm run lint` (`tsc --noEmit`).

## Remaining Checks to Run (High Priority)
1. Sync local machine clock (Windows):
   - Enable automatic time and timezone.
   - Click "Sync now".
2. Re-test local flow from fresh sign-out:
   - Click Lifetime/Pro -> Google login -> expect function success and Razorpay open.
3. Inspect Supabase Edge Function logs for `create-razorpay-checkout` at the failing timestamp:
   - confirm if `admin.auth.getUser(jwt)` returns auth error details.
4. Confirm function deployment is latest version:
   - `supabase functions deploy create-razorpay-checkout`
5. Confirm function secrets exist and are valid:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
   - optional: `RAZORPAY_MONTHLY_PLAN_ID`
   - optional: amount/currency secrets

## Optional Server-Side Hardening (Next)
Implemented final mitigation:
- Add `supabase/functions/create-razorpay-checkout/config.toml` with `verify_jwt = false`.
- Keep strong auth inside function via `admin.auth.getUser(jwt)`.

Required deployment command:

```bash
supabase functions deploy create-razorpay-checkout --no-verify-jwt
```

This avoids gateway JWT rejection while preserving authenticated-only checkout logic at function level.

## Current Status
- Redirect misrouting issue addressed.
- Frontend retry and session refresh logic implemented.
- Gateway rejection confirmed as `Invalid JWT`.
- Repo includes function config to disable gateway JWT verification for checkout function.
- Next action: redeploy checkout function with `--no-verify-jwt`.
