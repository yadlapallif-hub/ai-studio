# Vercel Production Deployment Guide

FRANCIS CREATOR STUDIO deploys as **two separate Vercel projects** sharing one GitHub repository (`yadlapallif-hub/ai-studio`) and one Supabase backend:

1. **Customer Website Project** — Root Directory: `customer-website`
2. **Admin Website Project** — Root Directory: `admin-website`

---

## Required Environment Variables

### Project 1: `customer-website`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(Server-only)*
- `NEXT_PUBLIC_SITE_URL` *(e.g. `https://francis-creator-studio.vercel.app`)*
- `NEXT_PUBLIC_ADMIN_SITE_URL` *(Optional reference URL)*
- Optional AI Provider keys (server-only): `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `OLLAMA_API_KEY`, `OLLAMA_MODEL`, `OLLAMA_HOST`, `REMOVE_BG_API_KEY`.

### Project 2: `admin-website`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(Server-only)*
- `NEXT_PUBLIC_SITE_URL` *(Admin production URL)*
- `NEXT_PUBLIC_CUSTOMER_SITE_URL` *(Customer production URL)*

> **Security Reminder**: Never prefix `SUPABASE_SERVICE_ROLE_KEY` or any AI API keys with `NEXT_PUBLIC_`.

---

## Post-Deployment Checklist

1. **Supabase Auth Redirect Allowlist**: Append both production URLs (`https://<customer-domain>/**` and `https://<admin-domain>/**`) to `uri_allow_list` in Supabase Auth config. Do not overwrite existing allowlist entries if sharing a Supabase project.
2. **Verify Edge Function & App Health**:
   - `GET https://<customer-domain>/api/health` → `{ status: "ok" }`
   - `GET https://<admin-domain>/api/health` → `{ status: "ok" }`
3. **Security Headers**: Verified via `vercel.json` (`Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, and `X-Robots-Tag: noindex, nofollow` on the Admin domain).

---

## Troubleshooting & Rollback

- **Vercel Workspace Install Failure**: Ensure Project Root Directory is set to `customer-website` (or `admin-website`), `installCommand` is `cd .. && npm install`, and `buildCommand` is `npm run build`.
- **Auth Callback Redirect Fails**: Ensure the exact deployed URL + `/auth/callback` is present in Supabase `uri_allow_list`.
- **Rollback**: Open Vercel Dashboard → Project → **Deployments** → select the last known healthy production deployment → **Promote to Production** (`instant rollback` with zero rebuild required).
