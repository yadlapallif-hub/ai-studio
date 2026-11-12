-- FRANCIS CREATOR STUDIO - 012 Advanced Certificate Platform Upgrade
-- Adds design projects, revisions, stamp library, signature library, template categories/favorites,
-- bulk certificate batches, certificate reporting, custom dimensions, and sample vs official isolation.

-- 1. Enrich fcs_authorized_issuers with organization details
ALTER TABLE public.fcs_authorized_issuers
  ADD COLUMN IF NOT EXISTS registration_number text,
  ADD COLUMN IF NOT EXISTS organization_category text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_verified_badge boolean NOT NULL DEFAULT false;

UPDATE public.fcs_authorized_issuers
SET is_verified_badge = true
WHERE verification_status = 'approved' AND is_verified_badge = false;

-- 2. Enrich fcs_certificates with custom canvas dimensions, sample flag, bulk batch, and reports
ALTER TABLE public.fcs_certificates
  ADD COLUMN IF NOT EXISTS canvas_width integer NOT NULL DEFAULT 1123,
  ADD COLUMN IF NOT EXISTS canvas_height integer NOT NULL DEFAULT 794,
  ADD COLUMN IF NOT EXISTS is_sample boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS bulk_batch_id uuid,
  ADD COLUMN IF NOT EXISTS is_reported boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS report_reason text;

CREATE INDEX IF NOT EXISTS idx_fcs_certificates_user_updated ON public.fcs_certificates (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_fcs_certificates_issuer ON public.fcs_certificates (issuer_id);
CREATE INDEX IF NOT EXISTS idx_fcs_certificates_reported ON public.fcs_certificates (is_reported) WHERE is_reported = true;

-- 3. Allow all authenticated users to create/save their own sample/personal draft certificates,
--    while strictly enforcing Admin-approved Authorized Organization checks for official credentials.
DROP POLICY IF EXISTS fcs_certificates_own_insert ON public.fcs_certificates;
DROP POLICY IF EXISTS fcs_certificates_own_update ON public.fcs_certificates;

CREATE POLICY fcs_certificates_own_insert ON public.fcs_certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        issuer_id IS NULL
        AND authorization_type IN ('self_issued_draft', 'sample_preview')
      )
      OR (
        authorization_type = 'authorized_issuer'
        AND public.fcs_can_create_certificates()
      )
    )
  );

CREATE POLICY fcs_certificates_own_update ON public.fcs_certificates
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        issuer_id IS NULL
        AND authorization_type IN ('self_issued_draft', 'sample_preview')
      )
      OR (
        authorization_type = 'authorized_issuer'
        AND public.fcs_can_create_certificates()
      )
    )
  );

-- Reinforce trigger guard so unapproved users can never forge official issuance or bypass is_sample
CREATE OR REPLACE FUNCTION public.fcs_guard_certificate_issuer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
  v_has_access boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin THEN
    IF NEW.issuer_id IS NULL THEN
      NEW.is_sample := true;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.issuer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.fcs_authorized_issuers ai
      WHERE ai.id = NEW.issuer_id
        AND ai.verification_status = 'approved'
        AND (
          ai.user_id = auth.uid()
          OR (
            lower(ai.contact_email) = lower(coalesce(auth.jwt()->>'email', ''))
          )
        )
    ) INTO v_has_access;
  END IF;

  IF NOT v_has_access THEN
    NEW.issuer_id := NULL;
    NEW.is_sample := true;
    IF NEW.authorization_type = 'authorized_issuer' THEN
      NEW.authorization_type := 'sample_preview';
    END IF;
  ELSE
    NEW.is_sample := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Expand fcs_certificate_templates & create fcs_template_categories + fcs_template_favorites
ALTER TABLE public.fcs_certificate_templates
  DROP CONSTRAINT IF EXISTS fcs_certificate_templates_category_check;

ALTER TABLE public.fcs_certificate_templates
  ADD CONSTRAINT fcs_certificate_templates_category_check
  CHECK (category IN (
    'academic', 'course_completion', 'internship', 'achievement',
    'participation', 'excellence', 'appreciation', 'corporate',
    'training', 'sports', 'competition', 'volunteer',
    'professional', 'educational'
  ));

ALTER TABLE public.fcs_certificate_templates
  ADD COLUMN IF NOT EXISTS popularity_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS fcs_cert_templates_select ON public.fcs_certificate_templates;
