# FRANCIS CREATOR STUDIO

> **Create Your Future. Design Your Identity.**  
> **100% Free & Open-Source AI-Powered Resume, Certificate, Verification & Career Platform**  
> Created & Developed by **FRANCIS** • MIT License

FRANCIS CREATOR STUDIO is a dual-application, full-stack open-source platform for creating ATS-friendly resumes, designing print-ready certificates with realistic photo & stamp/seal editing, verifying credential IDs publicly via QR code, and assisting users with context-aware AI & real-time support.

---

## Core Guarantees

- **100% Free & Open-Source (MIT)** — Zero subscriptions, zero paid templates, zero export paywalls, zero hidden fees.
- **No Fake Data or Simulated AI** — All counts, charts, verification statuses, and profiles come from PostgreSQL. When no AI provider is configured, the platform returns a clear configuration notice instead of fabricated answers.
- **Strict Verification Integrity** — Decorative sample stamps are clearly tagged as preview-only. Credentials only display **Officially Verified** when approved under an authorized issuing organization (`fcs_authorized_issuers`).
- **ATS & Career Honesty** — Quality & ATS scores evaluate structure, clarity, and keyword overlap without guaranteeing interview selection or inventing live job listings.
- **Security by Design** — Separate Customer and Admin applications, Supabase Row-Level Security across all 22 `fcs_*` tables, private storage buckets with short-lived signed URLs, and server-side RBAC.

---

## Monorepo Layout

```text
ai-studio/
├── customer-website/          # Next.js 15 Customer Web Application (port 3000)
├── admin-website/             # Next.js 15 Separate Admin Operations Console (port 3001)
├── packages/shared/           # @francis/shared types, Zod schemas, deterministic analyzers & tests
├── backend/supabase/          # SQL migrations (001–003) & Deno Edge Functions
├── documentation/             # Architecture, DB, Security & Vercel deployment guides
├── .env.example               # Documented environment variable template
├── LICENSE                    # MIT License
└── package.json               # Workspace scripts (test, typecheck, lint, build)
```

---

## Key Capabilities

### 1. Customer Website (`customer-website`)
- **AI Resume Builder (`/resume-builder`)**: 7 ATS & executive templates, real-time live preview, 14 editable sections, drag-and-drop & up/down section reordering, custom fonts/colors, Realistic Profile Photo Editor (crop, zoom, rotate, brightness/contrast, background removal), approval-gated AI improvements, ATS & Job-Description keyword match scoring, and print-ready A4 PDF & PNG export.
- **AI Certificate Studio (`/certificate-builder`)**: 9 official template categories, A4 Landscape & Portrait modes, pointer-draggable canvas layers (logos, recipient photos, transparent PNG stamps/seals, blue/red ink & gold embossed effects, authorized signatures, custom text blocks), decorative preview stamps separated from genuine seals, scannable QR verification codes, and A4 PDF/PNG export.
- **Public Verification Registry (`/verify` & `/verify/[certificateId]`)**: Instant QR / Certificate ID lookup backed by PostgreSQL RPC (`fcs_lookup_certificate_verification`) + Authorized Issuer application portal.
- **FRANCIS AI & Intelligence (`/assistant` + Floating Assistant)**: Context-aware chat, saved threads, Career Roadmap & Interview Prep advisor, and explainable Smart Dashboard recommendations with Accept/Dismiss/Helpful feedback & opt-out privacy controls.
- **Document Vault (`/vault`)**: Private encrypted file manager (`fcs-vault` & `fcs-exports`) with search, sort, rename, delete, and signed URL previews.
- **Realtime Customer Support (`/support`)**: Support ticket system + live chat messages & file attachments powered by Supabase Realtime.

### 2. Separate Admin Website (`admin-website`)
- **Role-Based Admin Portal**: Enforces `super_admin`, `admin`, `support_agent`, and `content_manager` roles + optional TOTP MFA.
- **Executive Overview (`/`)**: Live DB KPIs & 7-day SVG activity graphs.
- **User & Role Management (`/users`)**: Search, filter, suspend/reactivate, delete, and Super Admin RBAC assignments.
- **Messages & Support Inbox (`/messages`)**: Realtime ticket queue, internal staff notes (hidden from customers), agent assignment, and signed attachment inspection.
- **Verifications & Authorized Issuers (`/verifications`)**: Approve/revoke organizational issuers and review certificate verification requests.
- **AI Management (`/ai`)**: Enable/disable AI, select provider (`ollama`, `openai`, `gemini`, `groq`, `openrouter`, `custom`), customize system instructions, set daily rate limits, view token analytics, and check env secret readiness without exposing keys.
- **Templates (`/templates`), Website & Announcements (`/website`), Analytics (`/analytics`), Audit Logs (`/audit`), and MFA/Security (`/security`)**.

---

## Local Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Configure environment variables:**  
   Copy `.env.example` into `customer-website/.env.local` and `admin-website/.env.local` with your Supabase project credentials and optional AI provider key.
3. **Run unit tests, typecheck, lint & production builds:**
   ```bash
   npm test
   npm run typecheck
   npm run lint
   npm run build
   ```
4. **Run both applications locally:**
   ```bash
   npm run dev:customer   # http://localhost:3000
   npm run dev:admin      # http://localhost:3001
   ```

---

## Documentation Index

- [`documentation/ARCHITECTURE.md`](documentation/ARCHITECTURE.md)
- [`documentation/DATABASE_AND_SUPABASE.md`](documentation/DATABASE_AND_SUPABASE.md)
- [`documentation/DEPLOYMENT_VERCEL.md`](documentation/DEPLOYMENT_VERCEL.md)
- [`documentation/SECURITY_AND_COMPLIANCE.md`](documentation/SECURITY_AND_COMPLIANCE.md)

---

_Created & Developed by FRANCIS • Released under the [MIT License](LICENSE)._
