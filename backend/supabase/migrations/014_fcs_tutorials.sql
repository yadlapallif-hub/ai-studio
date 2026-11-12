-- FRANCIS CREATOR STUDIO - 014 Official Video Learning Center & Tutorials CMS

CREATE TABLE IF NOT EXISTS public.fcs_tutorials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  episode_number integer NOT NULL,
  category text NOT NULL CHECK (category IN ('getting_started', 'studios', 'ai_career', 'verification_admin')),
  section_key text NOT NULL,
  section_route text NOT NULL,
  title_en text NOT NULL,
  title_te text NOT NULL,
  description_en text NOT NULL,
  description_te text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 70,
  video_url_en text,
  video_url_te text,
  thumbnail_url text,
  subtitle_vtt_en text,
  subtitle_vtt_te text,
  transcript_en text,
  transcript_te text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcs_tutorials_sort ON public.fcs_tutorials (sort_order ASC, episode_number ASC);
CREATE INDEX IF NOT EXISTS idx_fcs_tutorials_section ON public.fcs_tutorials (section_key);

DROP TRIGGER IF EXISTS trg_fcs_tutorials_updated ON public.fcs_tutorials;
CREATE TRIGGER trg_fcs_tutorials_updated
  BEFORE UPDATE ON public.fcs_tutorials
  FOR EACH ROW EXECUTE FUNCTION public.fcs_set_updated_at();

ALTER TABLE public.fcs_tutorials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fcs_tutorials_read ON public.fcs_tutorials;
CREATE POLICY fcs_tutorials_read ON public.fcs_tutorials
  FOR SELECT USING (
    is_published = true
    OR public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

DROP POLICY IF EXISTS fcs_tutorials_manage ON public.fcs_tutorials;
CREATE POLICY fcs_tutorials_manage ON public.fcs_tutorials
  FOR ALL USING (
    public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  )
  WITH CHECK (
    public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );

-- Public read / admin write storage bucket for tutorial videos, thumbnails, and WebVTT subtitles
INSERT INTO storage.buckets (id, name, public)
VALUES ('fcs-tutorials', 'fcs-tutorials', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS fcs_tutorials_bucket_read ON storage.objects;
CREATE POLICY fcs_tutorials_bucket_read ON storage.objects
  FOR SELECT USING (bucket_id = 'fcs-tutorials');

DROP POLICY IF EXISTS fcs_tutorials_bucket_manage ON storage.objects;
CREATE POLICY fcs_tutorials_bucket_manage ON storage.objects
  FOR ALL USING (
    bucket_id = 'fcs-tutorials'
    AND public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  )
  WITH CHECK (
    bucket_id = 'fcs-tutorials'
    AND public.fcs_has_any_role(auth.uid(), ARRAY['super_admin', 'admin', 'content_manager'])
  );