CREATE POLICY fcs_cert_templates_select ON public.fcs_certificate_templates
  FOR SELECT USING (
    (is_active = true AND is_custom = false)
    OR created_by = auth.uid()
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_cert_templates_user_custom_insert ON public.fcs_certificate_templates;
CREATE POLICY fcs_cert_templates_user_custom_insert ON public.fcs_certificate_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (is_custom = true AND created_by = auth.uid())
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

CREATE TABLE IF NOT EXISTS public.fcs_template_categories (
  slug text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.fcs_template_categories (slug, label, description, sort_order) VALUES
  ('course_completion', 'Course Completion', 'Bootcamps, cohorts, online academies, and workshops', 1),
  ('academic', 'Academic', 'Universities, honor rolls, and scholarly distinctions', 2),
  ('internship', 'Internship', 'Engineering, research, business, and externship tenures', 3),
  ('achievement', 'Achievement', 'High-impact milestones, winners, and honors', 4),
  ('participation', 'Participation', 'Summits, hackathons, seminars, and conferences', 5),
  ('excellence', 'Excellence', 'Distinction awards, fellowships, and presidential citations', 6),
  ('appreciation', 'Appreciation', 'Mentors, speakers, judges, and community contributors', 7),
  ('corporate', 'Corporate', 'Quarterly awards, onboarding, leadership, and service tenure', 8),
  ('training', 'Training', 'Technical certifications, compliance, and workplace safety', 9),
  ('sports', 'Sports', 'Tournaments, athletics, championship podiums, and clubs', 10),
  ('competition', 'Competition', 'Coding contests, olympiads, robotics, and design challenges', 11),
  ('volunteer', 'Volunteer', 'Civic programs, nonprofit hours, and humanitarian impact', 12),
  ('professional', 'Professional Development', 'Chartered credentials, CEUs, and executive memberships', 13),
  ('educational', 'Educational', 'Diplomas, student clubs, STEM labs, and K-12 honors', 14)
ON CONFLICT (slug) DO UPDATE
  SET label = EXCLUDED.label,
      description = EXCLUDED.description,
      sort_order = EXCLUDED.sort_order;

ALTER TABLE public.fcs_template_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_template_categories_read ON public.fcs_template_categories;
CREATE POLICY fcs_template_categories_read ON public.fcs_template_categories
  FOR SELECT USING (is_active = true OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));
DROP POLICY IF EXISTS fcs_template_categories_manage ON public.fcs_template_categories;
CREATE POLICY fcs_template_categories_manage ON public.fcs_template_categories
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager']));

-- Seed the 24 new expanded certificate templates across academic, corporate, sports, competition, volunteer, professional
INSERT INTO public.fcs_certificate_templates (slug, name, description, category, orientation, sort_order, popularity_score, layout_config) VALUES
  ('academic-senate-honors', 'Academic Senate Dean Citation', 'University senate academic honor certificate with classical double-gold rule.', 'academic', 'portrait', 101, 140, '{"borderStyle":"academic-crest","background":"#FFFDF7","primaryColor":"#1E293B","accentColor":"#B45309","fontDisplay":"Cormorant Garamond","fontBody":"Source Serif 4","titleDefault":"Academic Honor Citation"}'::jsonb),
  ('academic-thesis-distinction', 'Thesis & Dissertation Excellence', 'Formal academic monograph frame for graduate research defense awards.', 'academic', 'landscape', 102, 132, '{"borderStyle":"double-gold","background":"#FCFBF7","primaryColor":"#0F4C5C","accentColor":"#C59B27","fontDisplay":"Cinzel","fontBody":"Source Serif 4","titleDefault":"Certificate of Research Excellence"}'::jsonb),
  ('academic-scholarship-award', 'Merit Scholarship Charter', 'Prestigious ivory & navy academic scholarship award document.', 'academic', 'portrait', 103, 128, '{"borderStyle":"prestige-navy","background":"#FFFEFA","primaryColor":"#1E3A8A","accentColor":"#D97706","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Merit Scholarship Award"}'::jsonb),
  ('academic-faculty-symposium', 'Faculty Colloquium Scholar', 'Clean scholarly frame recognizing research colloquium presenters.', 'academic', 'landscape', 104, 118, '{"borderStyle":"architectural","background":"#FFFFFF","primaryColor":"#1E293B","accentColor":"#0F766E","fontDisplay":"Playfair Display","fontBody":"Inter","titleDefault":"Academic Certificate"}'::jsonb),
  ('corporate-leadership-fellow', 'Corporate Leadership Summit', 'Executive charcoal & antique brass layout for corporate leadership cohorts.', 'corporate', 'landscape', 105, 145, '{"borderStyle":"architectural","background":"#FFFFFF","primaryColor":"#0F172A","accentColor":"#B45309","fontDisplay":"Playfair Display","fontBody":"Plus Jakarta Sans","titleDefault":"Certificate of Corporate Leadership"}'::jsonb),
  ('corporate-service-milestone', '5-Year Service Tenure Plaque', 'Distinguished corporate anniversary & employee appreciation credential.', 'corporate', 'landscape', 106, 134, '{"borderStyle":"prestige-navy","background":"#FAF8F3","primaryColor":"#1E3A8A","accentColor":"#C59B27","fontDisplay":"Cinzel","fontBody":"Inter","titleDefault":"Certificate of Dedicated Service"}'::jsonb),
  ('corporate-innovation-star', 'Enterprise Innovation Award', 'Sleek modern corporate border for quarterly engineering & product winners.', 'corporate', 'landscape', 107, 139, '{"borderStyle":"modern-frame","background":"#F8FAFC","primaryColor":"#0F766E","accentColor":"#0369A1","fontDisplay":"Space Grotesk","fontBody":"Inter","titleDefault":"Corporate Innovation Award"}'::jsonb),
  ('corporate-board-commendation', 'Executive Board Commendation', 'Midnight obsidian & gold presentation certificate for top enterprise awards.', 'corporate', 'landscape', 108, 148, '{"borderStyle":"double-gold","background":"#0F172A","primaryColor":"#F8FAFC","accentColor":"#F59E0B","fontDisplay":"Cinzel","fontBody":"Plus Jakarta Sans","titleDefault":"Executive Commendation"}'::jsonb),
  ('sports-championship-gold', 'Championship Gold Podium', 'Bold athletic tournament winner certificate with high-contrast crest zone.', 'sports', 'landscape', 109, 136, '{"borderStyle":"filigree","background":"#FFFDF7","primaryColor":"#111827","accentColor":"#D97706","fontDisplay":"Cinzel","fontBody":"Plus Jakarta Sans","titleDefault":"Championship Sports Certificate"}'::jsonb),
  ('sports-marathon-finisher', 'Marathon & Endurance Finisher', 'Dynamic clean modern finisher certificate highlighting distance & time.', 'sports', 'landscape', 110, 129, '{"borderStyle":"modern-frame","background":"#F8FAFC","primaryColor":"#0369A1","accentColor":"#0F766E","fontDisplay":"Space Grotesk","fontBody":"Inter","titleDefault":"Official Finisher Certificate"}'::jsonb),
  ('sports-varsity-mvp', 'Varsity Athletics MVP', 'Collegiate navy & gold sports excellence frame for team MVPs.', 'sports', 'portrait', 111, 124, '{"borderStyle":"board-crest","background":"#FFFEFA","primaryColor":"#1E3A8A","accentColor":"#B45309","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Athletics Excellence Award"}'::jsonb),
  ('sports-club-tournament', 'Inter-Club Tournament Record', 'Clean crisp grid certificate for regional tournaments & leagues.', 'sports', 'landscape', 112, 119, '{"borderStyle":"clean-grid","background":"#FFFFFF","primaryColor":"#0F766E","accentColor":"#1E293B","fontDisplay":"IBM Plex Sans","fontBody":"IBM Plex Sans","titleDefault":"Sports Tournament Certificate"}'::jsonb),
  ('competition-coding-olympiad', 'Algorithmic Coding Olympiad', 'Precision technical competition certificate for coding & CTF laureates.', 'competition', 'landscape', 113, 146, '{"borderStyle":"clean-grid","background":"#0F172A","primaryColor":"#F8FAFC","accentColor":"#14B8A6","fontDisplay":"Space Grotesk","fontBody":"IBM Plex Sans","titleDefault":"Certificate of Competition Rank"}'::jsonb),
  ('competition-science-fair', 'National Science Fair Finalist', 'Classic scholarly award recognizing STEM fair finalists and medalists.', 'competition', 'landscape', 114, 131, '{"borderStyle":"double-gold","background":"#FFFDF7","primaryColor":"#0F4C5C","accentColor":"#C59B27","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Competition Finalist Award"}'::jsonb),
  ('competition-debate-rhetoric', 'Parliamentary Debate Champion', 'Editorial serif competition trophy certificate for debate & model UN.', 'competition', 'portrait', 115, 122, '{"borderStyle":"editorial-warm","background":"#FFFBF5","primaryColor":"#7C2D12","accentColor":"#C2410C","fontDisplay":"Playfair Display","fontBody":"DM Sans","titleDefault":"Certificate of Championship"}'::jsonb),
  ('competition-design-award', 'Global Product Design Finalist', 'Minimal architectural competition award for design & architecture jurists.', 'competition', 'landscape', 116, 138, '{"borderStyle":"architectural","background":"#FFFFFF","primaryColor":"#111827","accentColor":"#0F766E","fontDisplay":"Playfair Display","fontBody":"Inter","titleDefault":"Design Competition Award"}'::jsonb),
  ('volunteer-civic-service', 'Civic Volunteer Service Medal', 'Warm community service certificate recognizing verified volunteer hours.', 'volunteer', 'landscape', 117, 135, '{"borderStyle":"editorial-warm","background":"#FFFDF8","primaryColor":"#0F766E","accentColor":"#D97706","fontDisplay":"Playfair Display","fontBody":"Plus Jakarta Sans","titleDefault":"Certificate of Volunteer Service"}'::jsonb),
  ('volunteer-eco-steward', 'Environmental Stewardship Honor', 'Emerald & ivory volunteer credential for sustainability initiatives.', 'volunteer', 'landscape', 118, 127, '{"borderStyle":"academic-crest","background":"#F7FBF9","primaryColor":"#065F46","accentColor":"#B45309","fontDisplay":"Cormorant Garamond","fontBody":"Inter","titleDefault":"Volunteer Appreciation Certificate"}'::jsonb),
  ('volunteer-humanitarian-relief', 'Community Impact & Relief', 'Clean formal volunteer certificate for NGOs and campus outreach.', 'volunteer', 'portrait', 119, 121, '{"borderStyle":"modern-frame","background":"#FFFFFF","primaryColor":"#0369A1","accentColor":"#0F766E","fontDisplay":"Cormorant Garamond","fontBody":"Plus Jakarta Sans","titleDefault":"Certificate of Humanitarian Service"}'::jsonb),
  ('volunteer-open-edu-tutor', 'Open Education Peer Tutor', 'Crisp ivory recognition card for community educators and STEM tutors.', 'volunteer', 'landscape', 120, 125, '{"borderStyle":"double-gold","background":"#FFFDF7","primaryColor":"#1E293B","accentColor":"#C59B27","fontDisplay":"Playfair Display","fontBody":"Inter","titleDefault":"Peer Educator Certificate"}'::jsonb),
  ('professional-executive-ceu', 'Executive Continuing Credit', 'Board-grade continuing education unit certificate with dual signature zone.', 'professional', 'landscape', 121, 141, '{"borderStyle":"board-crest","background":"#FAF8F3","primaryColor":"#111827","accentColor":"#B45309","fontDisplay":"Cinzel","fontBody":"Inter","titleDefault":"Professional Development Certificate"}'::jsonb),
  ('professional-agile-coach', 'Agile & Delivery Practitioner', 'Clean enterprise layout for agile leadership & scrum workshops.', 'professional', 'landscape', 122, 133, '{"borderStyle":"clean-grid","background":"#FFFFFF","primaryColor":"#0F4C5C","accentColor":"#0F766E","fontDisplay":"Space Grotesk","fontBody":"IBM Plex Sans","titleDefault":"Professional Training Credential"}'::jsonb),
  ('professional-ai-practitioner', 'Certified AI Systems Builder', 'Modern deep-slate certification template for applied AI engineering tracks.', 'professional', 'landscape', 123, 150, '{"borderStyle":"modern-frame","background":"#0F172A","primaryColor":"#F8FAFC","accentColor":"#F59E0B","fontDisplay":"Space Grotesk","fontBody":"Plus Jakarta Sans","titleDefault":"Professional AI Certification"}'::jsonb),
  ('professional-ethics-board', 'Governance & Compliance Charter', 'Formal portrait board credential for professional regulatory compliance.', 'professional', 'portrait', 124, 126, '{"borderStyle":"prestige-navy","background":"#FFFEFA","primaryColor":"#1E3A8A","accentColor":"#B45309","fontDisplay":"Cormorant Garamond","fontBody":"Inter","titleDefault":"Professional Development Charter"}'::jsonb)
ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      category = EXCLUDED.category,
      orientation = EXCLUDED.orientation,
      sort_order = EXCLUDED.sort_order,
      popularity_score = EXCLUDED.popularity_score,
      layout_config = EXCLUDED.layout_config;

CREATE TABLE IF NOT EXISTS public.fcs_template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('certificate', 'resume')),
  template_slug text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  use_count integer NOT NULL DEFAULT 1,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_type, template_slug)
);

