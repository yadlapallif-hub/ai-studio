# Database, Auth, Storage & Edge Functions Guide

## Migrations (`backend/supabase/migrations/`)

1. **`001_fcs_core_schema.sql`**: Creates 22 `fcs_*` tables, foreign keys, search indexes, and `updated_at` triggers:
   - `fcs_profiles`, `fcs_user_roles`
   - `fcs_resume_templates`, `fcs_resumes`
   - `fcs_certificate_templates`, `fcs_authorized_issuers`, `fcs_certificates`, `fcs_certificate_verifications`
   - `fcs_uploaded_assets`, `fcs_export_logs`
   - `fcs_ai_conversations`, `fcs_ai_messages`, `fcs_ai_usage_logs`, `fcs_intelligence_recommendations`, `fcs_rate_limits`
   - `fcs_support_tickets`, `fcs_support_messages`, `fcs_support_attachments`
   - `fcs_notifications`, `fcs_announcements`, `fcs_faq_entries`, `fcs_platform_settings`, `fcs_activity_logs`

2. **`002_fcs_rls_and_storage.sql`**:
   - Enables RLS on all 22 tables.
   - Creates `SECURITY DEFINER` helpers (`fcs_has_role`, `fcs_is_staff`, `fcs_ensure_profile`, `fcs_consume_rate_limit`, `fcs_lookup_certificate_verification`).
   - Locks `fcs_certificate_verifications` against client-side `verified` spoofing via `fcs_guard_verification_insert` & `fcs_guard_verification_update`.
   - Creates 3 private storage buckets (`fcs-vault`, `fcs-exports`, `fcs-support`) restricted to `auth.uid()` folder paths and staff review.
   - Enables Supabase Realtime on `fcs_support_messages`, `fcs_support_tickets`, and `fcs_notifications`.

3. **`003_fcs_seed_defaults.sql`**:
   - Seeds 7 resume templates, 9 certificate templates, default `platform_settings` (`branding`, `website_content`, `footer_content`, `ai_config`, `security`), 6 FAQs, 1 active announcement, and initial `super_admin` assignment.

---

## Edge Functions (`backend/supabase/functions/`)

| Function | JWT Required | Purpose |
| --- | --- | --- |
| `fcs-ai-assistant` | Yes (`verify_jwt: true`) | Enforces suspension & rate limits, loads admin system instructions & FAQs, routes to configured AI provider (`ollama`, `openai`, `gemini`, `groq`, `openrouter`, `custom`) or returns `503 AI_PROVIDER_NOT_CONFIGURED`. |
| `fcs-verify-certificate` | No (`verify_jwt: false`) | Public GET/POST verification endpoint calling `fcs_lookup_certificate_verification(p_code)`. |
| `fcs-remove-bg` | No (`verify_jwt: false`) | Calls external background removal API when `REMOVE_BG_API_KEY` or `BG_REMOVAL_ENDPOINT` is configured; otherwise returns `{ mode: "client_onnx" }`. |
