# System Architecture — FRANCIS CREATOR STUDIO

## Overview

FRANCIS CREATOR STUDIO separates user-facing studio tools from privileged administrative operations while sharing one consistent PostgreSQL + Auth + Storage + Edge Functions backend on Supabase and one deterministic TypeScript core (`@francis/shared`).

```text
┌───────────────────────────┐        ┌───────────────────────────┐
│     customer-website      │        │       admin-website       │
│  Next.js 15 (Port 3000)   │        │  Next.js 15 (Port 3001)   │
│  Public + Customer Auth   │        │  Admin RBAC + Optional MFA│
└─────────────┬─────────────┘        └─────────────┬─────────────┘
              │                                    │
              └──────────────┬─────────────────────┘
                             ▼
               ┌───────────────────────────┐
               │       @francis/shared     │
               │  Types • Zod • Analyzers  │
               └─────────────┬─────────────┘
                             ▼
         ┌─────────────────────────────────────────┐
         │            Supabase Backend             │
         │  PostgreSQL (22 fcs_* tables + RLS)     │
         │  Supabase Auth (Email + TOTP MFA)       │
         │  Private Storage (fcs-vault/exports/…)  │
         │  Realtime (Tickets, Messages, Alerts)   │
         │  Edge Functions (AI, Verify, Remove-BG) │
         └─────────────────────────────────────────┘
```

## Design Choices

1. **Isolation via `fcs_` Namespace**: Every table, index, function, trigger, bucket, and Edge Function uses the `fcs_` / `fcs-` prefix so the platform cleanly coexists in a shared Supabase project without interfering with unrelated schemas or apps.
2. **Client-Safe Studio Tools + Server-Verified Persistence**: Visitors can preview the Resume Studio and Certificate Studio immediately without signing in (using browser `localStorage` for temporary previews). Creating persistent documents, accessing the Document Vault, sending Support tickets, or saving AI conversations requires verified Supabase Auth sessions.
3. **Deterministic + LLM Hybrid Intelligence**: Quality scoring, ATS keyword matching, layout contrast checks, and smart recommendations use fast deterministic heuristics in `packages/shared/src/intelligence/analyzer.ts` combined with optional real LLM completions via `fcs-ai-assistant`.
4. **Canvas-First Studio UI**:
   - `PhotoEditorModal` performs all zoom, crop, rotation, brightness, contrast, circular/square clipping, and optional local ONNX background removal directly inside HTML5 Canvas & browser workers (`@imgly/background-removal`) when external background-removal API keys are unset.
   - `CertificateCanvas` renders A4 Portrait/Landscape layers with live pointer dragging, z-order stacking, CSS/SVG ink filters, and dynamic `qrcode` SVG/PNG generation.