CREATE INDEX IF NOT EXISTS idx_fcs_tpl_fav_user ON public.fcs_template_favorites (user_id, last_used_at DESC);
ALTER TABLE public.fcs_template_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_tpl_fav_own ON public.fcs_template_favorites;
CREATE POLICY fcs_tpl_fav_own ON public.fcs_template_favorites
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Design Projects (save unfinished designs & resume later)
CREATE TABLE IF NOT EXISTS public.fcs_design_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certificate_id uuid REFERENCES public.fcs_certificates(id) ON DELETE SET NULL,
  title text NOT NULL,
  template_slug text NOT NULL DEFAULT 'course-completion',
  orientation text NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
  canvas_width integer NOT NULL DEFAULT 1123,
  canvas_height integer NOT NULL DEFAULT 794,
  fields_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  canvas_elements jsonb NOT NULL DEFAULT '[]'::jsonb,
  style_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'ready', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_design_projects_user ON public.fcs_design_projects (user_id, updated_at DESC);
ALTER TABLE public.fcs_design_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_design_projects_own ON public.fcs_design_projects;
CREATE POLICY fcs_design_projects_own ON public.fcs_design_projects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS fcs_design_projects_admin_read ON public.fcs_design_projects;
CREATE POLICY fcs_design_projects_admin_read ON public.fcs_design_projects
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

