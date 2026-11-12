-- Widen fcs_export_events document_type and fcs_uploaded_assets asset_type for Version 2.0 documents
ALTER TABLE public.fcs_export_events
  DROP CONSTRAINT IF EXISTS fcs_export_events_document_type_check;

ALTER TABLE public.fcs_export_events
  ADD CONSTRAINT fcs_export_events_document_type_check
  CHECK (document_type IN ('resume', 'certificate', 'cover_letter', 'portfolio'));

ALTER TABLE public.fcs_uploaded_assets
  DROP CONSTRAINT IF EXISTS fcs_uploaded_assets_asset_type_check;

ALTER TABLE public.fcs_uploaded_assets
  ADD CONSTRAINT fcs_uploaded_assets_asset_type_check
  CHECK (
    asset_type IN (
      'profile_photo',
      'organization_logo',
      'stamp',
      'seal',
      'signature',
      'exported_pdf',
      'exported_png',
      'exported_docx',
      'document',
      'resume_doc',
      'support_attachment',
      'other'
    )
  );
