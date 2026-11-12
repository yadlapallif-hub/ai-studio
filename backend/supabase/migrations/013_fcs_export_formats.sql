-- FRANCIS CREATOR STUDIO - 013 Expanded Export Formats (2K/4K PNG, JPEG, Bulk ZIP, SVG)

ALTER TABLE public.fcs_export_events
  DROP CONSTRAINT IF EXISTS fcs_export_events_format_check;

ALTER TABLE public.fcs_export_events
  ADD CONSTRAINT fcs_export_events_format_check
  CHECK (format IN ('pdf', 'png', 'png_2k', 'png_4k', 'jpeg', 'bulk_zip', 'svg'));

ALTER TABLE public.fcs_export_events
  ADD COLUMN IF NOT EXISTS resolution_label text,
  ADD COLUMN IF NOT EXISTS file_name text;

CREATE INDEX IF NOT EXISTS idx_fcs_export_events_user ON public.fcs_export_events (user_id, created_at DESC);