DROP TRIGGER IF EXISTS trg_fcs_design_projects_updated_at ON public.fcs_design_projects;
CREATE TRIGGER trg_fcs_design_projects_updated_at
  BEFORE UPDATE ON public.fcs_design_projects
  FOR EACH ROW EXECUTE FUNCTION public.fcs_set_updated_at();

-- 6. Certificate Revisions (version snapshots)
CREATE TABLE IF NOT EXISTS public.fcs_certificate_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL REFERENCES public.fcs_certificates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_cert_revisions_cert ON public.fcs_certificate_revisions (certificate_id, version_number DESC);
ALTER TABLE public.fcs_certificate_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_cert_revisions_own ON public.fcs_certificate_revisions;
CREATE POLICY fcs_cert_revisions_own ON public.fcs_certificate_revisions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS fcs_cert_revisions_admin ON public.fcs_certificate_revisions;
CREATE POLICY fcs_cert_revisions_admin ON public.fcs_certificate_revisions
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- 7. Personal & Sample Stamp Library (distinct from fcs_organization_stamps Official Seals)
CREATE TABLE IF NOT EXISTS public.fcs_stamp_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer_id uuid REFERENCES public.fcs_authorized_issuers(id) ON DELETE SET NULL,
  name text NOT NULL,
  stamp_category text NOT NULL DEFAULT 'sample'
    CHECK (stamp_category IN ('company', 'organization', 'academic_sample', 'digital_seal', 'custom', 'sample')),
  is_official_verified boolean NOT NULL DEFAULT false,
  shape text NOT NULL DEFAULT 'circle' CHECK (shape IN ('circle', 'rectangle', 'square', 'scalloped')),
  ink_color text NOT NULL DEFAULT '#1D4ED8',
  opacity numeric(3,2) NOT NULL DEFAULT 0.95,
  rotation integer NOT NULL DEFAULT 0,
  curvature numeric(4,2) NOT NULL DEFAULT 1.00,
  scale numeric(4,2) NOT NULL DEFAULT 1.00,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  svg_markup text,
  storage_bucket text,
  storage_path text,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_stamp_library_user ON public.fcs_stamp_library (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fcs_guard_stamp_library()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
  v_has_approved_issuer boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.issuer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.fcs_authorized_issuers ai
      WHERE ai.id = NEW.issuer_id
        AND ai.verification_status = 'approved'
        AND (ai.user_id = auth.uid() OR lower(ai.contact_email) = lower(coalesce(auth.jwt()->>'email', '')))
    ) INTO v_has_approved_issuer;
  END IF;
  IF NOT v_has_approved_issuer THEN
    NEW.is_official_verified := false;
    NEW.issuer_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_stamp_library ON public.fcs_stamp_library;
