-- FRANCIS CREATOR STUDIO - 015 Version 2.0 Intelligent Creative Ecosystem
-- Additive upgrade preserving all existing fcs_* data, templates, certificates, and users.

-- 1. Expand allowed export formats to include DOCX and static HTML portfolio exports
ALTER TABLE public.fcs_export_events
  DROP CONSTRAINT IF EXISTS fcs_export_events_format_check;

ALTER TABLE public.fcs_export_events
  ADD CONSTRAINT fcs_export_events_format_check
  CHECK (format IN ('pdf', 'png', 'png_2k', 'png_4k', 'jpeg', 'bulk_zip', 'svg', 'docx', 'html'));

-- 2. Expand fcs-vault storage bucket MIME allowlist to support DOCX and TXT alongside PDF/PNG/JPG/JPEG
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
],
file_size_limit = 15728640
WHERE id = 'fcs-vault';

-- 3. AI Portfolio Projects
CREATE TABLE IF NOT EXISTS public.fcs_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  template_id text NOT NULL DEFAULT 'linear-atelier',
  theme_mode text NOT NULL DEFAULT 'dark' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  accent_color text NOT NULL DEFAULT '#0F766E',
  font_family text NOT NULL DEFAULT 'Plus Jakarta Sans',
  is_published boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_portfolios_user ON public.fcs_portfolios(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_portfolios_slug ON public.fcs_portfolios(slug);

ALTER TABLE public.fcs_portfolios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_portfolios_owner_all ON public.fcs_portfolios;
CREATE POLICY fcs_portfolios_owner_all ON public.fcs_portfolios
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_portfolios_public_read ON public.fcs_portfolios;
CREATE POLICY fcs_portfolios_public_read ON public.fcs_portfolios
  FOR SELECT USING (is_published = true OR public.fcs_is_staff(auth.uid()));

-- 4. AI Cover Letters
CREATE TABLE IF NOT EXISTS public.fcs_cover_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.fcs_resumes(id) ON DELETE SET NULL,
  title text NOT NULL,
  company_name text NOT NULL DEFAULT '',
  target_role text NOT NULL DEFAULT '',
  hiring_manager text,
  writing_style text NOT NULL DEFAULT 'modern_tech',
  job_description text,
  content text NOT NULL DEFAULT '',
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_cover_letters_user ON public.fcs_cover_letters(user_id, updated_at DESC);

ALTER TABLE public.fcs_cover_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_cover_letters_owner_all ON public.fcs_cover_letters;
CREATE POLICY fcs_cover_letters_owner_all ON public.fcs_cover_letters
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS fcs_cover_letters_staff_read ON public.fcs_cover_letters;
CREATE POLICY fcs_cover_letters_staff_read ON public.fcs_cover_letters
  FOR SELECT USING (public.fcs_is_staff(auth.uid()));

-- 5. Document Vault Folders & Asset Metadata Extensions
CREATE TABLE IF NOT EXISTS public.fcs_vault_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#0F766E',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_fcs_vault_folders_user ON public.fcs_vault_folders(user_id, name);

ALTER TABLE public.fcs_vault_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_vault_folders_owner_all ON public.fcs_vault_folders;
CREATE POLICY fcs_vault_folders_owner_all ON public.fcs_vault_folders
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.fcs_uploaded_assets
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.fcs_vault_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_fcs_uploaded_assets_folder ON public.fcs_uploaded_assets(user_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_fcs_uploaded_assets_tags ON public.fcs_uploaded_assets USING GIN (tags);

-- 6. Document & Resume Version History
CREATE TABLE IF NOT EXISTS public.fcs_document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES public.fcs_uploaded_assets(id) ON DELETE CASCADE,
  resume_id uuid REFERENCES public.fcs_resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  label text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  file_size bigint DEFAULT 0,
  snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (asset_id IS NOT NULL OR resume_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_fcs_doc_versions_asset ON public.fcs_document_versions(asset_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_doc_versions_resume ON public.fcs_document_versions(resume_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_doc_versions_user ON public.fcs_document_versions(user_id, created_at DESC);

ALTER TABLE public.fcs_document_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_document_versions_owner_all ON public.fcs_document_versions;
CREATE POLICY fcs_document_versions_owner_all ON public.fcs_document_versions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. User Notification Preferences
CREATE TABLE IF NOT EXISTS public.fcs_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  project_saved boolean NOT NULL DEFAULT true,
  document_exported boolean NOT NULL DEFAULT true,
  certificate_generated boolean NOT NULL DEFAULT true,
  ai_task_completed boolean NOT NULL DEFAULT true,
  support_ticket_updated boolean NOT NULL DEFAULT true,
  organization_approved boolean NOT NULL DEFAULT true,
  in_app_enabled boolean NOT NULL DEFAULT true,
  email_digest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fcs_notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_notification_preferences_owner_all ON public.fcs_notification_preferences;
CREATE POLICY fcs_notification_preferences_owner_all ON public.fcs_notification_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8. Server-only Per-User AI Provider Configuration (keys never exposed to client)
CREATE TABLE IF NOT EXISTS public.fcs_user_ai_configs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  provider text NOT NULL DEFAULT 'ollama' CHECK (provider IN ('ollama', 'gemini', 'groq', 'openai', 'openrouter', 'custom')),
  model text NOT NULL DEFAULT 'llama3.2',
  base_url text,
  encrypted_api_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fcs_user_ai_configs ENABLE ROW LEVEL SECURITY;
-- Intentionally NO client SELECT/WRITE policies: managed exclusively server-side via service role after auth verification.

-- 9. Verified Community Testimonials (Admin-moderated, real user submissions)
CREATE TABLE IF NOT EXISTS public.fcs_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  author_role text NOT NULL,
  organization text,
  quote text NOT NULL,
  rating integer NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_testimonials_approved ON public.fcs_testimonials(is_approved, created_at DESC);

ALTER TABLE public.fcs_testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_testimonials_public_read ON public.fcs_testimonials;
CREATE POLICY fcs_testimonials_public_read ON public.fcs_testimonials
  FOR SELECT USING (is_approved = true OR auth.uid() = user_id OR public.fcs_is_staff(auth.uid()));

DROP POLICY IF EXISTS fcs_testimonials_user_insert ON public.fcs_testimonials;
CREATE POLICY fcs_testimonials_user_insert ON public.fcs_testimonials
  FOR INSERT WITH CHECK (auth.uid() = user_id AND is_approved = false);

DROP POLICY IF EXISTS fcs_testimonials_staff_manage ON public.fcs_testimonials;
CREATE POLICY fcs_testimonials_staff_manage ON public.fcs_testimonials
  FOR ALL USING (public.fcs_is_staff(auth.uid())) WITH CHECK (public.fcs_is_staff(auth.uid()));

-- Attach updated_at triggers
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'fcs_portfolios',
    'fcs_cover_letters',
    'fcs_vault_folders',
    'fcs_notification_preferences',
    'fcs_user_ai_configs'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I', tbl, tbl);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fcs_set_updated_at()', tbl, tbl);
  END LOOP;
END;
$$;

-- Update public brand & v2 homepage copy in platform settings while preserving overrides
INSERT INTO public.fcs_platform_settings (key, value, is_public)
VALUES (
  'branding',
  '{
    "platformName": "FRANCIS CREATOR STUDIO",
    "tagline": "Create. Design. Innovate.",
    "developerCredit": "Created & Developed by FRANCIS.",
    "accentHex": "#0F766E",
    "githubUrl": "https://github.com/yadlapallif-hub/ai-studio",
    "supportEmail": "support@franciscreatorstudio.org",
    "license": "MIT"
  }'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  value = jsonb_set(
    jsonb_set(
      public.fcs_platform_settings.value,
      '{tagline}',
      '"Create. Design. Innovate."'::jsonb
    ),
    '{developerCredit}',
    '"Created & Developed by FRANCIS."'::jsonb
  );

INSERT INTO public.fcs_platform_settings (key, value, is_public)
VALUES (
  'website_content',
  '{
    "heroBadge": "Version 2.0 • 100% Free & Open-Source • MIT Licensed",
    "heroHeadline": "Your Ideas. Your Creativity. One Intelligent Studio.",
    "heroSubheadline": "Create professional resumes, design certificates, manage documents and unlock AI-powered creativity — all in one workspace.",
    "primaryCta": "Start Creating",
    "secondaryCta": "Explore Studio",
    "openSourceNote": "Francis Creator Studio is free, open-source software with zero subscriptions, zero paid downloads, and zero hidden locks. Self-host with your own Supabase instance and AI provider."
  }'::jsonb,
  true
)
ON CONFLICT (key) DO UPDATE SET
  value = public.fcs_platform_settings.value || '{
    "heroBadge": "Version 2.0 • 100% Free & Open-Source • MIT Licensed",
    "heroHeadline": "Your Ideas. Your Creativity. One Intelligent Studio.",
    "heroSubheadline": "Create professional resumes, design certificates, manage documents and unlock AI-powered creativity — all in one workspace.",
    "primaryCta": "Start Creating",
    "secondaryCta": "Explore Studio"
  }'::jsonb;
