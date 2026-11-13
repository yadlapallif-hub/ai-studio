-- FRANCIS CREATOR STUDIO - Remove Portfolio Builder & Cover Letter Studio
-- Cleanly drops unused fcs_portfolios and fcs_cover_letters tables and restores tightened export constraints.

DROP TRIGGER IF EXISTS trg_fcs_portfolios_updated_at ON public.fcs_portfolios;
DROP TRIGGER IF EXISTS trg_fcs_cover_letters_updated_at ON public.fcs_cover_letters;

DROP TABLE IF EXISTS public.fcs_portfolios CASCADE;
DROP TABLE IF EXISTS public.fcs_cover_letters CASCADE;

ALTER TABLE public.fcs_export_events
  DROP CONSTRAINT IF EXISTS fcs_export_events_document_type_check;

ALTER TABLE public.fcs_export_events
  ADD CONSTRAINT fcs_export_events_document_type_check
  CHECK (document_type IN ('resume', 'certificate'));

ALTER TABLE public.fcs_export_events
  DROP CONSTRAINT IF EXISTS fcs_export_events_format_check;

ALTER TABLE public.fcs_export_events
  ADD CONSTRAINT fcs_export_events_format_check
  CHECK (format IN ('pdf', 'png', 'png_2k', 'png_4k', 'jpeg', 'bulk_zip', 'svg', 'docx'));