CREATE TRIGGER trg_fcs_guard_stamp_library
  BEFORE INSERT OR UPDATE ON public.fcs_stamp_library
  FOR EACH ROW EXECUTE FUNCTION public.fcs_guard_stamp_library();

ALTER TABLE public.fcs_stamp_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_stamp_library_own ON public.fcs_stamp_library;
CREATE POLICY fcs_stamp_library_own ON public.fcs_stamp_library
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS fcs_stamp_library_admin ON public.fcs_stamp_library;
CREATE POLICY fcs_stamp_library_admin ON public.fcs_stamp_library
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- 8. Digital Signature Library
CREATE TABLE IF NOT EXISTS public.fcs_signature_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer_id uuid REFERENCES public.fcs_authorized_issuers(id) ON DELETE SET NULL,
  signatory_name text NOT NULL,
  signatory_designation text NOT NULL DEFAULT 'Authorized Signatory',
  style_preset text NOT NULL DEFAULT 'hand_drawn',
  is_authorized_signatory boolean NOT NULL DEFAULT false,
  storage_bucket text,
  storage_path text,
  data_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_signature_library_user ON public.fcs_signature_library (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fcs_guard_signature_library()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_admin boolean := public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']);
  v_has_approved_issuer boolean := false;
BEGIN
  IF current_setting('role', true) = 'service_role' OR v_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.issuer_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.fcs_authorized_issuers ai
      WHERE ai.id = NEW.issuer_id
        AND ai.verification_status = 'approved'
        AND (ai.user_id = auth.uid() OR lower(ai.contact_email) = lower(coalesce(auth.jwt()->>'email', '')))
    ) INTO v_has_approved_issuer;
  END IF;
  IF NOT v_has_approved_issuer THEN
    NEW.is_authorized_signatory := false;
    NEW.issuer_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fcs_guard_signature_library ON public.fcs_signature_library;
CREATE TRIGGER trg_fcs_guard_signature_library
  BEFORE INSERT OR UPDATE ON public.fcs_signature_library
  FOR EACH ROW EXECUTE FUNCTION public.fcs_guard_signature_library();

ALTER TABLE public.fcs_signature_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_signature_library_own ON public.fcs_signature_library;
CREATE POLICY fcs_signature_library_own ON public.fcs_signature_library
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS fcs_signature_library_admin ON public.fcs_signature_library;
CREATE POLICY fcs_signature_library_admin ON public.fcs_signature_library
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- 9. Bulk Generation Batches
CREATE TABLE IF NOT EXISTS public.fcs_bulk_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issuer_id uuid REFERENCES public.fcs_authorized_issuers(id) ON DELETE SET NULL,
  batch_name text NOT NULL,
  source_filename text,
  template_slug text NOT NULL DEFAULT 'course-completion',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  generated_count integer NOT NULL DEFAULT 0,
  is_official_batch boolean NOT NULL DEFAULT false,
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_bulk_batches_user ON public.fcs_bulk_batches (user_id, created_at DESC);
ALTER TABLE public.fcs_bulk_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_bulk_batches_own ON public.fcs_bulk_batches;
CREATE POLICY fcs_bulk_batches_own ON public.fcs_bulk_batches
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS fcs_bulk_batches_admin ON public.fcs_bulk_batches;
CREATE POLICY fcs_bulk_batches_admin ON public.fcs_bulk_batches
  FOR SELECT USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- 10. Reported Certificates queue (for Admin Certificate Management)
CREATE TABLE IF NOT EXISTS public.fcs_certificate_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_code text NOT NULL,
  certificate_id uuid REFERENCES public.fcs_certificates(id) ON DELETE SET NULL,
  reporter_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_email text,
  reason text NOT NULL,
  details text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_cert_reports_status ON public.fcs_certificate_reports (status, created_at DESC);
ALTER TABLE public.fcs_certificate_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fcs_cert_reports_insert ON public.fcs_certificate_reports;
CREATE POLICY fcs_cert_reports_insert ON public.fcs_certificate_reports
  FOR INSERT WITH CHECK (reporter_user_id IS NULL OR reporter_user_id = auth.uid());
DROP POLICY IF EXISTS fcs_cert_reports_admin ON public.fcs_certificate_reports;
CREATE POLICY fcs_cert_reports_admin ON public.fcs_certificate_reports
  FOR ALL USING (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']))
  WITH CHECK (public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin']));

-- 11. Enhanced public verification lookup RPC (explicitly flags sample/unverified vs officially valid)
CREATE OR REPLACE FUNCTION public.fcs_lookup_certificate_verification(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.fcs_certificate_verifications%ROWTYPE;
  v_cert public.fcs_certificates%ROWTYPE;
  v_issuer public.fcs_authorized_issuers%ROWTYPE;
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_effective_status text;
  v_is_official boolean := false;
BEGIN
  IF length(v_clean_code) < 4 THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_row
  FROM public.fcs_certificate_verifications
  WHERE upper(certificate_code) = v_clean_code
  LIMIT 1;

  IF NOT FOUND THEN
    -- Also check if code exists only as a user-generated sample/draft certificate so /verify clearly marks it Sample / Non-Verified
    SELECT * INTO v_cert
    FROM public.fcs_certificates
    WHERE upper(certificate_code) = v_clean_code
    LIMIT 1;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('found', false);
    END IF;

    RETURN jsonb_build_object(
      'found', true,
      'certificate_code', v_cert.certificate_code,
      'recipient_name', v_cert.recipient_name,
      'certificate_title', v_cert.title,
      'course_or_achievement', v_cert.course_or_achievement,
      'issuing_organization', v_cert.organization_name,
      'issue_date', v_cert.issue_date,
      'expiry_date', v_cert.expiry_date,
      'verification_status', 'unverified_draft',
      'is_official', false,
      'is_sample', true,
      'issuer_approved', false,
      'public_notes', 'This record is a user-created sample or draft design and has NOT been officially verified or issued by an Admin-approved Authorized Organization.'
    );
  END IF;

  SELECT * INTO v_cert FROM public.fcs_certificates WHERE id = v_row.certificate_id LIMIT 1;

  IF v_row.issuer_id IS NOT NULL THEN
    SELECT * INTO v_issuer FROM public.fcs_authorized_issuers WHERE id = v_row.issuer_id;
  END IF;

  v_effective_status := v_row.verification_status;
  IF v_row.verification_status = 'verified' THEN
    IF v_row.expiry_date IS NOT NULL AND v_row.expiry_date < CURRENT_DATE THEN
      v_effective_status := 'expired';
    ELSIF v_row.issuer_id IS NULL OR v_issuer.id IS NULL OR COALESCE(v_cert.is_sample, false) = true THEN
      v_effective_status := 'unverified_draft';
    ELSIF v_issuer.verification_status IN ('revoked', 'suspended') THEN
      v_effective_status := 'revoked';
    ELSIF v_issuer.verification_status <> 'approved' THEN
      v_effective_status := 'pending_approval';
    ELSE
      v_is_official := true;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'certificate_code', v_row.certificate_code,
    'recipient_name', v_row.recipient_name,
    'certificate_title', v_row.certificate_title,
    'course_or_achievement', v_row.course_or_achievement,
    'issuing_organization', v_row.issuing_organization,
    'issue_date', v_row.issue_date,
    'expiry_date', v_row.expiry_date,
    'verification_status', v_effective_status,
    'is_official', v_is_official,
    'is_sample', COALESCE(v_cert.is_sample, false) OR NOT v_is_official,
    'approved_at', v_row.approved_at,
    'revoked_at', v_row.revoked_at,
    'revocation_reason', v_row.revocation_reason,
    'public_notes', v_row.public_notes,
    'issuer_approved', COALESCE(v_issuer.verification_status = 'approved', false),
    'issuer_website', v_issuer.website,
    'issuer_registration_number', v_issuer.registration_number
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fcs_lookup_certificate_verification(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fcs_lookup_certificate_verification(text) TO anon, authenticated;
